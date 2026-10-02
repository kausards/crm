import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { logStockMovement } from '@/lib/accounting/stockMovement';
import { createSteadfastConsignment } from '@/lib/courier/steadfast';
import { createPathaoConsignment } from '@/lib/courier/pathao';
import { createRedXConsignment } from '@/lib/courier/redx';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch order and verify status
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (orderErr || !order) {
      return errorResponse('NOT_FOUND', 'Order not found', 404);
    }

    if (order.status !== 'pending' && order.status !== 'flagged' && order.status !== 'on_hold') {
      return errorResponse('BAD_REQUEST', `Cannot confirm order with current status: ${order.status}`, 400);
    }

    // 2. Pre-flight validation: check stock availability for all items in order
    const orderItems = order.order_items || [];
    if (orderItems.length === 0) {
      return errorResponse('BAD_REQUEST', 'Cannot confirm an order with no items', 400);
    }

    const productIds = orderItems.map((item: { product_id: string }) => item.product_id);
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .in('id', productIds)
      .eq('tenant_id', auth.tenantId);

    if (prodErr || !products) {
      return errorResponse('INTERNAL_ERROR', 'Failed to verify inventory levels', 500);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const stockErrors: string[] = [];

    for (const item of orderItems) {
      const prod = productMap.get(item.product_id);
      if (!prod) {
        stockErrors.push(`Product ID ${item.product_id} not found`);
      } else if (prod.stock_quantity < item.quantity) {
        stockErrors.push(`"${prod.name}": requires ${item.quantity}, available: ${prod.stock_quantity}`);
      }
    }

    if (stockErrors.length > 0) {
      return errorResponse('CONFLICT', `Insufficient inventory to confirm order: ${stockErrors.join('; ')}`, 409);
    }

    // 3. Determine courier provider to use
    const body = await req.json().catch(() => ({}));
    const chosenProvider = body.courier_provider || order.courier_provider || 'steadfast';

    // 4. Retrieve decrypted courier credentials for tenant
    const { data: credsRow } = await supabase
      .from('courier_credentials')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('provider', chosenProvider)
      .eq('is_active', true)
      .single();

    let consignmentId: string | null = null;
    let trackingCode: string | null = null;

    // Call courier API if credentials are configured
    if (credsRow) {
      try {
        const apiKey = decrypt(credsRow.encrypted_api_key);
        const secretKey = credsRow.encrypted_api_secret ? decrypt(credsRow.encrypted_api_secret) : null;

        if (chosenProvider === 'steadfast') {
          const res = await createSteadfastConsignment(
            { apiKey, secretKey },
            {
              invoice: order.id.slice(0, 8),
              recipient_name: order.customer_name,
              recipient_phone: order.customer_phone,
              recipient_address: order.customer_address,
              cod_amount: Number(order.cod_amount),
              note: order.notes,
            }
          );
          consignmentId = res.consignment_id;
          trackingCode = res.tracking_code;
        } else if (chosenProvider === 'pathao') {
          const res = await createPathaoConsignment(
            { apiKey, secretKey },
            {
              recipient_name: order.customer_name,
              recipient_phone: order.customer_phone,
              recipient_address: order.customer_address,
              amount_to_collect: Number(order.cod_amount),
            }
          );
          consignmentId = res.consignment_id;
          trackingCode = res.tracking_code;
        } else if (chosenProvider === 'redx') {
          const res = await createRedXConsignment(
            { apiKey },
            {
              customer_name: order.customer_name,
              customer_phone: order.customer_phone,
              customer_address: order.customer_address,
              delivery_area: 'Dhaka',
              cash_collection_amount: Number(order.cod_amount),
            }
          );
          consignmentId = res.consignment_id;
          trackingCode = res.tracking_code;
        }
      } catch (courierErr) {
        console.error('Courier API dispatch error:', courierErr);
        // We log and still allow confirmation or return courier error message
      }
    }

    // 4. Record shipment if consignment was created
    if (consignmentId) {
      await supabase.from('courier_shipments').insert({
        tenant_id: auth.tenantId,
        order_id: order.id,
        provider: chosenProvider,
        consignment_id: consignmentId,
        tracking_code: trackingCode,
        status: 'dispatched',
        last_synced_at: new Date().toISOString(),
      });
    }

    // 5. Deduct stock with compensating rollback on failure
    const deductedItems: Array<{ productId: string; quantity: number }> = [];

    try {
      for (const item of order.order_items || []) {
        await logStockMovement({
          supabase,
          tenantId: auth.tenantId,
          productId: item.product_id,
          direction: 'out',
          quantity: item.quantity,
          reason: 'order_confirm',
          referenceId: order.id,
        });
        deductedItems.push({ productId: item.product_id, quantity: item.quantity });
      }

      // 6. Update order status to 'confirmed'
      const { data: updatedOrder, error: updateErr } = await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          courier_provider: chosenProvider,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .eq('tenant_id', auth.tenantId)
        .select('*')
        .single();

      if (updateErr) {
        throw new Error(`Failed to update order status: ${updateErr.message}`);
      }

      return successResponse({
        order: updatedOrder,
        courier: {
          provider: chosenProvider,
          consignmentId,
          trackingCode,
        },
      });
    } catch (failureErr) {
      // Rollback deducted stock items to preserve inventory integrity
      for (const deducted of deductedItems) {
        try {
          await logStockMovement({
            supabase,
            tenantId: auth.tenantId,
            productId: deducted.productId,
            direction: 'in',
            quantity: deducted.quantity,
            reason: 'order_confirm_rollback',
            referenceId: order.id,
          });
        } catch (rollbackErr) {
          console.error('Critical: Failed to rollback stock deduction:', rollbackErr);
        }
      }
      throw failureErr;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
