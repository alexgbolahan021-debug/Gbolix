import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useListProjects, useListMessages, useSendMessage, useGetMe } from "@workspace/api-client-react";
import { getListProjectsQueryKey, getListMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Messages() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();

  const { data: projects } = useListProjects({}, { query: { queryKey: getListProjectsQueryKey({}) } });
  const projectsWithConversation = projects?.filter(p => p.hasConversation) ?? [];

  const { data: messages, isLoading: messagesLoading } = useListMessages(
    selectedProjectId ?? 0,
    { query: { enabled: !!selectedProjectId, queryKey: getListMessagesQueryKey(selectedProjectId ?? 0) } }
  );

  const sendMutation = useSendMessage();

  const handleSend = () => {
    if (!message.trim() || !selectedProjectId) return;
    sendMutation.mutate(
      { projectId: selectedProjectId, data: { content: message.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(selectedProjectId) });
          setMessage("");
        },
      }
    );
  };

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  return (
    <ClientLayout>
      <div className="h-full flex" style={{ height: "calc(100vh - 0px)" }}>
        {/* Project list */}
        <div className="w-72 border-r border-border flex flex-col shrink-0">
          <div className="px-4 py-4 border-b border-border">
            <h1 className="font-semibold text-sm" data-testid="text-messages-heading">Messages</h1>
          </div>

          <ScrollArea className="flex-1">
            {projectsWithConversation.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-xs mt-4">
                No conversations yet. Admin will start one after reviewing your request.
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {projectsWithConversation.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    data-testid={`button-project-conversation-${p.id}`}
                    className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
                      selectedProjectId === p.id ? "bg-primary/10 border border-primary/20" : "hover:bg-accent"
                    }`}
                  >
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.serviceType}</p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {!selectedProjectId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Select a conversation</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-5 py-4 border-b border-border">
                <p className="font-semibold text-sm">{selectedProject?.title}</p>
                <p className="text-xs text-muted-foreground">{selectedProject?.serviceType}</p>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />)}
                  </div>
                ) : !messages?.length ? (
                  <div className="text-center text-muted-foreground text-sm py-8">No messages yet. Say hello!</div>
                ) : (
                  <div className="space-y-3">
                    {messages.map(msg => {
                      const isMe = msg.senderId === me?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.id}`}>
                          <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                            {!isMe && (
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-xs font-medium text-muted-foreground">{msg.senderName}</span>
                                {msg.senderRole === "admin" && <Badge className="text-[9px] bg-primary/10 text-primary border-0 h-4">Admin</Badge>}
                              </div>
                            )}
                            <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                              {msg.content}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                    className="flex-1 text-sm"
                    data-testid="input-message"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!message.trim() || sendMutation.isPending}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    data-testid="button-send-message"
                  >
                    <Send size={14} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
