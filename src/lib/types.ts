export type UserRole = "sales_associate" | "branch_head";

export interface GeoPoint {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  reportsTo?: string | null;
}

export type DayStatus = "open" | "closed";

export type ActivityType = "in_person_meeting";

export interface ApiErrorBody {
  error: string;
  details?: unknown;
}
