import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export interface ProductPnLResult {
  productId: string;
  productName: string;
  sku: string | null;
  buyPrice: number;
  sellPrice: number;
  currentStock: number;
  stockValue: number;
  totalUnitsSold: number;
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  marginPercent: number;
}

export interface OverallPnLResult {
  from: string;
  to: string;
  deliveredOrdersCount: number;
  returnedOrdersCount: number;
  revenue: number;
  cogs: number;
  returnCost: number;
  grossProfit: number;
  operatingCosts: number;
  salaries: number;
  netProfit: number;
  grossMarginPercent: number;
  netMarginPercent: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<Database, any, any>;

/**
 * Deterministically computes P&L for a single product from actual order items and stock movements
 */
export async function calculateProductPnL(
  supabase: Client,
  tenantId: string,
  productId: string
): Promise<ProductPnLResult> {
  // 1. Fetch product
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('tenant_id', tenantId)
    .single();

  if (prodErr || !product) {
    throw new Error(`Product not found or access denied: ${prodErr?.message}`);
  }

  // 2. Fetch sold items for delivered orders
  const { data: orderItems, error: itemsErr } = await supabase
    .from('order_items')
    .select('quantity, buy_price, sell_price, orders!inner(status)')
    .eq('product_id', productId)
    .eq('tenant_id', tenantId)
    .eq('orders.status', 'delivered');

  if (itemsErr) {
    throw new Error(`Failed to query order items for product P&L: ${itemsErr.message}`);
  }

  let totalUnitsSold = 0;
  let totalRevenue = 0;
  let totalCogs = 0;

  for (const item of (orderItems as Array<{ quantity: number; buy_price: number; sell_price: number }>) || []) {
    const qty = Number(item.quantity) || 0;
    const sell = Number(item.sell_price) || 0;
    const buy = Number(item.buy_price) || 0;

    totalUnitsSold += qty;
    totalRevenue += qty * sell;
    totalCogs += qty * buy;
  }

  const grossProfit = totalRevenue - totalCogs;
  const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const currentStock = Number(product.stock_quantity) || 0;
  const stockValue = currentStock * Number(product.buy_price);

  return {
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    buyPrice: Number(product.buy_price),
    sellPrice: Number(product.sell_price),
    currentStock,
    stockValue: Math.round(stockValue * 100) / 100,
    totalUnitsSold,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCogs: Math.round(totalCogs * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    marginPercent: Math.round(marginPercent * 100) / 100,
  };
}

/**
 * Deterministically computes Overall Business P&L for a date range
 * Formula:
 * Gross Profit = Revenue − COGS − Return Cost
 * Net Profit = Gross Profit − Bill/Cost − Salary
 */
export async function calculateOverallPnL(
  supabase: Client,
  tenantId: string,
  fromDate: string,
  toDate: string
): Promise<OverallPnLResult> {
  // 1. Delivered orders revenue and COGS
  const { data: deliveredItems, error: itemsErr } = await supabase
    .from('order_items')
    .select('quantity, buy_price, sell_price, orders!inner(status, created_at)')
    .eq('tenant_id', tenantId)
    .eq('orders.status', 'delivered')
    .gte('orders.created_at', `${fromDate}T00:00:00.000Z`)
    .lte('orders.created_at', `${toDate}T23:59:59.999Z`);

  if (itemsErr) {
    throw new Error(`Failed to query revenue data: ${itemsErr.message}`);
  }

  let revenue = 0;
  let cogs = 0;

  for (const item of (deliveredItems as Array<{ quantity: number; buy_price: number; sell_price: number }>) || []) {
    const qty = Number(item.quantity) || 0;
    revenue += qty * (Number(item.sell_price) || 0);
    cogs += qty * (Number(item.buy_price) || 0);
  }

  // 2. Count delivered and returned orders
  const { count: deliveredCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'delivered')
    .gte('created_at', `${fromDate}T00:00:00.000Z`)
    .lte('created_at', `${toDate}T23:59:59.999Z`);

  const { count: returnedCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'returned')
    .gte('created_at', `${fromDate}T00:00:00.000Z`)
    .lte('created_at', `${toDate}T23:59:59.999Z`);

  // 3. Return costs logged in bill_costs (category = 'return_cost')
  const { data: returnCosts, error: retErr } = await supabase
    .from('bill_costs')
    .select('amount')
    .eq('tenant_id', tenantId)
    .eq('category', 'return_cost')
    .gte('date', fromDate)
    .lte('date', toDate);

  if (retErr) {
    throw new Error(`Failed to query return costs: ${retErr.message}`);
  }

  const returnCost = (returnCosts || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);

  // 4. Operating costs (all bill_costs except return_cost)
  const { data: opCosts, error: costErr } = await supabase
    .from('bill_costs')
    .select('amount, category')
    .eq('tenant_id', tenantId)
    .neq('category', 'return_cost')
    .gte('date', fromDate)
    .lte('date', toDate);

  if (costErr) {
    throw new Error(`Failed to query operating costs: ${costErr.message}`);
  }

  const operatingCosts = (opCosts || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);

  // 5. Salaries in period
  const { data: salaryRuns, error: salErr } = await supabase
    .from('salary_runs')
    .select('net_payable')
    .eq('tenant_id', tenantId)
    .gte('month', fromDate)
    .lte('month', toDate);

  if (salErr) {
    throw new Error(`Failed to query salaries: ${salErr.message}`);
  }

  const salaries = (salaryRuns || []).reduce((sum, item) => sum + Number(item.net_payable || 0), 0);

  // Core Formulas
  const grossProfit = revenue - cogs - returnCost;
  const netProfit = grossProfit - operatingCosts - salaries;
  const grossMarginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMarginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    from: fromDate,
    to: toDate,
    deliveredOrdersCount: deliveredCount || 0,
    returnedOrdersCount: returnedCount || 0,
    revenue: Math.round(revenue * 100) / 100,
    cogs: Math.round(cogs * 100) / 100,
    returnCost: Math.round(returnCost * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    operatingCosts: Math.round(operatingCosts * 100) / 100,
    salaries: Math.round(salaries * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    grossMarginPercent: Math.round(grossMarginPercent * 100) / 100,
    netMarginPercent: Math.round(netMarginPercent * 100) / 100,
  };
}
