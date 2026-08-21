import { MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DiscoveryAssistantChatCard } from "./DiscoveryAssistantChatCard";

export const DISCOVERY_ASSISTANT_URL = "https://gbolix-discovery-assistant.vercel.app/";

type DiscoveryAssistantDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DiscoveryAssistantDialog({ open, onOpenChange }: DiscoveryAssistantDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(88vh,780px)] w-[calc(100%-1rem)] max-w-5xl flex-col gap-0 overflow-hidden border-white/10 bg-[#0b1017] p-0 shadow-[0_0_100px_rgba(0,255,102,0.14)] sm:w-[calc(100%-2rem)] sm:rounded-3xl">
        <DialogTitle className="sr-only">Gbolix Discovery Assistant</DialogTitle>
        <DialogDescription className="sr-only">A focused conversation card to help identify the visitor&apos;s business or digital problem.</DialogDescription>
        <DiscoveryAssistantChatCard />
      </DialogContent>
    </Dialog>
  );
}

type DiscoveryAssistantFloatingButtonProps = {
  onClick: () => void;
  hidden?: boolean;
};

export function DiscoveryAssistantFloatingButton({ onClick, hidden = false }: DiscoveryAssistantFloatingButtonProps) {
  if (hidden) return null;

  return (
    <Button
      type="button"
      onClick={onClick}
      aria-label="Talk to Gbolix"
      title="Talk to Gbolix"
      className="fixed bottom-5 right-5 z-40 h-12 gap-2 rounded-full border border-primary/30 bg-[#10161f]/95 px-4 text-xs font-semibold text-white shadow-[0_12px_35px_rgba(0,0,0,0.35),0_0_28px_rgba(0,255,102,0.16)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-[#17212d] hover:shadow-[0_16px_40px_rgba(0,0,0,0.4),0_0_34px_rgba(0,255,102,0.25)] sm:bottom-7 sm:right-7"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[#0B0F14]">
        <MessageCircle size={14} fill="currentColor" />
      </span>
      Talk to Gbolix
    </Button>
  );
}

export function DiscoveryAssistantHeroButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      size="lg"
      className="group h-auto min-h-14 gap-3 rounded-2xl border border-primary/35 bg-[#0B0F14]/75 px-5 py-3 text-left text-white shadow-[0_0_34px_rgba(0,255,102,0.16)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/70 hover:bg-[#101a1b] hover:shadow-[0_0_42px_rgba(0,255,102,0.28)] sm:min-w-[340px]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-[#0B0F14]">
        <MessageCircle size={18} fill="currentColor" />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Problem Discovery</span>
        <span className="text-sm font-semibold">Tell us what’s happening</span>
      </span>
      <span className="text-lg text-primary transition-transform duration-300 group-hover:translate-x-1">→</span>
    </Button>
  );
}
