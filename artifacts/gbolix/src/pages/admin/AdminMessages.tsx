import { useState, useRef, useEffect } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAdminListProjects, useListMessages, useSendMessage, useGetMe, useListNotifications } from "@workspace/api-client-react";
import { getAdminListProjectsQueryKey, getListMessagesQueryKey, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, MessageSquare, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminMessages() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();
  const { data: notifications } = useListNotifications();

  const { data: projects } = useAdminListProjects({}, { query: { queryKey: getAdminListProjectsQueryKey({}) } });
  const projectsWithConversation = projects?.filter(p => p.hasConversation) ?? [];
  const { data: messages, isLoading: messagesLoading } = useListMessages(selectedProjectId ?? 0, { query: { enabled: !!selectedProjectId, queryKey: getListMessagesQueryKey(selectedProjectId ?? 0) } });
  const sendMutation = useSendMessage();

  // Opening the admin messaging area means message notifications have been seen.
  useEffect(() => {
    const unreadMessageNotifications = notifications?.filter(n => !n.isRead && n.type === "message") ?? [];
    if (!unreadMessageNotifications.length) return;
    Promise.all(unreadMessageNotifications.map(n => fetch(`/api/notifications/${n.id}/read`, { method: "POST" })))
      .then(() => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }))
      .catch(() => undefined);
  }, [notifications, queryClient]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = () => {
    if (!message.trim() || !selectedProjectId) return;
    sendMutation.mutate({ projectId: selectedProjectId, data: { content: message.trim() } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(selectedProjectId) }); setMessage(""); },
    });
  };

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  return (
    <ClientLayout>
      <div className="h-full flex overflow-hidden" style={{ height: "calc(100vh - 0px)" }}>
        <div className={`${selectedProjectId ? "hidden md:flex" : "flex"} w-full md:w-72 border-r border-border flex-col shrink-0`}>
          <div className="px-4 py-4 border-b border-border">
            <h1 className="font-semibold text-sm" data-testid="text-admin-messages-heading">All Conversations</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{projectsWithConversation.length} active</p>
          </div>
          <ScrollArea className="flex-1">
            {projectsWithConversation.length === 0 ? <div className="p-4 text-center text-muted-foreground text-xs mt-4">No active conversations. Start one from the Projects page.</div> : <div className="p-2 space-y-1">{projectsWithConversation.map(p => <button key={p.id} onClick={() => setSelectedProjectId(p.id)} data-testid={`button-admin-conversation-${p.id}`} className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${selectedProjectId === p.id ? "bg-primary/10 border border-primary/20" : "hover:bg-accent"}`}><p className="text-sm font-medium truncate">{p.title}</p><p className="text-xs text-muted-foreground mt-0.5">{p.clientName}</p><p className="text-[10px] text-muted-foreground">{p.serviceType}</p></button>)}</div>}
          </ScrollArea>
        </div>

        <div className={`${selectedProjectId ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col`}>
          {!selectedProjectId ? <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground"><MessageSquare size={40} className="mb-3 opacity-30" /><p className="text-sm">Select a conversation</p></div> : <>
            <div className="px-4 md:px-5 py-3 md:py-4 border-b border-border flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" className="md:hidden h-8 w-8 p-0" onClick={() => setSelectedProjectId(null)} aria-label="Back to conversations"><ArrowLeft size={16} /></Button>
              <div className="min-w-0"><p className="font-semibold text-sm truncate">{selectedProject?.title}</p><p className="text-xs text-muted-foreground truncate">{selectedProject?.clientName} · {selectedProject?.serviceType}</p></div>
            </div>
            <ScrollArea className="flex-1 p-3 md:p-4">
              {messagesLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />)}</div> : !messages?.length ? <div className="text-center text-muted-foreground text-sm py-8">No messages yet. Start the conversation.</div> : <div className="space-y-3">{messages.map(msg => { const isMe = msg.senderId === me?.id; return <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.id}`}><div className={`max-w-[85%] md:max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>{!isMe && <div className="flex items-center gap-1.5 mb-0.5"><span className="text-xs font-medium text-muted-foreground">{msg.senderName}</span><Badge className="text-[9px] border-0 h-4 bg-muted/10 text-muted-foreground">{msg.senderRole === "client" ? "Client" : msg.senderRole === "owner" ? "Owner" : "Admin"}</Badge></div>}<div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>{msg.content}</div><span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span></div></div>; })}<div ref={messagesEndRef} /></div>}
            </ScrollArea>
            <div className="p-3 md:p-4 border-t border-border shrink-0"><div className="flex gap-2"><Input value={message} onChange={e => setMessage(e.target.value)} placeholder="Reply as admin..." onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()} className="flex-1 text-sm min-w-0" data-testid="input-admin-message" /><Button onClick={handleSend} disabled={!message.trim() || sendMutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-admin-send-message"><Send size={14} /></Button></div></div>
          </>}
        </div>
      </div>
    </ClientLayout>
  );
}
