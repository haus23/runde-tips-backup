import { redirect, type LoaderArgs } from '@remix-run/node';
import { authenticator } from '~/utils/server/auth.server';

export async function loader({ request }: LoaderArgs) {
  await authenticator.logout(request, { redirectTo: '/' });

  return redirect('/');
}
