import type { Account } from './Account';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Account['role'];
};
