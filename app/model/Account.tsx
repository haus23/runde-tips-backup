import { z } from 'zod';

export const Account = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  otpSecret: z.string().optional(),
  secretExpiresAt: z.string().optional(),
});

export type Account = z.infer<typeof Account>;
