import { Outlet } from "@remix-run/react";

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
