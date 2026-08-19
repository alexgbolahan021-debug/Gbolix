export type AppRole = "owner" | "admin" | "specialist" | "client";

/** Convert legacy stored freelancer values to the public specialist role. */
export function normalizeRole(role: string | null | undefined): AppRole {
  if (role === "freelancer") return "specialist";
  if (role === "owner" || role === "admin" || role === "specialist" || role === "client") return role;
  return "client";
}

/** Staff access accepts legacy freelancer rows until they are explicitly changed. */
export function isStaffRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "specialist" || role === "freelancer";
}
