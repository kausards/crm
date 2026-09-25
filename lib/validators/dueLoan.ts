import { z } from 'zod';

export const createDueSchema = z.object({
  party_name: z.string().min(1, 'Customer/Party name is required').max(100),
  party_phone: z.string().max(20).optional().nullable(),
  type: z.enum(['credit', 'debit']), // credit = customer owes us money, debit = payment received
  amount: z.number().positive('Amount must be positive'),
  note: z.string().max(255).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

export const createLoanSchema = z.object({
  party_name: z.string().min(1, 'Lender/Party name is required').max(100),
  party_phone: z.string().max(20).optional().nullable(),
  type: z.enum(['borrowed', 'repaid']), // borrowed = we owe them, repaid = we paid back
  amount: z.number().positive('Amount must be positive'),
  note: z.string().max(255).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});
