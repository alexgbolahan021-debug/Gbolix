import { ExternalLink, FileText, Download, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VoiceNotePlayer } from "@/components/VoiceNotePlayer";
import type { ChatMessage } from "@/components/chat-types";

function mediaUrl(message: ChatMessage) {
  return message.localFileUrl || message.fileUrl || "";
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "just now" : formatDistanceToNow(date, { addSuffix: true });
}

function MessageMedia({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const url = mediaUrl(message);
  if (!url || !message.fileName) return null;
  const mimeType = message.fileMimeType || message.localFile?.type || "application/octet-stream";
  const frameClass = isOwn ? "border-white/15 bg-black/10" : "border-border bg-background/70";

  if (mimeType.startsWith("image/")) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block overflow-hidden rounded-xl border border-white/10">
        <img src={url} alt={message.fileName} className="block max-h-72 w-full max-w-[320px] object-cover" />
      </a>
    );
  }

  if (mimeType.startsWith("audio/")) {
    return <VoiceNotePlayer url={url} name={message.fileName} tone={isOwn ? "dark" : "light"} />;
  }

  return (
    <div className={`mt-2 flex max-w-[320px] items-center gap-2.5 rounded-xl border px-3 py-2.5 ${frameClass}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText size={17} /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{message.fileName}</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wide opacity-65">{mimeType.split("/").pop() || "file"}</p>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" download={message.fileName} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/70 text-foreground transition hover:bg-background" aria-label={`Open ${message.fileName}`} title="Open or download file">
        <Download size={14} />
      </a>
    </div>
  );
}

export function MessageBubble({ message, isOwn, showSender = false, onRetry }: { message: ChatMessage; isOwn: boolean; showSender?: boolean; onRetry?: () => void }) {
  const status = message.optimisticStatus;
  const bubbleClass = isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border text-card-foreground rounded-bl-md";
  const roleLabel = message.senderRole === "client" ? "Client" : message.senderRole === "owner" ? "Owner" : message.senderRole === "admin" ? "Admin" : "Freelancer";

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`} data-testid={`message-${message.id}`}>
      <div className={`flex max-w-[90%] flex-col gap-1 md:max-w-[76%] ${isOwn ? "items-end" : "items-start"}`}>
        {showSender && !isOwn && <div className="mb-0.5 flex items-center gap-1.5"><span className="text-xs font-medium text-muted-foreground">{message.senderName}</span><Badge className="h-4 border-0 bg-muted/10 text-[9px] text-muted-foreground">{roleLabel}</Badge></div>}
        <div className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${bubbleClass} ${status === "failed" ? "ring-1 ring-destructive/60" : ""}`}>
          {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
          <MessageMedia message={message} isOwn={isOwn} />
          {!message.content && !message.fileName && <p className="text-xs opacity-70">Empty message</p>}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>{formatMessageTime(message.createdAt)}</span>
          {isOwn && status === "sending" && <span>· Sending…</span>}
          {isOwn && status === "failed" && <><span className="text-destructive">· Failed</span>{onRetry && <Button type="button" variant="ghost" size="sm" onClick={onRetry} className="h-5 gap-1 px-1.5 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive"><RotateCcw size={11} /> Retry</Button>}</>}
          {isOwn && !status && <span>· {message.isRead ? "Read" : "Sent"}</span>}
          {!isOwn && message.fileUrl && <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-foreground"><ExternalLink size={10} /> Open</a>}
        </div>
      </div>
    </div>
  );
}
