"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { DayTimeline, type DayView } from "@/components/DayTimeline";
import { Alert, Button, accuracyLabel } from "@/components/ui";
import { useGeolocation } from "@/hooks/useGeolocation";

type Lead = {
  id: string;
  name: string;
  contact: string;
  location: { latitude: number; longitude: number; address?: string };
};

type AuthUser = { id: string; name: string; email: string; role: string };

export default function AssociatePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [day, setDay] = useState<DayView | null>(null);
  const [history, setHistory] = useState<DayView[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadId, setLeadId] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const geo = useGeolocation();

  const refresh = useCallback(async () => {
    const [meRes, dayRes, leadsRes, histRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/day"),
      fetch("/api/leads"),
      fetch("/api/day/history"),
    ]);

    if (meRes.status === 401) {
      router.replace("/login");
      return;
    }
    if (meRes.ok) {
      const me = await meRes.json();
      setUser(me.user);
    }
    if (dayRes.ok) {
      const d = await dayRes.json();
      setDay(d.day);
    }
    if (leadsRes.ok) {
      const l = await leadsRes.json();
      setLeads(l.leads);
      if (l.leads[0]) setLeadId((prev) => prev || l.leads[0].id);
    }
    if (histRes.ok) {
      const h = await histRes.json();
      setHistory(h.days);
    }
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function startDay() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const location = await geo.capture();
    if (!location) {
      setError(geo.error || "Could not capture location");
      setBusy(false);
      return;
    }

    const res = await fetch("/api/day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location,
        timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Failed to start day");
      return;
    }
    setDay(data.day);
    setMessage(
      `Day started · ${accuracyLabel(location.accuracyMeters)}`
    );
    refresh();
  }

  async function addActivity() {
    setBusy(true);
    setError(null);
    setMessage(null);

    if (!notes.trim()) {
      setError("Please add meeting notes");
      setBusy(false);
      return;
    }

    const location = await geo.capture();
    if (!location) {
      setError(geo.error || "Could not capture location");
      setBusy(false);
      return;
    }

    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, notes, location }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Failed to log activity");
      return;
    }
    setDay(data.day);
    setNotes("");
    setMessage(`Activity logged · ${accuracyLabel(location.accuracyMeters)}`);
    refresh();
  }

  async function endDay() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const location = await geo.capture();
    if (!location) {
      setError(geo.error || "Could not capture location");
      setBusy(false);
      return;
    }

    const res = await fetch("/api/day/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Failed to end day");
      return;
    }
    setDay(data.day);
    setMessage(`Day ended · ${data.day.totalDistanceKm} km total`);
    refresh();
  }

  const isOpen = day?.status === "open";

  return (
    <div className="min-h-screen pb-16">
      <Header name={user?.name || "…"} roleLabel="Sales Associate" />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {(error || geo.error) && (
          <Alert tone="error">{error || geo.error}</Alert>
        )}
        {message && <Alert tone="success">{message}</Alert>}

        <section className="rounded-xl border border-brand-800/10 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Today&apos;s controls</h2>
          <p className="mt-1 text-sm text-slate-600">
            Location is captured automatically when you start, log, or end. Allow location when
            prompted.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={startDay} disabled={busy || !!isOpen || geo.loading}>
              {geo.loading && !isOpen ? "Getting location…" : "Start Day"}
            </Button>
            <Button
              variant="secondary"
              onClick={addActivity}
              disabled={busy || !isOpen || geo.loading}
            >
              Add Activity
            </Button>
            <Button
              variant="danger"
              onClick={endDay}
              disabled={busy || !isOpen || geo.loading}
            >
              End Day
            </Button>
          </div>

          {isOpen && (
            <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-700">Lead</span>
                <select
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} · {l.contact}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-700">Meeting notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-slate-200 px-3 py-2"
                  placeholder="Discussed pricing, next steps…"
                />
              </label>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-brand-800/10 bg-white/90 p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Current day</h2>
          {day ? (
            <DayTimeline day={day} />
          ) : (
            <p className="text-sm text-slate-600">No day started yet. Tap Start Day to begin.</p>
          )}
        </section>

        <section className="rounded-xl border border-brand-800/10 bg-white/90 p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Your history</h2>
          <div className="space-y-8">
            {history
              .filter((h) => h.id !== day?.id)
              .map((h) => (
                <DayTimeline key={h.id} day={h} />
              ))}
            {history.filter((h) => h.id !== day?.id).length === 0 && (
              <p className="text-sm text-slate-600">No previous days yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
