import { Outlet } from '@remix-run/react';
import { Header } from './header';

export default function PublicLayout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
    </>
  );
}
