import { z } from 'zod';

export const updateTenantPlanSchema = z.object({
  plan: z.enum(['trial', 'basic', 'pro']).optional(),
  subscription_status: z.enum(['active', 'expired', 'cancelled']).optional(),
});
