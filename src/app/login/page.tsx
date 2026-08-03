"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button } from "@/components/ui";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    const next = searchParams.get("next");
    if (next) {
      router.push(next);
    } else if (data.user.role === "branch_head") {
      router.push("/branch-head");
    } else {
      router.push("/associate");
    }
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-3xl font-semibold tracking-tight text-brand-800">Raha</p>
          <h1 className="mt-1 text-xl font-medium text-slate-800">Field Tracker</h1>
          <p className="mt-2 text-sm text-slate-600">
            Log field visits. Track distance. Export fuel reimbursement.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border border-brand-800/10 bg-white/90 p-6 shadow-sm"
        >
          {error && <Alert tone="error">{error}</Alert>}

          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-brand-500 focus:ring-2"
              placeholder="you@raha.example"
              autoComplete="username"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-brand-500 focus:ring-2"
              autoComplete="current-password"
            />
          </label>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white/60 p-4 text-xs text-slate-600">
          <p className="mb-2 font-medium text-slate-800">Seed credentials</p>
          <p>
            Branch Head: <code>priya.head@raha.example</code> / <code>Password123!</code>
          </p>
          <p>
            Associate: <code>arjun.sales@raha.example</code> / <code>Password123!</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
