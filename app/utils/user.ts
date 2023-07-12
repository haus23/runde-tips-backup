import type { SerializeFrom } from '@remix-run/node';
import { useRouteLoaderData } from '@remix-run/react';
import { type loader as rootLoader } from '~/root';

function isUser(user: any): user is SerializeFrom<typeof rootLoader>['user'] {
  return user && typeof user === 'object' && typeof user.id === 'string';
}

export function useOptionalUser() {
  const data = useRouteLoaderData('root') as SerializeFrom<typeof rootLoader>;
  if (!data || !isUser(data.user)) {
    return undefined;
  }
  return data.user;
}
