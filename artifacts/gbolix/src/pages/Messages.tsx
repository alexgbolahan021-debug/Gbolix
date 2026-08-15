import { useState, useRef, useEffect } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useListProjects, useListMessages, useSendMessage, useMarkMessagesRead, useGetMe, customFetch } from "@workspace/api-client-react";
import { getListProjectsQueryKey, getListMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, MessageSquare, Paperclip, Image as ImageIcon, Mic, Square, X, FileText, Download, ArrowLeft, FileSignature, Phone, Crown } from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { OfferCard, type Offer } from "@/components/OfferCard";

function fileToBase64(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => { const result = reader.result as string; resolve(result.split(",")[1]); }; reader.onerror = reject; }); }

const ALLOWED_MIME = [
  "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp",
  "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip", "application/x-zip-compressed", "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav",
];

function FilePreview({ url, name, mimeType }: { url: string; name: string; mimeType?: string | null }) {
  if (mimeType?.startsWith("image/")) return <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2"><img src={url} alt={name} className="max-w-64 max-h-64 rounded-xl object-cover border border-white/10 shadow-sm" /></a>;
  if (mimeType?.startsWith("audio/")) return <div className="mt-2 rounded-xl bg-background/30 border border-white/10 px-3 py-2"><audio controls preload="metadata" src={url} className="w-full max-w-64" /></div>;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-2 bg-background border border-border rounded-xl px-3 py-2.5 text-xs hover:border-primary/30 transition-all max-w-64"><FileText size={14} className="text-muted-foreground shrink-0" /><span className="truncate">{name}</span><Download size={12} className="text-muted-foreground shrink-0 ml-auto" /></a>;
}

function formatThreadTime(value: string | null | undefined) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; if (isToday(date)) return format(date, "p"); if (isYesterday(date)) return "Yesterday"; return format(date, "MMM d"); }
function formatThreadPreview(value: string | null | undefined) { const text = value?.trim(); if (!text) return "No messages yet"; return text.length > 62 ? `${text.slice(0, 62)}…` : text; }

export default function Messages() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [offerDialog, setOfferDialog] = useState(false);
  const [offerServiceType, setOfferServiceType] = useState("");
  const [offerServiceName, setOfferServiceName] = useState("");
  const [offerScope, setOfferScope] = useState("");
  const [offerRequirements, setOfferRequirements] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerDelivery, setOfferDelivery] = useState("");
  const [offerTerms, setOfferTerms] = useState("");
  const [offerSaving, setOfferSaving] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerLoadError, setOfferLoadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();
  const { data: projects } = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });

  const projectsWithConversation = [...(projects?.filter(p => p.hasConversation) ?? [])].sort((a, b) => {
    const aTime = new Date((a as any).latestMessageAt ?? a.createdAt).getTime();
    const bTime = new Date((b as any).latestMessageAt ?? b.createdAt).getTime();
    return bTime - aTime;
  });
  const { data: messages, isLoading: messagesLoading } = useListMessages(selectedProjectId ?? 0, { query: { enabled: !!selectedProjectId, queryKey: getListMessagesQueryKey(selectedProjectId ?? 0) } });
  const sendMutation = useSendMessage();
  const markReadMutation = useMarkMessagesRead();

  const loadOffers = async (projectId: number) => { try { setOfferLoadError(null); const data = await customFetch<Offer[]>(`/api/projects/${projectId}/offers`, { responseType: "json" }); setOffers(Array.isArray(data) ? data.filter(o => o.status !== "draft") : []); } catch (error) { console.error("[Messages] failed to load offers", { projectId, error }); setOffers([]); setOfferLoadError(error instanceof Error ? error.message : "Unable to load offers"); } };
  useEffect(() => { if (selectedProjectId) loadOffers(selectedProjectId); else { setOffers([]); setOfferLoadError(null); } }, [selectedProjectId]);
  useEffect(() => { if (!selectedProjectId || !messages?.length) return; markReadMutation.mutate({ projectId: selectedProjectId }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() }) }); }, [selectedProjectId, messages?.length]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, offers]);

  const clearRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    setRecording(false);
    setRecordingSeconds(0);
  };

  useEffect(() => () => clearRecording(), []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_MIME.includes(file.type)) { alert("Unsupported file type. Allowed: photos, PDF, DOCX, ZIP and voice notes."); return; }
    if (file.size > 10 * 1024 * 1024) { alert("File too large. Maximum 10MB"); return; }
    setAttachedFile(file);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select an image."); return; }
    if (file.size > 10 * 1024 * 1024) { alert("Photo too large. Maximum 10MB"); return; }
    setAttachedFile(file);
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
        if (blob.size > 10 * 1024 * 1024) { alert("Voice note is too large. Maximum 10MB"); clearRecording(); return; }
        setAttachedFile(new File([blob], `voice-note-${Date.now()}.${extension}`, { type: actualType.split(";")[0] }));
        clearRecording();
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(value => value + 1), 1000);
    } catch (error) {
      console.error("[Messages] microphone permission failed", error);
      alert("Microphone permission is required to record a voice note.");
    }
  };

  const stopRecording = () => { const recorder = mediaRecorderRef.current; if (recorder && recorder.state !== "inactive") recorder.stop(); else clearRecording(); };
  const formatRecordingTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const handleSend = async () => {
    if ((!message.trim() && !attachedFile) || !selectedProjectId || recording) return;
    let fileData: string | undefined; let fileName: string | undefined; let fileMimeType: string | undefined;
    if (attachedFile) { fileData = await fileToBase64(attachedFile); fileName = attachedFile.name; fileMimeType = attachedFile.type; }
    sendMutation.mutate({ projectId: selectedProjectId, data: { content: message.trim(), fileData, fileName, fileMimeType } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(selectedProjectId) }); queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() }); setMessage(""); setAttachedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; if (photoInputRef.current) photoInputRef.current.value = ""; } });
  };

  const selectedProject = projects?.find(p => p.id === selectedProjectId);
  const isOwner = me?.role === "owner" || me?.role === "admin";
  const openOffer = () => { if (!selectedProject) return; setOfferServiceType(selectedProject.serviceType ?? ""); setOfferServiceName(selectedProject.title ?? ""); setOfferScope(selectedProject.description ?? ""); const req = selectedProject.requirements; setOfferRequirements(req && typeof req === "object" ? Object.entries(req).filter(([k]) => k !== "attached_files").map(([k,v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join("\n") : req ? String(req) : ""); setOfferPrice(selectedProject.price != null ? String(selectedProject.price) : ""); setOfferDelivery(""); setOfferTerms(""); setOfferDialog(true); };
  const sendOffer = async () => { if (!selectedProjectId || !offerServiceType.trim() || !offerServiceName.trim() || !offerScope.trim() || !offerPrice.trim()) { alert("Service, project, scope and price are required."); return; } setOfferSaving(true); try { await customFetch<{ offer: Offer }>(`/api/projects/${selectedProjectId}/offers`, { method: "POST", headers: { "Content-Type": "application/json" }, responseType: "json", body: JSON.stringify({ serviceType: offerServiceType.trim(), serviceName: offerServiceName.trim(), scope: offerScope.trim(), requirements: offerRequirements.trim() || undefined, price: offerPrice.trim(), deliveryEstimate: offerDelivery.trim() || undefined, terms: offerTerms.trim() || undefined, send: true }) }); setOfferDialog(false); await loadOffers(selectedProjectId); queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(selectedProjectId) }); queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() }); } catch (error) { alert(error instanceof Error ? error.message : "Unable to send offer"); } finally { setOfferSaving(false); } };
  const roleColor = (role: string) => role === "owner" || role === "admin" ? "text-primary" : role === "freelancer" ? "text-blue-400" : "text-muted-foreground";
  const roleBadgeText = (role: string) => role === "owner" ? "Owner" : role === "admin" ? "Admin" : role === "freelancer" ? "Freelancer" : null;
  const handleOfferChanged = async (updated: Offer, nextStep?: string) => { setOffers(current => current.map(o => o.id === updated.id ? updated : o)); if (selectedProjectId) { await loadOffers(selectedProjectId); queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(selectedProjectId) }); queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() }); } if (nextStep === "payment") alert("Offer accepted. Payment is the next step."); };
  const timeline = [...(messages ?? []).map(message => ({ kind: "message" as const, timestamp: new Date(message.createdAt).getTime(), message })), ...offers.map(offer => ({ kind: "offer" as const, timestamp: new Date(offer.sentAt ?? offer.createdAt ?? 0).getTime(), offer }))].sort((a, b) => a.timestamp - b.timestamp || (a.kind === "message" ? -1 : 1));

  const renderMessage = (msg: any) => {
    const isMe = msg.senderId === me?.id; const badge = roleBadgeText(msg.senderRole);
    return <div key={`message-${msg.id}`} className={`flex ${isMe ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.id}`}><div className={`max-w-[88%] md:max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
      {!isMe && <div className="flex items-center gap-1.5 mb-0.5"><span className={`text-xs font-medium ${roleColor(msg.senderRole)}`}>{msg.senderName}</span>{badge && <Badge className={`text-[9px] border-0 h-4 ${msg.senderRole === "client" ? "bg-muted/10 text-muted-foreground" : "bg-primary/10 text-primary"}`}>{badge}</Badge>}</div>}
      <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border rounded-bl-md"}`}>{msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}{msg.fileUrl && msg.fileName && <FilePreview url={msg.fileUrl} name={msg.fileName} mimeType={msg.fileMimeType} />}</div>
      <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}{isMe && <span className="ml-1">{msg.isRead ? "· Read" : "· Sent"}</span>}</span>
    </div></div>;
  };

  return <ClientLayout><div className="h-full flex overflow-hidden" style={{height:"calc(100vh - 0px)"}}>
    <div className={`${selectedProjectId?"hidden md:flex":"flex"} w-full md:w-80 border-r border-border flex-col shrink-0 bg-background`}><div className="px-4 py-4 border-b border-border"><h1 className="font-semibold text-sm" data-testid="text-messages-heading">Messages</h1><p className="text-xs text-muted-foreground mt-0.5">Your request conversations</p></div><ScrollArea className="flex-1">{projectsWithConversation.length===0?<div className="p-4 text-center text-muted-foreground text-xs mt-4">No conversations yet. Admin will start one after reviewing your request.</div>:<div className="p-2 space-y-0.5">{projectsWithConversation.map(p=>{ const latestAt=(p as any).latestMessageAt as string|null|undefined; const unreadCount=Number((p as any).unreadMessageCount??0); return <button key={p.id} onClick={()=>setSelectedProjectId(p.id)} data-testid={`button-project-conversation-${p.id}`} className={`w-full text-left px-3 py-3.5 rounded-xl transition-colors ${selectedProjectId===p.id?"bg-primary/10 border border-primary/20":"hover:bg-accent/60"}`}><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-semibold">{(p.serviceType?.trim()?.charAt(0)??"G").toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-semibold truncate flex-1">{p.title}</p><span className={`text-[10px] shrink-0 ${unreadCount>0?"text-primary font-semibold":"text-muted-foreground"}`}>{formatThreadTime(latestAt)}</span></div><p className="text-[11px] text-muted-foreground truncate mt-0.5">{p.serviceType}</p><div className="flex items-center gap-2 mt-1"><p className={`text-xs truncate flex-1 ${unreadCount>0?"text-foreground font-medium":"text-muted-foreground"}`}>{formatThreadPreview((p as any).latestMessagePreview)}</p>{unreadCount>0&&<span className="min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">{unreadCount>99?"99+":unreadCount}</span>}</div></div></div></button>})}</div>}</ScrollArea></div>
    <div className={`${selectedProjectId?"flex":"hidden md:flex"} flex-1 min-w-0 flex-col`}>
      {!selectedProjectId?<div className="flex-1 flex flex-col items-center justify-center text-muted-foreground"><MessageSquare size={40} className="mb-3 opacity-30"/><p className="text-sm">Select a conversation</p></div>:<>
        <div className="px-4 md:px-5 py-3 border-b border-border flex items-center gap-3 shrink-0 bg-card/40 backdrop-blur-sm"><Button variant="ghost" size="sm" className="md:hidden h-8 w-8 p-0" onClick={()=>setSelectedProjectId(null)} aria-label="Back to conversations"><ArrowLeft size={16}/></Button><div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">{(selectedProject?.serviceType?.trim()?.charAt(0)??"G").toUpperCase()}</div><div className="min-w-0 flex-1"><p className="font-semibold text-sm truncate">{selectedProject?.title}</p><div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary"/><p className="text-[11px] text-muted-foreground truncate">{selectedProject?.serviceType} · Request chat</p></div></div><div className="flex items-center gap-1"><div className="relative"><Button variant="ghost" size="sm" disabled className="h-9 w-9 p-0 opacity-50 blur-[0.2px] cursor-not-allowed" title="Calls are VIP — coming soon" aria-label="VIP calls coming soon"><Phone size={16}/></Button><span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 text-black shadow-sm"><Crown size={9} fill="currentColor"/></span></div></div></div>
        {offerLoadError&&<div className="mx-3 mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">Offer loading error: {offerLoadError}</div>}
        <ScrollArea className="flex-1 p-3 md:p-4 bg-gradient-to-b from-background to-muted/5"><div className="mx-auto w-full max-w-3xl">{messagesLoading?<div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-10 bg-muted animate-pulse rounded-lg"/>)}</div>:!timeline.length?<div className="text-center text-muted-foreground text-sm py-12"><div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center"><MessageSquare size={20}/></div><p className="font-medium text-foreground">Start the conversation</p><p className="text-xs mt-1">Send a message, photo, file, or voice note.</p></div>:<div className="space-y-4">{timeline.map(item=>item.kind==="message"?renderMessage(item.message):<div key={`offer-${item.offer.id}`} className="flex justify-start"><OfferCard offer={item.offer} canRespond={!isOwner} isOwner={isOwner} onChanged={handleOfferChanged}/></div>)}<div ref={messagesEndRef}/></div>}</div></ScrollArea>
        {attachedFile&&<div className="px-3 md:px-4 pb-2"><div className="mx-auto max-w-3xl flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5 text-xs shadow-sm">{attachedFile.type.startsWith("image/")?<img src={URL.createObjectURL(attachedFile)} alt="Attachment preview" className="h-10 w-10 rounded-lg object-cover"/>:attachedFile.type.startsWith("audio/")?<div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Mic size={16}/></div>:<div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center"><FileText size={16}/></div>}<div className="min-w-0 flex-1"><p className="font-medium truncate">{attachedFile.name}</p><p className="text-[10px] text-muted-foreground">{(attachedFile.size/1024).toFixed(0)} KB · Ready to send</p></div><button className="h-8 w-8 rounded-full hover:bg-accent flex items-center justify-center" onClick={()=>{setAttachedFile(null);if(fileInputRef.current)fileInputRef.current.value="";if(photoInputRef.current)photoInputRef.current.value="";}} aria-label="Remove attachment"><X size={14}/></button></div></div>}
        <div className="p-3 md:p-4 border-t border-border shrink-0 bg-card/60 backdrop-blur-sm"><div className="mx-auto max-w-3xl">
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.zip,.png,.jpg,.jpeg,.gif,.webp" onChange={handleFileChange}/><input ref={photoInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoChange}/>
          <div className={`flex items-center gap-2 rounded-2xl border px-2 py-2 transition-all ${recording?"border-destructive/50 bg-destructive/5":"border-border bg-background"}`}>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0 rounded-xl" onClick={()=>photoInputRef.current?.click()} disabled={recording} title="Send photo" aria-label="Send photo"><ImageIcon size={17}/></Button>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0 rounded-xl" onClick={()=>fileInputRef.current?.click()} disabled={recording} title="Attach file" aria-label="Attach file"><Paperclip size={17}/></Button>
            {isOwner&&<Button variant="ghost" size="sm" className="h-9 px-2 shrink-0 gap-1 rounded-xl" onClick={openOffer} disabled={recording} title="Create offer"><FileSignature size={14}/><span className="hidden sm:inline text-xs">Offer</span></Button>}
            {recording ? <div className="flex-1 flex items-center gap-2 px-2"><span className="h-2 w-2 rounded-full bg-destructive animate-pulse"/><span className="text-sm font-medium text-destructive">Recording voice note</span><span className="text-xs text-muted-foreground ml-auto">{formatRecordingTime(recordingSeconds)}</span></div> : <Input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Type a message..." onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&handleSend()} className="flex-1 border-0 shadow-none focus-visible:ring-0 text-sm min-w-0 bg-transparent" data-testid="input-message"/>}
            {recording ? <Button onClick={stopRecording} className="h-9 w-9 p-0 shrink-0 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" title="Stop recording" aria-label="Stop recording"><Square size={14} fill="currentColor"/></Button> : message.trim() || attachedFile ? <Button onClick={handleSend} disabled={sendMutation.isPending} className="h-9 w-9 p-0 shrink-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-send-message" title="Send message" aria-label="Send message"><Send size={14}/></Button> : <Button onClick={startRecording} className="h-9 w-9 p-0 shrink-0 rounded-xl bg-primary/10 text-primary hover:bg-primary/20" title="Record voice note" aria-label="Record voice note"><Mic size={17}/></Button>}
          </div>
          <p className="text-[9px] text-muted-foreground text-center mt-2">Photos and files up to 10MB · Voice notes are recorded in your browser</p>
        </div></div>
      </>}
    </div>
  </div>
  <Dialog open={offerDialog} onOpenChange={setOfferDialog}><DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Create Project Offer</DialogTitle></DialogHeader>{selectedProject&&<div className="space-y-4"><div className="rounded-lg border border-border bg-muted/20 p-3 text-sm"><p className="font-medium">{selectedProject.title}</p><p className="text-xs text-muted-foreground">{selectedProject.projectCode??`Project #${selectedProject.id}`} · {selectedProject.clientName??"Client"}</p><p className="text-xs text-muted-foreground mt-1">Original request: {selectedProject.serviceType}</p></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="text-xs font-medium mb-1.5 block">Service</label><Input value={offerServiceType} onChange={e=>setOfferServiceType(e.target.value)}/></div><div><label className="text-xs font-medium mb-1.5 block">Project / Service Name</label><Input value={offerServiceName} onChange={e=>setOfferServiceName(e.target.value)}/></div></div><div><label className="text-xs font-medium mb-1.5 block">Scope of Work</label><Textarea value={offerScope} onChange={e=>setOfferScope(e.target.value)} rows={5}/></div><div><label className="text-xs font-medium mb-1.5 block">Requirements</label><Textarea value={offerRequirements} onChange={e=>setOfferRequirements(e.target.value)} rows={4}/></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="text-xs font-medium mb-1.5 block">Price (USD)</label><Input type="number" min="0" step="0.01" value={offerPrice} onChange={e=>setOfferPrice(e.target.value)}/></div><div><label className="text-xs font-medium mb-1.5 block">Delivery Estimate</label><Input value={offerDelivery} onChange={e=>setOfferDelivery(e.target.value)} placeholder="e.g. 5 business days"/></div></div><div><label className="text-xs font-medium mb-1.5 block">Terms / Notes</label><Textarea value={offerTerms} onChange={e=>setOfferTerms(e.target.value)} rows={3}/></div><div className="flex gap-2 pt-2"><Button variant="outline" onClick={()=>setOfferDialog(false)} className="flex-1">Cancel</Button><Button onClick={sendOffer} disabled={offerSaving} className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><FileSignature size={15}/>{offerSaving?"Sending...":"Send Offer"}</Button></div></div>}</DialogContent></Dialog>
  </ClientLayout>;
}
