"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { DayTimeline, type DayView } from "@/components/DayTimeline";
import { Alert, Button, formatTime } from "@/components/ui";
import { todayLocalDateKey } from "@/lib/utils";
import { useRouter } from "next/navigation";

type AuthUser = { id: string; name: string; email: string; role: string };
type Associate = { id: string; name: string; email: string };
type FeedItem = {
  id: string;
  notes: string;
  location: { capturedAt: string | Date };
  segmentDistanceKm: number;
  associate: { id: string; name: string } | null;
  lead: { name: string } | null;
};
type DistanceRow = {
  id: string;
  name: string;
  email: string;
  dayCount: number;
  totalDistanceKm: number;
  days: Array<{ id: string; localDate: string; status: string; totalDistanceKm: number }>;
};

type TeamDay = DayView & {
  associate: Associate | null;
};

export default function BranchHeadPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [date, setDate] = useState(() => todayLocalDateKey());
  const [associateId, setAssociateId] = useState("");
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [distanceByAssociate, setDistanceByAssociate] = useState<DistanceRow[]>([]);
  const [days, setDays] = useState<TeamDay[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Associate[]>([]);
  const [history, setHistory] = useState<DayView[] | null>(null);
  const [historyName, setHistoryName] = useState("");
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);

  const loadTeam = useCallback(async () => {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (associateId) params.set("associateId", associateId);

    const [meRes, teamRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch(`/api/team?${params.toString()}`),
    ]);

    if (meRes.status === 401) {
      router.replace("/login");
      return;
    }
    if (meRes.ok) {
      const me = await meRes.json();
      setUser(me.user);
    }
    if (!teamRes.ok) {
      const t = await teamRes.json();
      setError(t.error || "Failed to load team");
      return;
    }
    const data = await teamRes.json();
    setAssociates(data.associates);
    setFeed(data.feed);
    setDistanceByAssociate(data.distanceByAssociate);
    setDays(data.days);
  }, [date, associateId, router]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  async function runSearch() {
    setError(null);
    const res = await fetch(`/api/team/search?q=${encodeURIComponent(searchQ)}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Search failed");
      return;
    }
    setSearchResults(data.results);
  }

  async function openHistory(id: string, name: string) {
    setError(null);
    const res = await fetch(`/api/team/search?id=${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load history");
      return;
    }
    setHistory(data.history);
    setHistoryName(name);
  }

  async function downloadExport() {
    setError(null);
    setMessage(null);
    setExportBusy(true);
    try {
      const url = `/api/team/export?year=${exportYear}&month=${exportMonth}`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Export failed");
        return;
      }
      const blob = await res.blob();
      const monthPrefix = `${exportYear}-${String(exportMonth).padStart(2, "0")}`;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `fuel-reimbursement-${monthPrefix}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      setMessage(`Downloaded report for ${monthPrefix}`);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <div className="min-h-screen pb-16">
      <Header name={user?.name || "…"} roleLabel="Branch Head" />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {error && <Alert tone="error">{error}</Alert>}
        {message && <Alert tone="success">{message}</Alert>}

        <section className="rounded-xl border border-brand-800/10 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Associate</span>
              <select
                value={associateId}
                onChange={(e) => setAssociateId(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2"
              >
                <option value="">All team</option>
                {associates.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button variant="secondary" onClick={loadTeam}>
                Refresh
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-brand-800/10 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Distance by associate</h2>
          <p className="text-sm text-slate-600">Totals for the selected date filter.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Days</th>
                  <th className="py-2 pr-3 font-medium">Distance (km)</th>
                  <th className="py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {distanceByAssociate.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3">{row.name}</td>
                    <td className="py-2 pr-3">{row.dayCount}</td>
                    <td className="py-2 pr-3 font-medium">{row.totalDistanceKm}</td>
                    <td className="py-2">
                      <button
                        className="text-brand-700 underline"
                        onClick={() => openHistory(row.id, row.name)}
                      >
                        History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-brand-800/10 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Team activity feed</h2>
          <ul className="mt-3 space-y-3">
            {feed.map((item) => (
              <li key={item.id} className="border-b border-slate-100 pb-3 text-sm">
                <p className="font-medium text-slate-900">
                  {item.associate?.name || "Unknown"} · {item.lead?.name || "Lead"}
                </p>
                <p className="text-slate-700">{item.notes}</p>
                <p className="text-xs text-slate-500">
                  {formatTime(item.location.capturedAt)} · +{item.segmentDistanceKm} km
                </p>
              </li>
            ))}
            {feed.length === 0 && (
              <p className="text-sm text-slate-600">No activities for this filter.</p>
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-brand-800/10 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Day timelines</h2>
          <div className="mt-4 space-y-10">
            {days.map((d) => (
              <DayTimeline
                key={d.id}
                day={d}
                associateName={d.associate?.name}
              />
            ))}
            {days.length === 0 && (
              <p className="text-sm text-slate-600">No day sessions for this filter.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-brand-800/10 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Search associate</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Name…"
              className="min-w-[200px] flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <Button variant="secondary" onClick={runSearch}>
              Search
            </Button>
          </div>
          <ul className="mt-3 space-y-2">
            {searchResults.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <span>
                  {r.name} <span className="text-slate-400">{r.email}</span>
                </span>
                <button
                  className="text-brand-700 underline"
                  onClick={() => openHistory(r.id, r.name)}
                >
                  View history
                </button>
              </li>
            ))}
          </ul>
          {history && (
            <div className="mt-6 space-y-8 border-t border-slate-100 pt-4">
              <h3 className="font-medium text-slate-900">History · {historyName}</h3>
              {history.map((h) => (
                <DayTimeline key={h.id} day={h} />
              ))}
              {history.length === 0 && (
                <p className="text-sm text-slate-600">No history for this associate.</p>
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-brand-800/10 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Monthly fuel export</h2>
          <p className="text-sm text-slate-600">
            Downloads a CSV with per-associate totals and daily detail for HR.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Year</span>
              <input
                type="number"
                value={exportYear}
                onChange={(e) => setExportYear(Number(e.target.value))}
                className="w-24 rounded-md border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Month</span>
              <select
                value={exportMonth}
                onChange={(e) => setExportMonth(Number(e.target.value))}
                className="rounded-md border border-slate-200 px-3 py-2"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <Button onClick={downloadExport} disabled={exportBusy}>
              {exportBusy ? "Preparing…" : "Download CSV"}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
