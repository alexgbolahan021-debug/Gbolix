import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Check, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const ASSISTANT_API_URL = "https://gbolix-discovery-assistant.vercel.app";

const welcomeMessage = {
  id: "welcome",
  role: "assistant" as const,
  content: "I’m here to help you understand what may be getting in the way. Tell me what is happening in your business or digital work — in your own words. You do not need to know the solution yet.",
};

const suggestions = [
  "Something in my operations is too manual",
  "My website is not bringing enough customers",
  "I need help launching an MVP",
];

const stages = ["Understand", "Investigate", "Clarify", "Identify", "Recommend"];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AnalysisResult = {
  what_i_understand: string;
  possible_problem: string;
  why_i_think_that: string;
  investigate_next: string[];
  confidence: "low" | "medium" | "high";
  gbolix_relevance: "relevant" | "possibly_relevant" | "not_currently_relevant" | "unclear";
  safety_note: string;
};

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getAnonymousId() {
  const key = "gbolix-anonymous-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const value = makeId();
  window.localStorage.setItem(key, value);
  return value;
}

function apiUrl(path: string) {
  return `${ASSISTANT_API_URL}${path}`;
}

export function DiscoveryAssistantChatCard() {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [storageConsent, setStorageConsent] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const userTurns = messages.filter((message) => message.role === "user").length;
  const stageIndex = useMemo(() => Math.min(4, Math.max(0, userTurns - 1)), [userTurns]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, analysis]);

  async function persist(snapshot = messages, snapshotAnalysis = analysis) {
    if (!storageConsent || snapshot.length < 2) return;
    try {
      const response = await fetch(apiUrl("/api/session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymousId: getAnonymousId(),
          conversationId,
          storageConsent,
          messages: snapshot,
          analysis: snapshotAnalysis,
        }),
      });
      const data = await response.json();
      if (data.conversationId) setConversationId(data.conversationId);
    } catch {
      // Continuity should never interrupt the visitor's discovery conversation.
    }
  }

  async function sendMessage(value = input) {
    const content = value.trim();
    if (!content || isStreaming) return;
    setInput("");
    setError("");
    setAnalysis(null);

    const userMessage: ChatMessage = { id: makeId(), role: "user", content };
    const assistantMessage: ChatMessage = { id: makeId(), role: "assistant", content: "" };
    const nextMessages = [...messages, userMessage, assistantMessage];
    setMessages(nextMessages);
    setIsStreaming(true);

    try {
      const response = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "The assistant could not respond right now.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(chunk, { stream: true });
        setMessages((current) => current.map((message) => message.id === assistantMessage.id ? { ...message, content: assistantContent } : message));
      }
      assistantContent += decoder.decode();
      if (!assistantContent.trim()) throw new Error("The assistant returned an empty response. Please try again.");
      const completedMessages = nextMessages.map((message) => message.id === assistantMessage.id ? { ...message, content: assistantContent } : message);
      setMessages(completedMessages);
      window.setTimeout(() => void persist(completedMessages), 0);
    } catch (caught) {
      setMessages((current) => current.filter((message) => message.id !== assistantMessage.id));
      setError(caught instanceof Error ? caught.message : "The assistant could not respond right now.");
    } finally {
      setIsStreaming(false);
    }
  }

  async function createAnalysis() {
    if (userTurns < 2 || isStreaming || isAnalyzing) return;
    setError("");
    setIsAnalyzing(true);
    try {
      const response = await fetch(apiUrl("/api/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "The working picture could not be created.");
      setAnalysis(data.analysis);
      window.setTimeout(() => void persist(messages, data.analysis), 0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The working picture could not be created.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function restart() {
    setMessages([{ ...welcomeMessage, id: makeId() }]);
    setInput("");
    setError("");
    setAnalysis(null);
    setConversationId(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0b1017] text-white">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#111923] px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-[#07110b] shadow-[0_0_24px_rgba(0,255,102,0.24)]"><Sparkles size={17} /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Gbolix Discovery</p>
            <h2 className="text-base font-semibold text-white">Let&apos;s find the real problem</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 sm:text-xs"><span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(0,255,102,0.8)]" /> Available for discovery</div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6" aria-live="polite">
            <div className="mb-5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500"><span>Conversation</span><span>{userTurns === 0 ? "Start here" : `${userTurns} ${userTurns === 1 ? "message" : "messages"}`}</span></div>
            <div className="space-y-5">
              {messages.map((message) => (
                <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`} key={message.id}>
                  <div className={`max-w-[92%] sm:max-w-[78%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{message.role === "assistant" ? "Gbolix" : "You"}</p>
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === "user" ? "rounded-br-md bg-primary text-[#07110b] shadow-[0_8px_24px_rgba(0,255,102,0.12)]" : "rounded-bl-md border border-white/10 bg-[#151e29] text-slate-200"}`}>
                      {message.content || <span className="inline-flex gap-1" aria-label="Assistant is thinking"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:120ms]" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:240ms]" /></span>}
                    </div>
                  </div>
                </div>
              ))}
              {analysis && (
                <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 sm:p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-white">Your working picture</p><span className="rounded-full border border-primary/20 px-2 py-1 text-[10px] uppercase tracking-wider text-primary">{analysis.confidence} confidence</span></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">What I understand</p><p className="text-xs leading-relaxed text-slate-300">{analysis.what_i_understand}</p></div>
                    <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">Possible problem</p><p className="text-xs leading-relaxed text-slate-300">{analysis.possible_problem}</p></div>
                    <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">Why I think that</p><p className="text-xs leading-relaxed text-slate-300">{analysis.why_i_think_that}</p></div>
                    <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">Investigate next</p><ul className="space-y-1 text-xs leading-relaxed text-slate-300">{analysis.investigate_next.map((item) => <li className="flex gap-2" key={item}><span className="text-primary">•</span>{item}</li>)}</ul></div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          <div className="shrink-0 border-t border-white/10 bg-[#0f171f] px-5 py-4 sm:px-7">
            {error && <div className="mb-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-200" role="alert">{error}</div>}
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {suggestions.map((suggestion) => <button className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-left text-[11px] text-slate-400 transition hover:border-primary/30 hover:text-primary disabled:opacity-50" key={suggestion} onClick={() => void sendMessage(suggestion)} disabled={isStreaming}>{suggestion}</button>)}
            </div>
            <form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
              <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Tell me what is happening..." aria-label="Describe your problem" disabled={isStreaming} className="min-h-12 max-h-28 flex-1 resize-none rounded-xl border border-white/10 bg-[#0b1017] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-primary/50" />
              <Button type="submit" aria-label="Send message" disabled={!input.trim() || isStreaming} className="h-12 w-12 shrink-0 rounded-xl bg-primary p-0 text-[#07110b] hover:bg-primary/90"><ArrowUp size={18} /></Button>
            </form>
            <p className="mt-2 text-[10px] text-slate-600">Please do not share passwords, API keys, payment details, or other secrets.</p>
          </div>
        </div>

        <aside className="hidden w-64 shrink-0 border-l border-white/10 bg-[#101821] p-5 lg:flex lg:flex-col">
          <div className="mb-7"><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Discovery path</p><p className="text-xs leading-relaxed text-slate-400">We will move from the visible symptom toward a clearer next step.</p></div>
          <ol className="space-y-3">
            {stages.map((stage, index) => <li className={`flex items-center gap-3 text-xs ${index <= stageIndex ? "text-white" : "text-slate-600"}`} key={stage}><span className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold ${index <= stageIndex ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10"}`}>{index < stageIndex ? <Check size={12} /> : `0${index + 1}`}</span>{stage}</li>)}
          </ol>
          <div className="mt-auto space-y-3 border-t border-white/10 pt-5">
            <label className="flex gap-2 text-[10px] leading-relaxed text-slate-500"><input type="checkbox" checked={storageConsent} onChange={(event) => setStorageConsent(event.target.checked)} className="mt-0.5 accent-[#00ff66]" /> <span>Allow Gbolix to store this anonymous conversation for continuity and product improvement. Sessions expire after 90 days.</span></label>
            <Button onClick={() => void createAnalysis()} disabled={userTurns < 2 || isStreaming || isAnalyzing} className="w-full bg-primary text-xs font-semibold text-[#07110b] hover:bg-primary/90">{isAnalyzing ? "Building picture…" : "Create working picture"}</Button>
            <Button onClick={restart} variant="ghost" className="w-full gap-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white"><RotateCcw size={13} /> Start over</Button>
          </div>
        </aside>

        <div className="border-t border-white/10 bg-[#101821] px-5 py-3 lg:hidden">
          <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-primary">Step {String(stageIndex + 1).padStart(2, "0")} of 05</span><span className="text-[10px] text-slate-500">{stages[stageIndex]}</span></div>
          <div className="mb-3 flex gap-1">{stages.map((stage, index) => <span className={`h-1 flex-1 rounded-full ${index <= stageIndex ? "bg-primary" : "bg-white/10"}`} key={stage} />)}</div>
          <div className="flex items-center gap-2"><label className="flex min-w-0 flex-1 gap-2 text-[10px] leading-relaxed text-slate-500"><input type="checkbox" checked={storageConsent} onChange={(event) => setStorageConsent(event.target.checked)} className="mt-0.5 accent-[#00ff66]" /> <span>Store this anonymous conversation for continuity.</span></label><Button onClick={() => void createAnalysis()} disabled={userTurns < 2 || isStreaming || isAnalyzing} size="sm" className="shrink-0 bg-primary text-[10px] text-[#07110b]">{isAnalyzing ? "…" : "Working picture"}</Button><Button onClick={restart} variant="ghost" size="icon" className="shrink-0 text-slate-400"><RotateCcw size={14} /></Button></div>
        </div>
      </div>
    </div>
  );
}
