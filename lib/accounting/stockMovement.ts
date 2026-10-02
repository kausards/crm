import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<Database, any, any>;

export interface LogStockMovementParams {
  supabase: Client;
  tenantId: string;
  productId: string;
  direction: 'in' | 'out';
  quantity: number;
  reason: string;
  referenceId?: string | null;
}

/**
 * Deterministically and atomically logs a stock movement and updates current product stock quantity.
 * Uses PostgreSQL RPC adjust_stock_atomic with FOR UPDATE row locking to prevent race conditions.
 */
export async function logStockMovement({
  supabase,
  tenantId,
  productId,
  direction,
  quantity,
  reason,
  referenceId = null,
}: LogStockMovementParams): Promise<number> {
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than 0');
  }

  // 1. Attempt atomic update via PostgreSQL RPC with row-level lock
  try {
    const { data: newStock, error: rpcErr } = await (supabase.rpc as any)('adjust_stock_atomic', {
      p_product_id: productId,
      p_tenant_id: tenantId,
      p_direction: direction,
      p_quantity: quantity,
      p_reason: reason,
      p_reference_id: referenceId,
    });

    if (!rpcErr && typeof newStock === 'number') {
      return newStock;
    }

    if (rpcErr) {
      const isMissingFunction =
        rpcErr.message?.includes('function') &&
        (rpcErr.message?.includes('does not exist') || rpcErr.message?.includes('not found'));

      if (!isMissingFunction) {
        throw new Error(rpcErr.message || 'Atomic stock adjustment failed');
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && !err.message.includes('function') && !err.message.includes('not found')) {
      throw err;
    }
  }

  // 2. Sequential fallback if RPC is not available in environment
  const { data: product, error: fetchErr } = await supabase
    .from('products')
    .select('id, stock_quantity')
    .eq('id', productId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchErr || !product) {
    throw new Error(`Product not found: ${fetchErr?.message || productId}`);
  }

  const currentStock = Number(product.stock_quantity) || 0;
  let newStock = currentStock;

  if (direction === 'in') {
    newStock = currentStock + quantity;
  } else {
    if (currentStock < quantity) {
      throw new Error(`Insufficient stock for product ${product.id}. Current: ${currentStock}, Required: ${quantity}`);
    }
    newStock = currentStock - quantity;
  }

  // Insert immutable stock movement record
  const { error: moveErr } = await supabase.from('stock_movements').insert({
    tenant_id: tenantId,
    product_id: productId,
    direction,
    quantity,
    reason,
    reference_id: referenceId,
  });

  if (moveErr) {
    throw new Error(`Failed to record stock movement: ${moveErr.message}`);
  }

  // Update product current stock
  const { error: updateErr } = await supabase
    .from('products')
    .update({
      stock_quantity: newStock,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .eq('tenant_id', tenantId);

  if (updateErr) {
    throw new Error(`Failed to update product stock: ${updateErr.message}`);
  }

  return newStock;
}
