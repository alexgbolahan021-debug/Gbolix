import { afterEach, describe, expect, it, vi } from "vitest";
import { createGbolixLeadsExport, dispatchGbolixLeadsRequest, getGbolixLeadsResults } from "./leadsEngineClient";

const originalFetch = global.fetch;
const originalUrl = process.env.GBOLIX_LEADS_ENGINE_URL;
const originalSecret = process.env.GBOLIX_LEADS_SHARED_SECRET;

afterEach(() => {
  global.fetch = originalFetch;
  process.env.GBOLIX_LEADS_ENGINE_URL = originalUrl;
  process.env.GBOLIX_LEADS_SHARED_SECRET = originalSecret;
  vi.restoreAllMocks();
});

describe("Gbolix Leads results client", () => {
  it("signs and requests a workspace-scoped result set", async () => {
    process.env.GBOLIX_LEADS_ENGINE_URL = "https://lead.gbolix.site";
    process.env.GBOLIX_LEADS_SHARED_SECRET = "test-shared-secret";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ job: { id: "job_1", status: "completed", requestedCount: 1, processedCount: 1, qualifiedCount: 1, duplicateCount: 0, completedAt: null }, leadIds: ["lead_1"], leads: [] }), { status: 200 }));
    global.fetch = fetchMock;

    await getGbolixLeadsResults({ externalRequestId: "grq_12345678", externalWorkspaceId: "gws_1", actorId: "user_1" });

    expect(fetchMock).toHaveBeenCalledWith("https://lead.gbolix.site/api/integrations/gbolix/leads/results", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "X-Gbolix-Signature": expect.any(String), "X-Gbolix-Timestamp": expect.any(String) }) }));
  });

  it("requests a signed CSV export through the export endpoint", async () => {
    process.env.GBOLIX_LEADS_ENGINE_URL = "https://lead.gbolix.site";
    process.env.GBOLIX_LEADS_SHARED_SECRET = "test-shared-secret";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ exportId: "export_1", leadCount: 1, expiresAt: "2026-08-28T00:00:00.000Z", downloadUrl: "https://storage.example/download", downloadExpiresAt: "2026-08-21T01:00:00.000Z" }), { status: 200 }));
    global.fetch = fetchMock;

    const result = await createGbolixLeadsExport({ externalRequestId: "grq_12345678", externalWorkspaceId: "gws_1", actorId: "user_1" });

    expect(result.downloadUrl).toBe("https://storage.example/download");
    expect(fetchMock).toHaveBeenCalledWith("https://lead.gbolix.site/api/integrations/gbolix/leads/exports", expect.objectContaining({ method: "POST" }));
  });

  it("preserves confirmed AI chat constraints in the signed discovery dispatch", async () => {
    process.env.GBOLIX_LEADS_ENGINE_URL = "https://lead.gbolix.site";
    process.env.GBOLIX_LEADS_SHARED_SECRET = "test-shared-secret";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ jobId: "job_1" }), { status: 200 }));
    global.fetch = fetchMock;

    await dispatchGbolixLeadsRequest({ externalRequestId: "grq_12345678", externalWorkspaceId: "gws_1", creditAuthorizationId: "auth_1", label: "Lagos restaurants", inputType: "openstreetmap_discovery", rawContent: "", categoryCode: "restaurants", keywords: ["website", "automation"], discovery: { adapterKey: "openstreetmap-pilot-v1", city: "Lagos, Nigeria", limit: 5 } });

    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(options.body))).toMatchObject({ inputType: "openstreetmap_discovery", keywords: ["website", "automation"], discovery: { city: "Lagos, Nigeria", limit: 5 } });
  });
});
