import { Outlet } from '@remix-run/react';

export default function PublicLayout() {
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">runde.tips</h1>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
