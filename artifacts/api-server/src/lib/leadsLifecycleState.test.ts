import { describe, expect, it } from "vitest";
import { statusAfterSuccessfulLeadDispatch, statusAfterUsageFinalized } from "./leadsLifecycleState";

describe("Leads request lifecycle state", () => {
  it("moves a queued request to running after an accepted asynchronous dispatch", () => {
    expect(statusAfterSuccessfulLeadDispatch("queued")).toBe("running");
  });

  it("does not overwrite a terminal callback state when synchronous dispatch returns", () => {
    expect(statusAfterSuccessfulLeadDispatch("completed")).toBe("completed");
    expect(statusAfterSuccessfulLeadDispatch("failed")).toBe("failed");
  });

  it("reconciles a finalized usage event to the completed state", () => {
    expect(statusAfterUsageFinalized("running")).toBe("completed");
    expect(statusAfterUsageFinalized("completed")).toBe("completed");
  });
});
