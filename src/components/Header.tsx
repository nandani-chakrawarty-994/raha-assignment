"use client";

import { useRouter } from "next/navigation";

export function Header({
  name,
  roleLabel,
}: {
  name: string;
  roleLabel: string;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-brand-800/10 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div>
          <p className="text-lg font-semibold tracking-tight text-brand-800">Raha Field Tracker</p>
          <p className="text-xs text-slate-500">
            {name} · {roleLabel}
          </p>
        </div>
        <button
          onClick={logout}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
