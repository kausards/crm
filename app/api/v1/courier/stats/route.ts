import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { successResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireAuth();
    const supabase = await createClient();

    // 1. Fetch tenant orders with courier and financial telemetry
    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select('id, status, courier_provider, cod_amount, total_amount, delivery_charge')
      .eq('tenant_id', auth.tenantId);

    if (ordersErr) throw ordersErr;

    // 2. Fetch tenant courier credentials to know which are active
    const { data: creds, error: credsErr } = await supabase
      .from('courier_credentials')
      .select('provider, is_active')
      .eq('tenant_id', auth.tenantId);

    if (credsErr) throw credsErr;

    // 3. Fetch latest shipment sync timestamp
    const { data: latestShipment } = await supabase
      .from('courier_shipments')
      .select('last_synced_at')
      .eq('tenant_id', auth.tenantId)
      .not('last_synced_at', 'is', null)
      .order('last_synced_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const orderList = orders || [];
    const dispatched = orderList.filter((o) =>
      ['shipped', 'delivered', 'returned'].includes(o.status)
    );
    const inTransit = orderList.filter((o) => o.status === 'shipped');
    const delivered = orderList.filter((o) => o.status === 'delivered');
    const returned = orderList.filter((o) => o.status === 'returned');

    const totalDispatched = dispatched.length;
    const codInTransit = inTransit.reduce(
      (sum, o) => sum + (Number(o.cod_amount ?? o.total_amount) || 0),
      0
    );
    const terminalCount = delivered.length + returned.length;
    const deliveryRate =
      terminalCount > 0
        ? Math.round((delivered.length / terminalCount) * 1000) / 10
        : totalDispatched > 0
        ? Math.round((delivered.length / totalDispatched) * 1000) / 10
        : 0;

    const rtoLoss = returned.reduce(
      (sum, o) => sum + (Number(o.delivery_charge) || 120),
      0
    );

    const getProviderStats = (provider: 'steadfast' | 'pathao' | 'redx') => {
      const pOrders = orderList.filter(
        (o) => (o.courier_provider || '').toLowerCase() === provider
      );
      const pDispatched = pOrders.filter((o) =>
        ['shipped', 'delivered', 'returned'].includes(o.status)
      ).length;
      const pCod = pOrders
        .filter((o) => o.status === 'shipped')
        .reduce((sum, o) => sum + (Number(o.cod_amount ?? o.total_amount) || 0), 0);
      const isActive = Boolean(
        creds?.find((c) => c.provider.toLowerCase() === provider && c.is_active)
      );

      return {
        dispatched: pDispatched,
        cod: pCod,
        is_active: isActive,
      };
    };

    return successResponse({
      total_dispatched: totalDispatched,
      cod_in_transit: codInTransit,
      in_transit_count: inTransit.length,
      delivery_rate: deliveryRate,
      delivered_count: delivered.length,
      returned_count: returned.length,
      rto_loss: rtoLoss,
      last_synced_at: latestShipment?.last_synced_at || null,
      providers: {
        steadfast: getProviderStats('steadfast'),
        pathao: getProviderStats('pathao'),
        redx: getProviderStats('redx'),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
