import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(100),
  phone: z.string().min(6, 'Valid phone number is required').max(20),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(6).max(20).optional(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
