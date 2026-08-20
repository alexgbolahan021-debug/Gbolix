import { buildHealthResponse } from "./healthResponse";
import { describe, expect, it } from "vitest";

describe("Gbolix API health response", () => {
  it("returns the complete health contract required by Render", () => {
    const response = buildHealthResponse();

    expect(response.status).toBe("ok");
    expect(Number.isFinite(Date.parse(response.timestamp))).toBe(true);
  });
});
