import { z } from 'zod';

export const onboardingProfileSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters').max(100),
});

export const openingBalanceSchema = z.object({
  total_stock_value: z.number().min(0, 'Stock value cannot be negative').default(0),
  total_receivable: z.number().min(0, 'Receivables cannot be negative').default(0),
  total_payable: z.number().min(0, 'Payables cannot be negative').default(0),
});
