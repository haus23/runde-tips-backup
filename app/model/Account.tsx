import { z } from 'zod';

// Firebase: 'accounts'

export const Account = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.literal('ADMIN').or(z.literal('USER')),
  otpSecret: z.string().optional(),
  secretExpiresAt: z.string().optional(),
});

export type Account = z.infer<typeof Account>;
