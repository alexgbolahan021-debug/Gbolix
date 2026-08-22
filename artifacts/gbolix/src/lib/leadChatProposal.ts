export type LeadChatProposal = {
  kind: "proposal" | "clarify";
  reply: string;
  categoryCode: "restaurants" | "real-estate" | null;
  city: string | null;
  desiredLeadCount: number | null;
  label: string | null;
  keywords: string[];
};

export type ConfirmedChatDiscoveryRequest = {
  categoryCode: "restaurants" | "real-estate";
  desiredLeadCount: number;
  inputType: "openstreetmap_discovery";
  label: string;
  rawContent: "";
  city: string;
  keywords: string[];
};

export function toLeadRequestBody(request: ConfirmedChatDiscoveryRequest) {
  return { categoryCode: request.categoryCode, desiredLeadCount: request.desiredLeadCount, inputType: request.inputType, label: request.label, rawContent: request.rawContent, geography: { cities: [request.city] }, keywords: request.keywords };
}

export function toConfirmedChatDiscoveryRequest(proposal: LeadChatProposal): ConfirmedChatDiscoveryRequest | null {
  if (proposal.kind !== "proposal" || !proposal.categoryCode || !proposal.city || !proposal.desiredLeadCount || !proposal.label) return null;
  return { categoryCode: proposal.categoryCode, desiredLeadCount: Math.min(Math.max(1, proposal.desiredLeadCount), 25), inputType: "openstreetmap_discovery", label: proposal.label, rawContent: "", city: proposal.city, keywords: proposal.keywords.slice(0, 8) };
}
