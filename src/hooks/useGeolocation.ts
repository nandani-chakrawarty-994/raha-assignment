"use client";

import { useCallback, useState } from "react";

export interface CapturedLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  capturedAt: string;
}

export type GeoErrorCode =
  | "permission_denied"
  | "position_unavailable"
  | "timeout"
  | "unsupported"
  | "unknown";

export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<GeoErrorCode | null>(null);
  const [last, setLast] = useState<CapturedLocation | null>(null);

  const capture = useCallback(async (): Promise<CapturedLocation | null> => {
    setLoading(true);
    setError(null);
    setErrorCode(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported on this device/browser.");
      setErrorCode("unsupported");
      setLoading(false);
      return null;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const captured: CapturedLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters:
          typeof position.coords.accuracy === "number"
            ? Math.round(position.coords.accuracy)
            : null,
        capturedAt: new Date().toISOString(),
      };

      setLast(captured);
      setLoading(false);
      return captured;
    } catch (err) {
      const geoErr = err as GeolocationPositionError;
      let message = "Unable to get your location.";
      let code: GeoErrorCode = "unknown";

      if (geoErr?.code === 1) {
        message =
          "Location permission denied. Enable location access in your browser settings to continue.";
        code = "permission_denied";
      } else if (geoErr?.code === 2) {
        message = "Location unavailable. Move to an open area or try again.";
        code = "position_unavailable";
      } else if (geoErr?.code === 3) {
        message = "Location request timed out. Please try again.";
        code = "timeout";
      }

      setError(message);
      setErrorCode(code);
      setLoading(false);
      return null;
    }
  }, []);

  return { capture, loading, error, errorCode, last, setError };
}
