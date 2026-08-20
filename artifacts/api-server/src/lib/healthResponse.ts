import { HealthCheckResponse } from "@workspace/api-zod";

export function buildHealthResponse() {
  return HealthCheckResponse.parse({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
