export type LeadChatProposal = {
  kind: "proposal" | "clarify";
  reply: string;
  categoryCode: "restaurants" | "real-estate" | null;
  city: string | null;
  desiredLeadCount: number | null;
  label: string | null;
  keywords: string[];
};

const proposalSchema = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["proposal", "clarify"] },
    reply: { type: "string" },
    categoryCode: { type: ["string", "null"], enum: ["restaurants", "real-estate", null] },
    city: { type: ["string", "null"] },
    desiredLeadCount: { type: ["integer", "null"], minimum: 1, maximum: 25 },
    label: { type: ["string", "null"] },
    keywords: { type: "array", items: { type: "string" }, maxItems: 8 },
  },
  required: ["kind", "reply", "categoryCode", "city", "desiredLeadCount", "label", "keywords"],
  additionalProperties: false,
};

function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeLeadChatProposal(value: unknown): LeadChatProposal {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const categoryCode = candidate.categoryCode === "restaurants" || candidate.categoryCode === "real-estate" ? candidate.categoryCode : null;
  const city = asNonEmptyString(candidate.city);
  const rawCount = Number(candidate.desiredLeadCount);
  const desiredLeadCount = Number.isInteger(rawCount) && rawCount >= 1 ? Math.min(rawCount, 25) : null;
  const label = asNonEmptyString(candidate.label);
  const keywords = Array.isArray(candidate.keywords) ? candidate.keywords.filter((item): item is string => typeof item === "string").map(item => item.trim()).filter(Boolean).slice(0, 8) : [];
  const complete = Boolean(categoryCode && city && desiredLeadCount && label);
  return {
    kind: complete ? "proposal" : "clarify",
    reply: asNonEmptyString(candidate.reply) ?? (complete ? "I have prepared a small discovery proposal for you to review." : "Which city, business type, and number of leads would you like?"),
    categoryCode,
    city,
    desiredLeadCount,
    label,
    keywords,
  };
}

export async function planLeadChatRequest(message: string): Promise<LeadChatProposal> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  if (!apiKey) throw new Error("AI_REQUEST_ASSISTANT_NOT_CONFIGURED");
  const prompt = [
    "You are Gbolix Leads' request planner. Convert the customer message into a proposed, confirmation-only lead discovery job.",
    "Supported discovery categories are restaurants and real-estate. This is a strictly limited OpenStreetMap pilot: use one city, never propose more than 25 leads, and do not claim that any leads have been found.",
    "If the request is missing a city, supported category, or target count, ask one concise clarification question. Do not guess location. If no count is given, choose 5 only when city and category are explicit. Extract up to eight optional, customer-stated needs as short keywords, such as website, automation, booking, or outreach. Do not invent constraints.",
    "The customer must review and confirm the proposed maximum credit reservation before any job is run. Never dispatch, purchase, or reserve anything yourself.",
    `Customer message: ${message}`,
  ].join("\n\n");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: proposalSchema, temperature: 0.1, maxOutputTokens: 450 },
    }),
  });
  if (!response.ok) throw new Error(`AI_REQUEST_ASSISTANT_FAILED_${response.status}`);
  const body = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("AI_REQUEST_ASSISTANT_EMPTY_RESPONSE");
  return normalizeLeadChatProposal(JSON.parse(text));
}
