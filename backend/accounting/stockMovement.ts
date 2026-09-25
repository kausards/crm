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
 * Deterministically logs a stock movement and updates current product stock quantity
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

  // 1. Fetch current stock
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

  // 2. Insert immutable stock movement record
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

  // 3. Update product current stock
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
