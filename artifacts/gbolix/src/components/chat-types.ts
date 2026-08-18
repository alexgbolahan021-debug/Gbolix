import type { Message } from "@workspace/api-client-react";

export type OptimisticMessageStatus = "sending" | "failed";

export type ChatMessage = Omit<Message, "id" | "createdAt" | "fileUrl" | "fileName" | "fileMimeType"> & {
  id: number | string;
  createdAt: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  optimistic?: boolean;
  optimisticStatus?: OptimisticMessageStatus;
  localFile?: File;
  localFileUrl?: string;
};

export type ChatAttachment = {
  file: File;
  previewUrl: string;
};
