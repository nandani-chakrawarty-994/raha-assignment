/** Safely stringify Mongo ObjectIds from lean() documents (typed as unknown in Mongoose 8). */
export function idStr(id: unknown): string {
  if (id == null) return "";
  if (typeof id === "string") return id;
  if (typeof id === "object" && "toString" in id && typeof (id as { toString: () => string }).toString === "function") {
    return (id as { toString: () => string }).toString();
  }
  return String(id);
}
