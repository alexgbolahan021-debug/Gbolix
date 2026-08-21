import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiscoveryAssistantDialog, DiscoveryAssistantFloatingButton } from "./DiscoveryAssistantLauncher";

type DiscoveryAssistantContextBlockProps = {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  buttonLabel: string;
  floatingLabel: string;
  prompt?: string;
  tone?: "green" | "purple";
};

export function DiscoveryAssistantContextBlock({ eyebrow, title, description, buttonLabel, floatingLabel, prompt = "", tone = "green" }: DiscoveryAssistantContextBlockProps) {
  const [open, setOpen] = useState(false);
  const accent = tone === "purple" ? "#A855F7" : "#00FF66";

  return (
    <>
      <section className="relative overflow-hidden border-y border-border bg-[#0b1017] px-4 py-16">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -left-16 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full blur-3xl" style={{ background: `${accent}12` }} />
          <div className="absolute right-[8%] top-8 h-24 w-24 rounded-full border" style={{ borderColor: `${accent}24`, animation: "orb-float-3 7s ease-in-out infinite" }} />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}><Sparkles size={13} /> {eyebrow}</div>
            <h2 className="mb-3 text-3xl font-bold leading-tight md:text-4xl" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{title}</h2>
            <p className="max-w-xl text-sm leading-relaxed text-slate-400 md:text-base">{description}</p>
          </div>
          <Button type="button" onClick={() => setOpen(true)} className="group shrink-0 gap-2 font-semibold text-[#07110b]" style={{ background: accent, boxShadow: `0 0 28px ${accent}28` }}>
            {buttonLabel} <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
          </Button>
        </div>
      </section>
      <DiscoveryAssistantDialog open={open} onOpenChange={setOpen} initialPrompt={prompt} />
      <DiscoveryAssistantFloatingButton onClick={() => setOpen(true)} hidden={open} label={floatingLabel} />
    </>
  );
}
