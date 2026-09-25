import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createProductSchema } from '@/lib/validators/product';
import { createClient } from '@/lib/supabase/server';
import { logStockMovement } from '@/lib/accounting/stockMovement';
import { successResponse, paginatedResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search') || '';
    const lowStockOnly = searchParams.get('low_stock') === 'true';

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('tenant_id', auth.tenantId)
      .eq('is_active', true);

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    if (lowStockOnly) {
      // In Postgres, stock_quantity <= low_stock_threshold
      // Using filter
      query = query.filter('stock_quantity', 'lte', 'low_stock_threshold');
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: products, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return errorResponse('INTERNAL_ERROR', error.message, 500);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return paginatedResponse(products || [], {
      total,
      page,
      limit,
      totalPages,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(true); // Owner only
    const body = await req.json();
    const validated = createProductSchema.parse(body);

    const supabase = await createClient();

    // 1. Insert product
    const { data: product, error: insertErr } = await supabase
      .from('products')
      .insert({
        tenant_id: auth.tenantId,
        name: validated.name,
        sku: validated.sku || null,
        buy_price: validated.buy_price,
        sell_price: validated.sell_price,
        stock_quantity: validated.stock_quantity,
        low_stock_threshold: validated.low_stock_threshold,
      })
      .select('*')
      .single();

    if (insertErr || !product) {
      return errorResponse('INTERNAL_ERROR', insertErr?.message || 'Failed to create product', 500);
    }

    // 2. If initial stock is greater than 0, record initial stock movement
    if (validated.stock_quantity > 0) {
      await supabase.from('stock_movements').insert({
        tenant_id: auth.tenantId,
        product_id: product.id,
        direction: 'in',
        quantity: validated.stock_quantity,
        reason: 'opening_balance',
      });
    }

    return successResponse(product, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
