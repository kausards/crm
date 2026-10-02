import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search')?.trim();

    let query = supabase
      .from('orders')
      .select('*, order_items(*, products(name, sku))')
      .eq('tenant_id', auth.tenantId)
      .order('created_at', { ascending: false })
      .limit(10000);

    if (status) {
      query = query.eq('status', status as any);
    }
    if (from) {
      query = query.gte('created_at', `${from}T00:00:00.000Z`);
    }
    if (to) {
      query = query.lte('created_at', `${to}T23:59:59.999Z`);
    }
    if (search) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search);
      if (isUuid) {
        query = query.or(`id.eq.${search},customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
      } else {
        query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
      }
    }

    const { data: orders, error } = await query;
    if (error) throw error;

    const headers = [
      'Order ID',
      'Customer Name',
      'Phone',
      'Address',
      'Status',
      'Products',
      'Total Amount',
      'COD Amount',
      'Delivery Charge',
      'Courier',
      'Flag Reason',
      'Date',
    ];

    const rows = (orders || []).map((o: any) => [
      `"${o.id}"`,
      `"${(o.customer_name || '').replace(/"/g, '""')}"`,
      `"${(o.customer_phone || '').replace(/"/g, '""')}"`,
      `"${(o.customer_address || '').replace(/"/g, '""')}"`,
      `"${o.status}"`,
      `"${(o.order_items || [])
        .map((i: any) => `${i.products?.name || 'Product'} ×${i.quantity}`)
        .join('; ')
        .replace(/"/g, '""')}"`,
      o.total_amount ?? 0,
      o.cod_amount ?? 0,
      o.delivery_charge ?? 0,
      `"${o.courier_provider || ''}"`,
      `"${(o.flag_reason || '').replace(/"/g, '""')}"`,
      `"${o.created_at}"`,
    ]);

    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const filename = `orders_manifest_${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
