import { json, type LoaderArgs } from '@remix-run/node';
import { Outlet } from '@remix-run/react';
import { requireUser } from '~/utils/server/auth.server';

export async function loader({ request }: LoaderArgs) {
  const user = await requireUser(request, { role: 'ADMIN' });

  return json({ user });
}

export default function ManagerLayout() {
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">Manager</h1>
      </header>
      <main>
        <Outlet />;
      </main>
    </>
  );
}
