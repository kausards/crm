import { z } from 'zod';

export const saveCourierCredsSchema = z.object({
  provider: z.enum(['steadfast', 'pathao', 'redx']),
  api_key: z.string().min(1, 'API Key is required'),
  api_secret: z.string().optional().nullable(),
});
