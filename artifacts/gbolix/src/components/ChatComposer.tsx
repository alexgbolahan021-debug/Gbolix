import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Mic, Paperclip, Send, Square, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = [
  "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp",
  "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip", "application/x-zip-compressed", "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav",
];

export type ChatDraft = { content: string; file?: File };

type ChatComposerProps = {
  onSend: (draft: ChatDraft) => void;
  onCreateOffer?: () => void;
  disabled?: boolean;
  testId?: string;
  placeholder?: string;
};

function formatRecordingTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function ChatComposer({ onSend, onCreateOffer, disabled = false, testId = "input-message", placeholder = "Type a message..." }: ChatComposerProps) {
  const [message, setMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAttachment = () => {
    setAttachedFile(null);
    setPreviewUrl(current => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const setAttachment = (file: File) => {
    setPreviewUrl(current => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setAttachedFile(file);
  };

  useEffect(() => () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const validateFile = (file: File, imageOnly = false) => {
    if (imageOnly && !file.type.startsWith("image/")) { alert("Please select an image."); return false; }
    if (!imageOnly && !ALLOWED_MIME.includes(file.type)) { alert("Unsupported file type. Allowed: photos, PDF, DOCX, ZIP and voice notes."); return false; }
    if (file.size > MAX_ATTACHMENT_SIZE) { alert(`${imageOnly ? "Photo" : "File"} too large. Maximum 10MB`); return false; }
    return true;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, imageOnly = false) => {
    const file = event.target.files?.[0];
    if (file && validateFile(file, imageOnly)) setAttachment(file);
  };

  const cleanupRecorder = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    setRecording(false);
    setRecordingSeconds(0);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { alert("Voice recording is not supported by this browser."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find(type => MediaRecorder.isTypeSupported(type)) ?? "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordingChunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size > 0) recordingChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const actualType = recorder.mimeType || mimeType || "audio/webm";
        const extension = actualType.includes("ogg") ? "ogg" : actualType.includes("mp4") ? "m4a" : "webm";
        const blob = new Blob(recordingChunksRef.current, { type: actualType });
        if (blob.size > MAX_ATTACHMENT_SIZE) alert("Voice note is too large. Maximum 10MB");
        else setAttachment(new File([blob], `voice-note-${Date.now()}.${extension}`, { type: actualType.split(";")[0] }));
        cleanupRecorder();
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(value => value + 1), 1000);
    } catch (error) {
      console.error("[ChatComposer] microphone permission failed", error);
      alert("Microphone permission is required to record a voice note.");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop(); else cleanupRecorder();
  };

  useEffect(() => () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const send = () => {
    const content = message.trim();
    if (disabled || recording || (!content && !attachedFile)) return;
    onSend({ content, file: attachedFile ?? undefined });
    setMessage("");
    clearAttachment();
  };

  const hasSendableContent = Boolean(message.trim() || attachedFile);

  return (
    <div className="p-3 md:p-4">
      <div className="mx-auto max-w-3xl">
        <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.zip,.png,.jpg,.jpeg,.gif,.webp,audio/*" onChange={event => handleFileChange(event)} />
        <input ref={photoInputRef} type="file" className="hidden" accept="image/*" onChange={event => handleFileChange(event, true)} />
        {attachedFile && <div className="mb-2 flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-xs shadow-sm">
          {attachedFile.type.startsWith("image/") ? <img src={previewUrl} alt="Attachment preview" className="h-10 w-10 rounded-lg object-cover" /> : attachedFile.type.startsWith("audio/") ? <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Mic size={16} /></div> : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><FileText size={16} /></div>}
          <div className="min-w-0 flex-1"><p className="truncate font-medium">{attachedFile.name}</p><p className="text-[10px] text-muted-foreground">{(attachedFile.size / 1024).toFixed(0)} KB · Ready to send</p></div>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent" onClick={clearAttachment} aria-label="Remove attachment"><X size={14} /></button>
        </div>}
        <div className={`flex items-center gap-2 rounded-2xl border px-2 py-2 transition-all ${recording ? "border-destructive/50 bg-destructive/5" : "border-border bg-background"}`}>
          <Button type="button" variant="ghost" size="sm" className="h-9 w-9 shrink-0 rounded-xl p-0" onClick={() => photoInputRef.current?.click()} disabled={disabled || recording} title="Send photo" aria-label="Send photo"><ImageIcon size={17} /></Button>
          <Button type="button" variant="ghost" size="sm" className="h-9 w-9 shrink-0 rounded-xl p-0" onClick={() => fileInputRef.current?.click()} disabled={disabled || recording} title="Attach file" aria-label="Attach file"><Paperclip size={17} /></Button>
          {onCreateOffer && <Button type="button" variant="ghost" size="sm" className="hidden h-9 shrink-0 gap-1 rounded-xl px-2 sm:flex" onClick={onCreateOffer} disabled={disabled || recording} title="Create offer">Offer</Button>}
          {recording ? <div className="flex flex-1 items-center gap-2 px-2"><span className="h-2 w-2 animate-pulse rounded-full bg-destructive" /><span className="text-sm font-medium text-destructive">Recording voice note</span><span className="ml-auto text-xs text-muted-foreground">{formatRecordingTime(recordingSeconds)}</span></div> : <Input value={message} onChange={event => setMessage(event.target.value)} placeholder={placeholder} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} className="min-w-0 flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0" data-testid={testId} disabled={disabled} />}
          {recording ? <Button type="button" onClick={stopRecording} className="h-9 w-9 shrink-0 rounded-xl bg-destructive p-0 text-destructive-foreground hover:bg-destructive/90" title="Stop recording" aria-label="Stop recording"><Square size={14} fill="currentColor" /></Button> : hasSendableContent ? <Button type="button" onClick={send} disabled={disabled} className="h-9 w-9 shrink-0 rounded-xl bg-primary p-0 text-primary-foreground hover:bg-primary/90" data-testid="button-send-message" title="Send message" aria-label="Send message"><Send size={14} /></Button> : <Button type="button" onClick={startRecording} disabled={disabled} className="h-9 w-9 shrink-0 rounded-xl bg-primary/10 p-0 text-primary hover:bg-primary/20" title="Record voice note" aria-label="Record voice note"><Mic size={17} /></Button>}
        </div>
        <p className="mt-2 text-center text-[9px] text-muted-foreground">Photos and files up to 10MB · Voice notes are recorded in your browser</p>
      </div>
    </div>
  );
}
