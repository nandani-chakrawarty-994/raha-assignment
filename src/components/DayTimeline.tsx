"use client";

import { accuracyLabel, formatTime } from "@/components/ui";

export type DayView = {
  id: string;
  status: "open" | "closed";
  localDate: string;
  startLocation: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number | null;
    capturedAt: string | Date;
  };
  endLocation?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number | null;
    capturedAt: string | Date;
  } | null;
  totalDistanceKm: number;
  distanceProvider: string;
  activities: Array<{
    id: string;
    notes: string;
    segmentDistanceKm: number;
    location: {
      latitude: number;
      longitude: number;
      accuracyMeters?: number | null;
      capturedAt: string | Date;
    };
    lead: { id: string; name: string; contact: string } | null;
  }>;
};

export function DayTimeline({
  day,
  associateName,
}: {
  day: DayView;
  associateName?: string;
}) {
  const mapPoints = [
    {
      label: "Start",
      lat: day.startLocation.latitude,
      lng: day.startLocation.longitude,
    },
    ...day.activities.map((a, i) => ({
      label: a.lead?.name || `Stop ${i + 1}`,
      lat: a.location.latitude,
      lng: a.location.longitude,
    })),
  ];

  if (day.endLocation) {
    mapPoints.push({
      label: "End",
      lat: day.endLocation.latitude,
      lng: day.endLocation.longitude,
    });
  }

  const path = mapPoints.map((p) => `${p.lat},${p.lng}`).join("/");
  const hasRoute = mapPoints.length >= 1;

  // Simple static map via OSM embed of first point + markers listed
  const center = mapPoints[0];
  const embedUrl = center
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${
        center.lng - 0.08
      }%2C${center.lat - 0.05}%2C${center.lng + 0.08}%2C${
        center.lat + 0.05
      }&layer=mapnik&marker=${center.lat}%2C${center.lng}`
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          {associateName && (
            <p className="text-sm font-medium text-brand-700">{associateName}</p>
          )}
          <h3 className="text-lg font-semibold text-slate-900">
            {day.localDate}{" "}
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                day.status === "open"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {day.status}
            </span>
          </h3>
          <p className="text-sm text-slate-600">
            Total distance:{" "}
            <span className="font-semibold text-slate-900">{day.totalDistanceKm} km</span>
            <span className="text-slate-400"> · via {day.distanceProvider}</span>
          </p>
        </div>
        {hasRoute && (
          <a
            href={`https://www.google.com/maps/dir/${path}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-brand-700 underline"
          >
            Open route on Google Maps
          </a>
        )}
      </div>

      {embedUrl && (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <iframe
            title="Day route map"
            src={embedUrl}
            className="h-48 w-full border-0"
            loading="lazy"
          />
          <p className="bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
            Map centres on start. Use “Open route” for the full path between stops.
          </p>
        </div>
      )}

      <ol className="relative space-y-0 border-l-2 border-brand-200 pl-4">
        <li className="mb-4">
          <span className="absolute -left-[9px] mt-1 h-4 w-4 rounded-full border-2 border-brand-600 bg-white" />
          <p className="font-medium text-slate-900">Start Day</p>
          <p className="text-sm text-slate-600">{formatTime(day.startLocation.capturedAt)}</p>
          <p className="text-xs text-slate-500">
            {day.startLocation.latitude.toFixed(5)}, {day.startLocation.longitude.toFixed(5)} ·{" "}
            {accuracyLabel(day.startLocation.accuracyMeters)}
          </p>
        </li>

        {day.activities.map((a) => (
          <li key={a.id} className="mb-4">
            <span className="absolute -left-[9px] mt-1 h-4 w-4 rounded-full border-2 border-brand-500 bg-brand-500" />
            <p className="font-medium text-slate-900">
              In-Person Meeting
              {a.lead ? ` · ${a.lead.name}` : ""}
            </p>
            <p className="text-sm text-slate-600">{formatTime(a.location.capturedAt)}</p>
            <p className="text-sm text-slate-700">{a.notes}</p>
            <p className="text-xs text-slate-500">
              Segment +{a.segmentDistanceKm} km · {accuracyLabel(a.location.accuracyMeters)}
            </p>
          </li>
        ))}

        {day.endLocation ? (
          <li>
            <span className="absolute -left-[9px] mt-1 h-4 w-4 rounded-full border-2 border-slate-700 bg-slate-700" />
            <p className="font-medium text-slate-900">End Day</p>
            <p className="text-sm text-slate-600">
              {formatTime(day.endLocation.capturedAt)}
            </p>
            <p className="text-xs text-slate-500">
              {accuracyLabel(day.endLocation.accuracyMeters)}
            </p>
          </li>
        ) : (
          <li>
            <span className="absolute -left-[9px] mt-1 h-4 w-4 rounded-full border-2 border-amber-500 bg-amber-100" />
            <p className="font-medium text-amber-800">Day still open</p>
            <p className="text-sm text-amber-700">
              Not ended yet — distance is a running total until End Day.
            </p>
          </li>
        )}
      </ol>
    </div>
  );
}
