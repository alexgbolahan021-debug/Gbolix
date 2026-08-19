import { useEffect, useRef, useState } from "react";
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
import { MessageSquare, ArrowLeft, FileSignature, Phone, Crown } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { OfferCard, type Offer } from "@/components/OfferCard";
import { ChatComposer, type ChatDraft } from "@/components/ChatComposer";
import { MessageBubble } from "@/components/MessageBubble";
import type { ChatMessage } from "@/components/chat-types";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
    reader.onerror = reject;
  });
}

function formatThreadTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (isToday(date)) return format(date, "p");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

function formatThreadPreview(value: string | null | undefined) {
  const text = value?.trim();
  if (!text) return "No messages yet";
  return text.length > 62 ? `${text.slice(0, 62)}…` : text;
}

export default function Messages() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [pendingMessages, setPendingMessages] = useState<Record<number, ChatMessage[]>>({});
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
  const pendingIdRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();
  const { data: projects } = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  const { data: messages, isLoading: messagesLoading } = useListMessages(selectedProjectId ?? 0, { query: { enabled: !!selectedProjectId, queryKey: getListMessagesQueryKey(selectedProjectId ?? 0) } });
  const sendMutation = useSendMessage();
  const markReadMutation = useMarkMessagesRead();

  const projectsWithConversation = [...(projects?.filter(project => project.hasConversation) ?? [])].sort((a, b) => {
    const aTime = new Date((a as any).latestMessageAt ?? a.createdAt).getTime();
    const bTime = new Date((b as any).latestMessageAt ?? b.createdAt).getTime();
    return bTime - aTime;
  });

  useEffect(() => {
    if (!selectedProjectId) { setOffers([]); setOfferLoadError(null); return; }
    let cancelled = false;
    setOfferLoadError(null);
    customFetch<Offer[]>(`/api/projects/${selectedProjectId}/offers`, { responseType: "json" }).then(data => {
      if (!cancelled) setOffers(Array.isArray(data) ? data.filter(offer => offer.status !== "draft") : []);
    }).catch(error => {
      if (cancelled) return;
      console.error("[Messages] failed to load offers", { projectId: selectedProjectId, error });
      setOffers([]);
      setOfferLoadError(error instanceof Error ? error.message : "Unable to load offers");
    });
    return () => { cancelled = true; };
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId || !messages?.length) return;
    markReadMutation.mutate({ projectId: selectedProjectId }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() }) });
  }, [selectedProjectId, messages?.length]);

  const visibleMessages: ChatMessage[] = [...(messages ?? []), ...(selectedProjectId ? pendingMessages[selectedProjectId] ?? [] : [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [visibleMessages.length, offers.length, selectedProjectId]);

  const selectedProject = projects?.find(project => project.id === selectedProjectId);
  const isOwner = me?.role === "owner" || me?.role === "admin";

  const updatePending = (projectId: number, updater: (current: ChatMessage[]) => ChatMessage[]) => {
    setPendingMessages(current => ({ ...current, [projectId]: updater(current[projectId] ?? []) }));
  };

  const replaceServerMessages = (projectId: number, serverMessage: any) => {
    queryClient.setQueryData(getListMessagesQueryKey(projectId), (current: unknown) => {
      const existing = Array.isArray(current) ? current : [];
      return existing.some((message: any) => message.id === serverMessage.id) ? existing : [...existing, serverMessage];
    });
  };

  const uploadPendingMessage = async (projectId: number, pending: ChatMessage) => {
    try {
      const fileData = pending.localFile ? await fileToBase64(pending.localFile) : undefined;
      const serverMessage = await sendMutation.mutateAsync({ projectId, data: { content: pending.content, fileData, fileName: pending.fileName ?? undefined, fileMimeType: pending.fileMimeType ?? undefined } });
      updatePending(projectId, current => current.filter(message => message.id !== pending.id));
      if (pending.localFileUrl) URL.revokeObjectURL(pending.localFileUrl);
      replaceServerMessages(projectId, serverMessage);
      void queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(projectId) });
    } catch (error) {
      console.error("[Messages] background send failed", { projectId, error });
      updatePending(projectId, current => current.map(message => message.id === pending.id ? { ...message, optimisticStatus: "failed" } : message));
    }
  };

  const sendDraft = (draft: ChatDraft) => {
    if (!selectedProjectId || (!draft.content && !draft.file)) return;
    const projectId = selectedProjectId;
    const localFileUrl = draft.file ? URL.createObjectURL(draft.file) : undefined;
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}-${pendingIdRef.current++}`,
      projectId,
      senderId: me?.id ?? 0,
      senderName: me?.name ?? "You",
      senderRole: me?.role ?? "client",
      content: draft.content,
      fileUrl: null,
      fileName: draft.file?.name ?? null,
      fileMimeType: draft.file?.type ?? null,
      isRead: false,
      createdAt: new Date().toISOString(),
      optimistic: true,
      optimisticStatus: "sending",
      localFile: draft.file,
      localFileUrl,
    };
    updatePending(projectId, current => [...current, optimistic]);
    void uploadPendingMessage(projectId, optimistic);
  };

  const retryMessage = (message: ChatMessage) => {
    if (!message.localFile && !message.content) return;
    updatePending(message.projectId, current => current.map(item => item.id === message.id ? { ...item, optimisticStatus: "sending" } : item));
    void uploadPendingMessage(message.projectId, { ...message, optimisticStatus: "sending" });
  };

  const openOffer = () => {
    if (!selectedProject) return;
    setOfferServiceType(selectedProject.serviceType ?? "");
    setOfferServiceName(selectedProject.title ?? "");
    const scope = selectedProject.description ?? "";
    setOfferScope(scope);
    const requirements = (selectedProject as any).requirements;
    setOfferRequirements(requirements && typeof requirements === "object" ? Object.entries(requirements).filter(([key]) => key !== "attached_files").map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`).join("\n") : requirements ? String(requirements) : "");
    setOfferPrice(selectedProject.price != null ? String(selectedProject.price) : "");
    setOfferDelivery(""); setOfferTerms(""); setOfferDialog(true);
  };

  const sendOffer = async () => {
    if (!selectedProjectId || !offerServiceType.trim() || !offerServiceName.trim() || !offerScope.trim() || !offerPrice.trim()) { alert("Service, project, scope and price are required."); return; }
    setOfferSaving(true);
    try {
      await customFetch<{ offer: Offer }>(`/api/projects/${selectedProjectId}/offers`, { method: "POST", headers: { "Content-Type": "application/json" }, responseType: "json", body: JSON.stringify({ serviceType: offerServiceType.trim(), serviceName: offerServiceName.trim(), scope: offerScope.trim(), requirements: offerRequirements.trim() || undefined, price: offerPrice.trim(), deliveryEstimate: offerDelivery.trim() || undefined, terms: offerTerms.trim() || undefined, send: true }) });
      setOfferDialog(false);
      const data = await customFetch<Offer[]>(`/api/projects/${selectedProjectId}/offers`, { responseType: "json" });
      setOffers(Array.isArray(data) ? data.filter(offer => offer.status !== "draft") : []);
      void queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(selectedProjectId) });
      void queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    } catch (error) { alert(error instanceof Error ? error.message : "Unable to send offer"); } finally { setOfferSaving(false); }
  };

  const roleColor = (role: string) => role === "owner" || role === "admin" ? "text-primary" : role === "specialist" ? "text-blue-400" : "text-muted-foreground";
  const roleBadgeText = (role: string) => role === "owner" ? "Owner" : role === "admin" ? "Admin" : role === "specialist" ? "Specialist" : null;
  const handleOfferChanged = async (updated: Offer, nextStep?: string) => {
    setOffers(current => current.map(offer => offer.id === updated.id ? updated : offer));
    if (selectedProjectId) { void queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(selectedProjectId) }); void queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() }); }
    if (nextStep === "payment") alert("Offer accepted. Payment is the next step.");
  };

  const timeline = [...visibleMessages.map(message => ({ kind: "message" as const, timestamp: new Date(message.createdAt).getTime(), message })), ...offers.map(offer => ({ kind: "offer" as const, timestamp: new Date(offer.sentAt ?? offer.createdAt ?? 0).getTime(), offer }))].sort((a, b) => a.timestamp - b.timestamp || (a.kind === "message" ? -1 : 1));

  return <ClientLayout><div className="flex h-full overflow-hidden" style={{ height: "calc(100vh - 0px)" }}>
    <div className={`${selectedProjectId ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-border bg-background md:w-80`}><div className="border-b border-border px-4 py-4"><h1 className="text-sm font-semibold" data-testid="text-messages-heading">Messages</h1><p className="mt-0.5 text-xs text-muted-foreground">Your request conversations</p></div><ScrollArea className="flex-1">{projectsWithConversation.length === 0 ? <div className="mt-4 p-4 text-center text-xs text-muted-foreground">No conversations yet. Admin will start one after reviewing your request.</div> : <div className="space-y-0.5 p-2">{projectsWithConversation.map(project => { const latestAt = (project as any).latestMessageAt as string | null | undefined; const unreadCount = Number((project as any).unreadMessageCount ?? 0); return <button key={project.id} onClick={() => setSelectedProjectId(project.id)} data-testid={`button-project-conversation-${project.id}`} className={`w-full rounded-xl px-3 py-3.5 text-left transition-colors ${selectedProjectId === project.id ? "border border-primary/20 bg-primary/10" : "hover:bg-accent/60"}`}><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{(project.serviceType?.trim()?.charAt(0) ?? "G").toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="flex-1 truncate text-sm font-semibold">{project.title}</p><span className={`shrink-0 text-[10px] ${unreadCount > 0 ? "font-semibold text-primary" : "text-muted-foreground"}`}>{formatThreadTime(latestAt)}</span></div><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{project.serviceType}</p><div className="mt-1 flex items-center gap-2"><p className={`flex-1 truncate text-xs ${unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>{formatThreadPreview((project as any).latestMessagePreview)}</p>{unreadCount > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span>}</div></div></div></button>; })}</div>}</ScrollArea></div>
    <div className={`${selectedProjectId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
      {!selectedProjectId ? <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground"><MessageSquare size={40} className="mb-3 opacity-30" /><p className="text-sm">Select a conversation</p></div> : <>
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card/40 px-4 py-3 backdrop-blur-sm md:px-5"><Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:hidden" onClick={() => setSelectedProjectId(null)} aria-label="Back to conversations"><ArrowLeft size={16} /></Button><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{(selectedProject?.serviceType?.trim()?.charAt(0) ?? "G").toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{selectedProject?.title}</p><div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" /><p className="truncate text-[11px] text-muted-foreground">{selectedProject?.serviceType} · Request chat</p></div></div><div className="relative"><Button variant="ghost" size="sm" disabled className="h-9 w-9 cursor-not-allowed p-0 opacity-50" title="Calls are VIP — coming soon" aria-label="VIP calls coming soon"><Phone size={16} /></Button><span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 text-black shadow-sm"><Crown size={9} fill="currentColor" /></span></div></div>
        {offerLoadError && <div className="mx-3 mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">Offer loading error: {offerLoadError}</div>}
        <ScrollArea className="flex-1 bg-gradient-to-b from-background to-muted/5 p-3 md:p-4"><div className="mx-auto w-full max-w-3xl">{messagesLoading && !timeline.length ? <div className="space-y-3">{[1, 2, 3].map(index => <div key={index} className="h-10 animate-pulse rounded-lg bg-muted" />)}</div> : !timeline.length ? <div className="py-12 text-center text-sm text-muted-foreground"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><MessageSquare size={20} /></div><p className="font-medium text-foreground">Start the conversation</p><p className="mt-1 text-xs">Send a message, photo, file, or voice note.</p></div> : <div className="space-y-4">{timeline.map(item => item.kind === "message" ? <MessageBubble key={`message-${item.message.id}`} message={item.message} isOwn={item.message.senderId === me?.id} showSender={item.message.senderId !== me?.id} onRetry={item.message.optimisticStatus === "failed" ? () => retryMessage(item.message) : undefined} /> : <div key={`offer-${item.offer.id}`} className="flex justify-start"><OfferCard offer={item.offer} canRespond={!isOwner} isOwner={isOwner} onChanged={handleOfferChanged} /></div>)}<div ref={messagesEndRef} /></div>}</div></ScrollArea>
        <div className="shrink-0 border-t border-border bg-card/60 backdrop-blur-sm"><ChatComposer onSend={sendDraft} onCreateOffer={isOwner ? openOffer : undefined} testId="input-message" /></div>
      </>}
    </div>
  </div>
  <Dialog open={offerDialog} onOpenChange={setOfferDialog}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Create Project Offer</DialogTitle></DialogHeader>{selectedProject && <div className="space-y-4"><div className="rounded-lg border border-border bg-muted/20 p-3 text-sm"><p className="font-medium">{selectedProject.title}</p><p className="text-xs text-muted-foreground">{(selectedProject as any).projectCode ?? `Project #${selectedProject.id}`} · {(selectedProject as any).clientName ?? "Client"}</p><p className="mt-1 text-xs text-muted-foreground">Original request: {selectedProject.serviceType}</p></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-xs font-medium">Service</label><Input value={offerServiceType} onChange={event => setOfferServiceType(event.target.value)} /></div><div><label className="mb-1.5 block text-xs font-medium">Project / Service Name</label><Input value={offerServiceName} onChange={event => setOfferServiceName(event.target.value)} /></div></div><div><label className="mb-1.5 block text-xs font-medium">Scope of Work</label><Textarea value={offerScope} onChange={event => setOfferScope(event.target.value)} rows={5} /></div><div><label className="mb-1.5 block text-xs font-medium">Requirements</label><Textarea value={offerRequirements} onChange={event => setOfferRequirements(event.target.value)} rows={4} /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-xs font-medium">Price (USD)</label><Input type="number" min="0" step="0.01" value={offerPrice} onChange={event => setOfferPrice(event.target.value)} /></div><div><label className="mb-1.5 block text-xs font-medium">Delivery Estimate</label><Input value={offerDelivery} onChange={event => setOfferDelivery(event.target.value)} placeholder="e.g. 5 business days" /></div></div><div><label className="mb-1.5 block text-xs font-medium">Terms / Notes</label><Textarea value={offerTerms} onChange={event => setOfferTerms(event.target.value)} rows={3} /></div><div className="flex gap-2 pt-2"><Button variant="outline" onClick={() => setOfferDialog(false)} className="flex-1">Cancel</Button><Button onClick={sendOffer} disabled={offerSaving} className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><FileSignature size={15} />{offerSaving ? "Sending..." : "Send Offer"}</Button></div></div>}</DialogContent></Dialog>
  </ClientLayout>;
}
