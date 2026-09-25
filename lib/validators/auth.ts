import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(100),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const staffInviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  role: z.enum(['staff']).default('staff'),
});
