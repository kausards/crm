import { z } from 'zod';

export const createBillCostSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z.number().positive('Amount must be greater than 0'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  is_recurring: z.boolean().default(false),
  frequency: z.enum(['daily', 'monthly']).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
});

export const updateBillCostSchema = createBillCostSchema.partial();
