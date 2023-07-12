import { createCookieSessionStorage } from '@remix-run/node';
import type { User } from './auth.server';

type SessionData = {
  user: User;
};

export const sessionStorage = createCookieSessionStorage<SessionData>({
  cookie: {
    name: '_session',
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === 'production',
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;
