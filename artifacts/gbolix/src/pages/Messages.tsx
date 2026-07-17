import { useState, useRef, useEffect } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useListProjects, useListMessages, useSendMessage, useMarkMessagesRead, useGetMe } from "@workspace/api-client-react";
import { getListProjectsQueryKey, getListMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, MessageSquare, Paperclip, X, FileText, Image as ImageIcon, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
  });
}

const ALLOWED_MIME = ["image/png","image/jpeg","image/jpg","image/gif","image/webp","application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/zip","application/x-zip-compressed"];

function FilePreview({ url, name, mimeType }: { url: string; name: string; mimeType?: string | null }) {
  const isImage = mimeType?.startsWith("image/");
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2">
        <img src={url} alt={name} className="max-w-48 max-h-48 rounded-lg object-cover border border-border" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-2 bg-background border border-border rounded-lg px-3 py-2 text-xs hover:border-primary/30 transition-all max-w-48">
      <FileText size={14} className="text-muted-foreground shrink-0" />
      <span className="truncate">{name}</span>
      <Download size={12} className="text-muted-foreground shrink-0 ml-auto" />
    </a>
  );
}

export default function Messages() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();

  const { data: projects } = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  const projectsWithConversation = projects?.filter(p => p.hasConversation) ?? [];

  const { data: messages, isLoading: messagesLoading } = useListMessages(
    selectedProjectId ?? 0,
    { query: { enabled: !!selectedProjectId, queryKey: getListMessagesQueryKey(selectedProjectId ?? 0) } }
  );

  const sendMutation = useSendMessage();
  const markReadMutation = useMarkMessagesRead();

  useEffect(() => {
    if (selectedProjectId && messages?.length) {
      markReadMutation.mutate({ projectId: selectedProjectId });
    }
  }, [selectedProjectId, messages?.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_MIME.includes(file.type)) {
      alert("Unsupported file type. Allowed: images, PDF, DOCX, ZIP");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Maximum 10MB");
      return;
    }
    setAttachedFile(file);
  };

  const handleSend = async () => {
    if ((!message.trim() && !attachedFile) || !selectedProjectId) return;

    let fileData: string | undefined;
    let fileName: string | undefined;
    let fileMimeType: string | undefined;

    if (attachedFile) {
      fileData = await fileToBase64(attachedFile);
      fileName = attachedFile.name;
      fileMimeType = attachedFile.type;
    }

    sendMutation.mutate(
      { projectId: selectedProjectId, data: { content: message.trim(), fileData, fileName, fileMimeType } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(selectedProjectId) });
          setMessage("");
          setAttachedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
      }
    );
  };

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  const roleColor = (role: string) => {
    if (role === "owner" || role === "admin") return "text-primary";
    if (role === "freelancer") return "text-blue-400";
    return "text-muted-foreground";
  };

  const roleBadgeText = (role: string) => {
    if (role === "owner") return "Owner";
    if (role === "admin") return "Admin";
    if (role === "freelancer") return "Freelancer";
    return null;
  };

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
                      const badge = roleBadgeText(msg.senderRole);
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.id}`}>
                          <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                            {!isMe && (
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={`text-xs font-medium ${roleColor(msg.senderRole)}`}>{msg.senderName}</span>
                                {badge && <Badge className={`text-[9px] border-0 h-4 ${msg.senderRole === "client" ? "bg-muted/10 text-muted-foreground" : "bg-primary/10 text-primary"}`}>{badge}</Badge>}
                              </div>
                            )}
                            <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                              {msg.content && <p>{msg.content}</p>}
                              {msg.fileUrl && msg.fileName && (
                                <FilePreview url={msg.fileUrl} name={msg.fileName} mimeType={msg.fileMimeType} />
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                              {isMe && <span className="ml-1">{msg.isRead ? "· Read" : "· Sent"}</span>}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Attached file preview */}
              {attachedFile && (
                <div className="px-4 pb-2">
                  <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-xs">
                    {attachedFile.type.startsWith("image/") ? <ImageIcon size={14} className="text-blue-400" /> : <FileText size={14} className="text-muted-foreground" />}
                    <span className="truncate flex-1">{attachedFile.name}</span>
                    <span className="text-muted-foreground shrink-0">{(attachedFile.size / 1024).toFixed(0)}KB</span>
                    <button onClick={() => { setAttachedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                      <X size={14} className="text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" className="hidden" accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.zip" onChange={handleFileChange} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0 shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach file"
                  >
                    <Paperclip size={14} />
                  </Button>
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
                    disabled={(!message.trim() && !attachedFile) || sendMutation.isPending}
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
