import { describe, expect, it } from "vitest";
import { toConfirmedChatDiscoveryRequest, toLeadRequestBody } from "./leadChatProposal";

describe("confirmed AI lead-chat request", () => {
  it("preserves extracted constraints in the request submitted after customer confirmation", () => {
    expect(toConfirmedChatDiscoveryRequest({ kind: "proposal", reply: "Ready", categoryCode: "restaurants", city: "Lagos, Nigeria", desiredLeadCount: 5, label: "Lagos restaurants", keywords: ["website", "automation"] })).toEqual({ categoryCode: "restaurants", desiredLeadCount: 5, inputType: "openstreetmap_discovery", label: "Lagos restaurants", rawContent: "", city: "Lagos, Nigeria", keywords: ["website", "automation"] });
  });

  it("does not create a request from a clarification-only response", () => {
    expect(toConfirmedChatDiscoveryRequest({ kind: "clarify", reply: "Which city?", categoryCode: "restaurants", city: null, desiredLeadCount: null, label: null, keywords: [] })).toBeNull();
  });

  it("includes confirmed optional constraints in the API request body", () => {
    const request = toConfirmedChatDiscoveryRequest({ kind: "proposal", reply: "Ready", categoryCode: "real-estate", city: "Abuja, Nigeria", desiredLeadCount: 4, label: "Abuja estate agents", keywords: ["automation", "booking"] });
    expect(request && toLeadRequestBody(request)).toMatchObject({ inputType: "openstreetmap_discovery", geography: { cities: ["Abuja, Nigeria"] }, keywords: ["automation", "booking"] });
  });
});
