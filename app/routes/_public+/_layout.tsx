import { Link, Outlet } from '@remix-run/react';
import { useOptionalUser } from '~/utils/user';

export default function PublicLayout() {
  const user = useOptionalUser();

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">runde.tips</h1>
        {user ? (
          <Link to={'/logout'}>Logout</Link>
        ) : (
          <Link to={'/login'}>Login</Link>
        )}
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
