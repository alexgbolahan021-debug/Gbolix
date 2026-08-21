import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, Check, Lightbulb, MessageCircle, MousePointer2, Search, Sparkles, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const discoveryExamples = [
  {
    label: "Conversion",
    prompt: "I'm getting people to my website, but nobody is buying.",
    reply: "Let's figure out why. How are people currently finding you, and what do they see first?",
    discovery: "Your visible problem is low conversion. We would investigate your offer, messaging, trust signals, and path to purchase.",
    accent: "#22D3EE",
  },
  {
    label: "Operations",
    prompt: "I spend too much time doing things manually.",
    reply: "Which part of your work takes the most repetitive effort, and what happens when it is delayed?",
    discovery: "The opportunity may be an operations bottleneck. We would map the repeated steps before choosing an automation.",
    accent: "#00FF66",
  },
  {
    label: "MVP idea",
    prompt: "I have an idea for an app but don't know where to start.",
    reply: "Tell me what you want the app to help people do. We can start with the outcome, not the technology.",
    discovery: "The next step is clarifying the user, the core outcome, and the smallest useful version to build first.",
    accent: "#A855F7",
  },
];

const starterPrompts = [
  { label: "Business problems", text: "I don't understand why my sales are dropping.", icon: Search, color: "#22D3EE" },
  { label: "Digital problems", text: "My website isn't doing what I expected.", icon: MousePointer2, color: "#00FF66" },
  { label: "Automation", text: "My team keeps doing the same tasks manually.", icon: Workflow, color: "#A855F7" },
  { label: "Ideas", text: "I have an idea but don't know how to build it.", icon: Lightbulb, color: "#FFB800" },
];

const pathSteps = [
  { number: "01", title: "Tell us what’s happening", body: "Start with the symptom in your own words." },
  { number: "02", title: "We ask the right questions", body: "Discovery follows the situation instead of forcing a form." },
  { number: "03", title: "We identify what may be underneath", body: "We separate the visible issue from the likely bottleneck." },
  { number: "04", title: "We recommend your next step", body: "You leave with a clearer direction—not a random service list." },
];

type DiscoveryAssistantShowcaseProps = {
  onOpenAssistant: (prompt?: string) => void;
};

function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "linear-gradient(135deg, #00FF66 0%, #22D3EE 50%, #A855F7 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      {children}
    </span>
  );
}

function PhoneMockup({ activeIndex, onSelect }: { activeIndex: number; onSelect: (index: number) => void }) {
  const example = discoveryExamples[activeIndex];
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mx-auto w-full max-w-[360px] md:mx-0 md:max-w-[390px]">
      <div className="absolute -inset-8 rounded-[4rem] bg-primary/10 blur-3xl" />
      <div className="absolute -right-5 top-14 h-20 w-20 rounded-full bg-secondary/10 blur-2xl" />
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -8, 0], rotate: [0, 0.5, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="relative mx-auto w-[min(82vw,300px)] rounded-[2.6rem] border-[7px] border-[#202c38] bg-[#070b10] p-2 shadow-[0_32px_90px_rgba(0,0,0,0.55),0_0_60px_rgba(0,255,102,0.12)] md:w-[300px]"
      >
        <div className="absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-[#202c38]" />
        <div className="overflow-hidden rounded-[2.1rem] border border-white/10 bg-[#0b1017]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 pb-3 pt-8 text-[9px] text-slate-500">
            <span>9:41</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Gbolix</span>
          </div>
          <div className="px-4 pb-5 pt-4">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[#07110b]"><Sparkles size={13} /></div>
              <div><p className="text-[8px] font-bold uppercase tracking-[0.16em] text-primary">Gbolix Discovery</p><p className="text-[10px] font-semibold text-white">Let&apos;s find the real problem</p></div>
            </div>
            <div className="mb-3 flex justify-start">
              <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-white/10 bg-[#151e29] px-3 py-2.5 text-[10px] leading-relaxed text-slate-300">Tell me what&apos;s happening. You don&apos;t need to know the solution yet.</div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeIndex}-messages`}
                initial={{ opacity: 0, x: reduceMotion ? 0 : 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduceMotion ? 0 : -16 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-3 flex justify-end"><div className="max-w-[88%] rounded-2xl rounded-br-md px-3 py-2.5 text-[10px] leading-relaxed text-[#07110b]" style={{ background: example.accent }}>{example.prompt}</div></div>
                <div className="flex justify-start"><div className="max-w-[92%] rounded-2xl rounded-bl-md border border-white/10 bg-[#151e29] px-3 py-2.5 text-[10px] leading-relaxed text-slate-300">{example.reply}</div></div>
              </motion.div>
            </AnimatePresence>
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.06] p-3">
              <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.14em] text-primary">What Gbolix discovered</p>
              <AnimatePresence mode="wait">
                <motion.p key={`${activeIndex}-discovery`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="text-[9px] leading-relaxed text-slate-300">{example.discovery}</motion.p>
              </AnimatePresence>
            </div>
            <div className="mt-4 h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[9px] text-slate-600">Tell me what is happening...</div>
          </div>
        </div>
      </motion.div>
      <div className="relative mt-5 flex justify-center gap-2">
        {discoveryExamples.map((item, index) => (
          <button key={item.label} type="button" onClick={() => onSelect(index)} aria-label={`Show ${item.label} example`} className={`h-2 rounded-full transition-all duration-300 ${activeIndex === index ? "w-8" : "w-2 bg-white/20"}`} style={activeIndex === index ? { background: item.accent } : undefined} />
        ))}
      </div>
    </div>
  );
}

export function DiscoveryAssistantShowcase({ onOpenAssistant }: DiscoveryAssistantShowcaseProps) {
  const [activeExample, setActiveExample] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => setActiveExample((current) => (current + 1) % discoveryExamples.length), 6200);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <section className="relative overflow-hidden border-y border-border bg-[#0b1017] px-4 py-28">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-[8%] top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-10 right-[5%] h-72 w-72 rounded-full bg-secondary/5 blur-3xl" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6 }} className="mx-auto mb-16 max-w-2xl text-center">
          <Badge className="mb-4 border-primary/20 bg-primary/10 text-primary">Problem-first by design</Badge>
          <h2 className="mb-5 text-4xl font-bold leading-tight md:text-6xl" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            You don&apos;t need to know the <GradientText>solution.</GradientText>
          </h2>
          <p className="text-base leading-relaxed text-slate-400 md:text-lg">Start with what is happening. Gbolix helps you understand the situation, find what may be holding you back, and decide what to do next.</p>
        </motion.div>

        <div className="mb-28 grid gap-5 md:grid-cols-4">
          {pathSteps.map((step, index) => (
            <motion.div key={step.number} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.5, delay: index * 0.08 }} className="group relative rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-primary/[0.04]">
              <div className="mb-5 flex items-center justify-between"><span className="text-2xl font-bold text-primary/80" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{step.number}</span>{index < pathSteps.length - 1 ? <ArrowRight size={15} className="hidden text-slate-700 md:block" /> : <Check size={16} className="text-primary" />}</div>
              <h3 className="mb-2 text-sm font-semibold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{step.title}</h3>
              <p className="text-xs leading-relaxed text-slate-500">{step.body}</p>
              {index < pathSteps.length - 1 && <ArrowDown size={14} className="mt-4 text-primary/50 md:hidden" />}
            </motion.div>
          ))}
        </div>

        <div className="grid items-center gap-14 lg:grid-cols-[0.85fr_1.15fr]">
          <motion.div initial={{ opacity: 0, x: -25 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6 }}>
            <Badge className="mb-4 border-secondary/20 bg-secondary/10 text-secondary">See Discovery in action</Badge>
            <h2 className="mb-4 text-3xl font-bold md:text-4xl" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Real problems. <GradientText>Better questions.</GradientText></h2>
            <p className="mb-7 max-w-lg text-sm leading-relaxed text-slate-400 md:text-base">This is not a generic “ask me anything” box. Discovery starts from the visible symptom and moves toward a clearer working picture.</p>
            <div className="mb-7 flex flex-wrap gap-2">
              {discoveryExamples.map((example, index) => <button key={example.label} type="button" onClick={() => setActiveExample(index)} className={`rounded-full border px-3 py-2 text-[11px] font-semibold transition-all duration-300 ${activeExample === index ? "border-primary/40 bg-primary/10 text-primary" : "border-white/10 bg-white/[0.03] text-slate-500 hover:border-white/20 hover:text-white"}`}>{example.label}</button>)}
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-primary"><Sparkles size={14} /> The point is not to guess.</div>
              <p className="text-sm leading-relaxed text-slate-300">Gbolix makes the reasoning visible enough to help you decide what to investigate next—without pretending every answer is certain.</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 25 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: 0.1 }}>
            <PhoneMockup activeIndex={activeExample} onSelect={setActiveExample} />
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6 }} className="mt-28 rounded-3xl border border-white/10 bg-gradient-to-br from-card via-card to-primary/[0.06] p-6 md:p-10">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><Badge className="mb-4 border-primary/20 bg-primary/10 text-primary">Start anywhere</Badge><h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "Space Grotesk, sans-serif" }}>What can I talk to <GradientText>Gbolix</GradientText> about?</h2></div><p className="max-w-sm text-sm leading-relaxed text-slate-500">Business problems, digital roadblocks, automation, ideas—or “I don&apos;t even know what&apos;s wrong.”</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {starterPrompts.map((prompt) => {
              const Icon = prompt.icon;
              return <button key={prompt.text} type="button" onClick={() => onOpenAssistant(prompt.text)} className="group rounded-2xl border border-white/10 bg-[#0b1017]/70 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-[#111923]" aria-label={`Start Discovery with: ${prompt.text}`}><div className="mb-5 flex items-center justify-between"><div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ color: prompt.color, background: `${prompt.color}14`, border: `1px solid ${prompt.color}30` }}><Icon size={17} /></div><ArrowRight size={15} className="text-slate-700 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" /></div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: prompt.color }}>{prompt.label}</p><p className="text-sm leading-relaxed text-slate-300">“{prompt.text}”</p></button>;
            })}
          </div>
          <div className="mt-8 text-center"><Button type="button" onClick={() => onOpenAssistant()} className="gap-2 bg-primary font-semibold text-[#07110b] shadow-[0_0_28px_rgba(0,255,102,0.22)] hover:bg-primary/90">Talk to Discovery <MessageCircle size={16} /></Button></div>
        </motion.div>
      </div>
    </section>
  );
}
