import { useEffect, useRef, useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAdminListProjects, useListMessages, useSendMessage, useGetMe, useListNotifications, customFetch } from "@workspace/api-client-react";
import { getAdminListProjectsQueryKey, getListMessagesQueryKey, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, MessageSquare, Search, UserRound } from "lucide-react";
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

function projectInitial(project: any) {
  return (project?.clientName?.trim()?.charAt(0) || project?.serviceType?.trim()?.charAt(0) || "G").toUpperCase();
}

function statusLabel(status: string | null | undefined) {
  if (!status) return "Active";
  return status.replace(/_/g, " ").replace(/\b\w/g, character => character.toUpperCase());
}

export default function AdminMessages() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => {
    const id = Number(new URLSearchParams(window.location.search).get("project"));
    return Number.isFinite(id) && id > 0 ? id : null;
  });
  const [search, setSearch] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerLoadError, setOfferLoadError] = useState<string | null>(null);
  const [pendingMessages, setPendingMessages] = useState<Record<number, ChatMessage[]>>({});
  const pendingIdRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();
  const { data: notifications } = useListNotifications();
  const { data: projects } = useAdminListProjects({}, { query: { queryKey: getAdminListProjectsQueryKey({}) } });
  const { data: messages, isLoading: messagesLoading } = useListMessages(selectedProjectId ?? 0, { query: { enabled: !!selectedProjectId, queryKey: getListMessagesQueryKey(selectedProjectId ?? 0) } });
  const sendMutation = useSendMessage();
  const projectsWithConversation = projects?.filter(project => project.hasConversation) ?? [];
  const filteredProjects = projectsWithConversation.filter(project => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [project.title, project.clientName, project.serviceType, (project as any).projectCode].filter(Boolean).some(value => String(value).toLowerCase().includes(query));
  });

  useEffect(() => {
    if (!selectedProjectId) { setOffers([]); setOfferLoadError(null); return; }
    let cancelled = false;
    setOfferLoadError(null);
    customFetch<Offer[]>(`/api/projects/${selectedProjectId}/offers`, { responseType: "json" }).then(data => {
      if (!cancelled) setOffers(Array.isArray(data) ? data.filter(offer => offer.status !== "draft") : []);
    }).catch(error => {
      if (cancelled) return;
      console.error("[AdminMessages] failed to load offers", { projectId: selectedProjectId, error });
      setOffers([]);
      setOfferLoadError(error instanceof Error ? error.message : "Unable to load offers");
    });
    return () => { cancelled = true; };
  }, [selectedProjectId]);

  useEffect(() => {
    const unreadMessageNotifications = notifications?.filter(notification => !notification.isRead && (notification.type === "new_message" || notification.type === "admin_reply")) ?? [];
    if (!unreadMessageNotifications.length) return;
    Promise.all(unreadMessageNotifications.map(notification => customFetch(`/api/notifications/${notification.id}/read`, { method: "POST", responseType: "json" }))).then(() => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() })).catch(() => undefined);
  }, [notifications, queryClient]);

  const visibleMessages: ChatMessage[] = [...(messages ?? []), ...(selectedProjectId ? pendingMessages[selectedProjectId] ?? [] : [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [visibleMessages.length, offers.length, selectedProjectId]);

  const updatePending = (projectId: number, updater: (current: ChatMessage[]) => ChatMessage[]) => setPendingMessages(current => ({ ...current, [projectId]: updater(current[projectId] ?? []) }));

  const uploadPendingMessage = async (projectId: number, pending: ChatMessage) => {
    try {
      const fileData = pending.localFile ? await fileToBase64(pending.localFile) : undefined;
      const serverMessage = await sendMutation.mutateAsync({ projectId, data: { content: pending.content, fileData, fileName: pending.fileName ?? undefined, fileMimeType: pending.fileMimeType ?? undefined } });
      updatePending(projectId, current => current.filter(message => message.id !== pending.id));
      if (pending.localFileUrl) URL.revokeObjectURL(pending.localFileUrl);
      queryClient.setQueryData(getListMessagesQueryKey(projectId), (current: unknown) => {
        const existing = Array.isArray(current) ? current : [];
        return existing.some((message: any) => message.id === serverMessage.id) ? existing : [...existing, serverMessage];
      });
      void queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(projectId) });
      void queryClient.invalidateQueries({ queryKey: getAdminListProjectsQueryKey({}) });
    } catch (error) {
      console.error("[AdminMessages] background send failed", { projectId, error });
      updatePending(projectId, current => current.map(message => message.id === pending.id ? { ...message, optimisticStatus: "failed" } : message));
    }
  };

  const sendDraft = (draft: ChatDraft) => {
    if (!selectedProjectId || (!draft.content && !draft.file)) return;
    const projectId = selectedProjectId;
    const optimistic: ChatMessage = {
      id: `local-admin-${Date.now()}-${pendingIdRef.current++}`,
      projectId,
      senderId: me?.id ?? 0,
      senderName: me?.name ?? "Staff",
      senderRole: me?.role ?? "admin",
      content: draft.content,
      fileUrl: null,
      fileName: draft.file?.name ?? null,
      fileMimeType: draft.file?.type ?? null,
      isRead: false,
      createdAt: new Date().toISOString(),
      optimistic: true,
      optimisticStatus: "sending",
      localFile: draft.file,
      localFileUrl: draft.file ? URL.createObjectURL(draft.file) : undefined,
    };
    updatePending(projectId, current => [...current, optimistic]);
    void uploadPendingMessage(projectId, optimistic);
  };

  const retryMessage = (message: ChatMessage) => {
    if (!message.localFile && !message.content) return;
    updatePending(message.projectId, current => current.map(item => item.id === message.id ? { ...item, optimisticStatus: "sending" } : item));
    void uploadPendingMessage(message.projectId, { ...message, optimisticStatus: "sending" });
  };

  const selectedProject = projects?.find(project => project.id === selectedProjectId);
  const isOwner = me?.role === "owner" || me?.role === "admin";
  const timeline = [...visibleMessages.map(message => ({ kind: "message" as const, timestamp: new Date(message.createdAt).getTime(), message })), ...offers.map(offer => ({ kind: "offer" as const, timestamp: new Date(offer.sentAt ?? offer.createdAt ?? 0).getTime(), offer }))].sort((a, b) => a.timestamp - b.timestamp || (a.kind === "message" ? -1 : 1));

  return <ClientLayout><div className="flex h-full overflow-hidden bg-background" style={{ height: "calc(100vh - 0px)" }}>
    <div className={`${selectedProjectId ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-border bg-background md:w-80`}>
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div><h1 className="text-sm font-semibold" data-testid="text-admin-messages-heading">Message Center</h1><p className="mt-0.5 text-xs text-muted-foreground">Manage client conversations</p></div>
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-[10px] text-primary">{projectsWithConversation.length} active</Badge>
        </div>
        <div className="relative mt-4"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search clients or projects" className="h-9 border-border bg-card pl-9 text-xs" aria-label="Search conversations" /></div>
      </div>
      <ScrollArea className="flex-1">
        {filteredProjects.length === 0 ? <div className="mt-4 px-4 py-8 text-center text-xs text-muted-foreground"><MessageSquare size={24} className="mx-auto mb-2 opacity-30" /><p>{search ? "No conversations match your search." : "No active conversations."}</p>{!search && <p className="mt-1 opacity-70">Start one from the Projects page.</p>}</div> : <div className="space-y-1 p-2">{filteredProjects.map(project => <button key={project.id} onClick={() => setSelectedProjectId(project.id)} data-testid={`button-admin-conversation-${project.id}`} className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${selectedProjectId === project.id ? "border border-primary/20 bg-primary/10 shadow-sm" : "hover:bg-accent/60"}`}><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{projectInitial(project)}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="flex-1 truncate text-sm font-semibold">{project.title}</p><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /></div><p className="mt-0.5 truncate text-[11px] text-foreground/70">{project.clientName || "Client"}</p><div className="mt-1 flex items-center gap-2"><p className="flex-1 truncate text-[11px] text-muted-foreground">{project.serviceType}</p><span className="shrink-0 text-[9px] capitalize text-muted-foreground">{statusLabel(project.status)}</span></div></div></div></button>)}</div>}
      </ScrollArea>
    </div>

    <div className={`${selectedProjectId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
      {!selectedProjectId ? <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MessageSquare size={24} /></div><p className="text-sm font-medium text-foreground">Select a client conversation</p><p className="mt-1 text-xs">Choose a project to view and reply to messages.</p></div> : <>
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card/50 px-4 py-3 backdrop-blur-sm md:px-5"><Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:hidden" onClick={() => setSelectedProjectId(null)} aria-label="Back to conversations"><ArrowLeft size={16} /></Button><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{projectInitial(selectedProject)}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{selectedProject?.title}</p><Badge className="hidden h-5 border-0 bg-primary/10 px-1.5 text-[9px] text-primary sm:inline-flex"><UserRound size={10} className="mr-1" /> Staff view</Badge></div><p className="truncate text-[11px] text-muted-foreground">{selectedProject?.clientName || "Client"} · {selectedProject?.serviceType}</p></div><div className="hidden items-center gap-2 sm:flex"><Badge variant="outline" className="gap-1 border-border text-[10px] text-muted-foreground"><CheckCircle2 size={11} className="text-primary" /> {statusLabel(selectedProject?.status)}</Badge><span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Admin</span></div></div>
        {offerLoadError && <div className="mx-3 mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">Offer loading error: {offerLoadError}</div>}
        <ScrollArea className="flex-1 bg-gradient-to-b from-background to-muted/5 p-3 md:p-4"><div className="mx-auto w-full max-w-3xl">{messagesLoading && !timeline.length ? <div className="space-y-3">{[1, 2, 3].map(index => <div key={index} className="h-10 animate-pulse rounded-lg bg-muted" />)}</div> : !timeline.length ? <div className="py-12 text-center text-sm text-muted-foreground"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><MessageSquare size={20} /></div><p className="font-medium text-foreground">No messages yet</p><p className="mt-1 text-xs">Send a reply, photo, file, or voice note to start the conversation.</p></div> : <div className="space-y-4">{timeline.map(item => item.kind === "message" ? <MessageBubble key={`message-${item.message.id}`} message={item.message} isOwn={item.message.senderId === me?.id} showSender={item.message.senderId !== me?.id} onRetry={item.message.optimisticStatus === "failed" ? () => retryMessage(item.message) : undefined} /> : <div key={`offer-${item.offer.id}`} className="flex justify-start"><OfferCard offer={item.offer} canRespond={!isOwner} isOwner={isOwner} onChanged={updated => setOffers(current => current.map(offer => offer.id === updated.id ? updated : offer))} /></div>)}<div ref={messagesEndRef} /></div>}</div></ScrollArea>
        <div className="shrink-0 border-t border-border bg-card/60 backdrop-blur-sm"><ChatComposer onSend={sendDraft} testId="input-admin-message" placeholder="Reply to client..." /></div>
      </>}
    </div>
  </div></ClientLayout>;
}
