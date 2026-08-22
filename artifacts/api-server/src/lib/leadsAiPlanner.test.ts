import { describe, expect, it } from "vitest";
import { normalizeLeadChatProposal } from "./leadsAiPlanner";

describe("AI lead-request planner safeguards", () => {
  it("keeps a complete supported request as a confirmation-only proposal and clamps it to the pilot cap", () => {
    expect(normalizeLeadChatProposal({ kind: "proposal", reply: "Ready", categoryCode: "restaurants", city: "Lagos, Nigeria", desiredLeadCount: 99, label: "Lagos restaurants", keywords: ["website", "automation"] })).toEqual({ kind: "proposal", reply: "Ready", categoryCode: "restaurants", city: "Lagos, Nigeria", desiredLeadCount: 25, label: "Lagos restaurants", keywords: ["website", "automation"] });
  });

  it("requires clarification when the model response lacks a supported category or location", () => {
    expect(normalizeLeadChatProposal({ kind: "proposal", reply: "I need more information", categoryCode: "salons", city: null, desiredLeadCount: 5, label: null, keywords: ["booking"] })).toMatchObject({ kind: "clarify", categoryCode: null, city: null, desiredLeadCount: 5, keywords: ["booking"] });
  });
});
