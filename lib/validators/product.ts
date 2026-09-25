import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  sku: z.string().max(100).optional().nullable(),
  buy_price: z.number().min(0, 'Buy price cannot be negative'),
  sell_price: z.number().min(0, 'Sell price cannot be negative'),
  stock_quantity: z.number().int().min(0, 'Stock cannot be negative').default(0),
  low_stock_threshold: z.number().int().min(0, 'Threshold cannot be negative').default(5),
});

export const updateProductSchema = createProductSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export const stockAdjustSchema = z.object({
  direction: z.enum(['in', 'out']),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  reason: z.string().min(1, 'Reason is required').max(200),
});
