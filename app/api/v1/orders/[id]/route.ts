import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { checkSteadfastCustomerRisk } from '@/lib/courier/steadfast';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const supabase = await createClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*)), courier_shipments(*)')
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (error || !order) {
      return errorResponse('NOT_FOUND', 'Order not found', 404);
    }

    return successResponse(order);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const supabase = await createClient();

    // 1. Fetch current order
    const { data: currentOrder, error: fetchErr } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (fetchErr || !currentOrder) {
      return errorResponse('NOT_FOUND', 'Order not found', 404);
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // 2. Handle simple fields
    if (body.customer_name !== undefined) updates.customer_name = String(body.customer_name).trim();
    if (body.customer_address !== undefined) updates.customer_address = String(body.customer_address).trim();
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.courier_provider !== undefined) updates.courier_provider = body.courier_provider;
    if (body.status !== undefined) updates.status = body.status;

    // Delivery charge
    const deliveryCharge = body.delivery_charge !== undefined
      ? Math.max(0, Number(body.delivery_charge))
      : Number(currentOrder.delivery_charge || 0);
    updates.delivery_charge = deliveryCharge;

    // 3. Handle Items update (add, delete, update quantity)
    if (Array.isArray(body.items)) {
      if (body.items.length === 0) {
        return errorResponse('BAD_REQUEST', 'An order must contain at least one item', 400);
      }

      // Fetch product catalog details for these items
      const productIds = body.items.map((i: any) => i.product_id);
      const { data: catalogProducts, error: prodErr } = await supabase
        .from('products')
        .select('id, name, sku, buy_price, sell_price')
        .eq('tenant_id', auth.tenantId)
        .in('id', productIds);

      if (prodErr || !catalogProducts || catalogProducts.length === 0) {
        return errorResponse('BAD_REQUEST', 'Invalid products specified in order', 400);
      }

      const prodMap = new Map(catalogProducts.map(p => [p.id, p]));
      let itemsTotal = 0;
      const newItemsToInsert: Array<{
        tenant_id: string;
        order_id: string;
        product_id: string;
        quantity: number;
        buy_price: number;
        sell_price: number;
      }> = [];

      for (const item of body.items) {
        const prod = prodMap.get(item.product_id);
        if (!prod) continue;
        const qty = Math.max(1, Number(item.quantity) || 1);
        const sellPrice = item.sell_price !== undefined ? Number(item.sell_price) : Number(prod.sell_price);
        itemsTotal += qty * sellPrice;

        newItemsToInsert.push({
          tenant_id: auth.tenantId,
          order_id: id,
          product_id: prod.id,
          quantity: qty,
          buy_price: Number(prod.buy_price) || 0,
          sell_price: sellPrice,
        });
      }

      if (newItemsToInsert.length === 0) {
        return errorResponse('BAD_REQUEST', 'None of the specified products were found in your inventory', 400);
      }

      // Replace existing order_items
      await supabase
        .from('order_items')
        .delete()
        .eq('order_id', id)
        .eq('tenant_id', auth.tenantId);

      const { error: insertItemsErr } = await supabase
        .from('order_items')
        .insert(newItemsToInsert);

      if (insertItemsErr) {
        return errorResponse('INTERNAL_ERROR', 'Failed to update order items', 500);
      }

      const totalAmount = itemsTotal + deliveryCharge;
      updates.total_amount = totalAmount;
      updates.cod_amount = totalAmount;
    } else if (body.delivery_charge !== undefined) {
      // Recalculate total if only delivery charge changed
      const currentItemsTotal = (currentOrder.order_items || []).reduce(
        (sum: number, it: any) => sum + (Number(it.sell_price) || 0) * (Number(it.quantity) || 0),
        0
      );
      const totalAmount = currentItemsTotal + deliveryCharge;
      updates.total_amount = totalAmount;
      updates.cod_amount = totalAmount;
    }

    // 4. Phone change & Fraud risk check
    const newPhone = body.customer_phone ? String(body.customer_phone).trim() : null;
    if (newPhone) {
      updates.customer_phone = newPhone;
    }

    const phoneToCheck = newPhone || currentOrder.customer_phone;
    if (body.check_fraud || (newPhone && newPhone !== currentOrder.customer_phone)) {
      try {
        const [tenantRes, courierCredsRes] = await Promise.all([
          supabase.from('tenants').select('min_delivery_ratio, max_cancel_ratio').eq('id', auth.tenantId).single(),
          supabase.from('courier_credentials').select('*').eq('tenant_id', auth.tenantId).eq('provider', 'steadfast').eq('is_active', true).maybeSingle(),
        ]);

        const minDelivery = Number(tenantRes.data?.min_delivery_ratio ?? 50);
        const maxCancel = Number(tenantRes.data?.max_cancel_ratio ?? 50);

        if (courierCredsRes.data) {
          const apiKey = decrypt(courierCredsRes.data.encrypted_api_key);
          const secretKey = courierCredsRes.data.encrypted_api_secret ? decrypt(courierCredsRes.data.encrypted_api_secret) : null;

          const risk = await checkSteadfastCustomerRisk(
            { apiKey, secretKey },
            phoneToCheck,
            { minDeliveryRatio: minDelivery, maxCancelRatio: maxCancel }
          );

          updates.is_flagged = risk.is_flagged;
          updates.flag_reason = risk.reason || null;
          updates.courier_delivery_ratio = risk.delivery_rate_percent;
          updates.courier_cancel_ratio = risk.cancel_rate_percent;
          updates.courier_fraud_reports = risk.fraud_reports;
          updates.courier_fraud_comment = risk.fraud_comment || null;
        }
      } catch (err) {
        console.warn('Fraud check on order update skipped:', err);
      }
    }

    // 5. Update order record
    const { data: updated, error: updateErr } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .select('*, order_items(*, products(*)), courier_shipments(*)')
      .single();

    if (updateErr || !updated) {
      return errorResponse('INTERNAL_ERROR', updateErr?.message || 'Failed to update order', 500);
    }

    return successResponse(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export const PUT = PATCH;
