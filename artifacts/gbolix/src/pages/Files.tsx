import { useState, useRef } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { useListFiles, useDeleteFile } from "@workspace/api-client-react";
import { getListFilesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, Download, FileText, Image as ImageIcon, File } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/react";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <ImageIcon size={16} className="text-blue-400" />;
  if (mimeType.includes("pdf")) return <FileText size={16} className="text-red-400" />;
  return <File size={16} className="text-muted-foreground" />;
}

export default function Files() {
  const { getToken } = useAuth();

  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: files, isLoading } = useListFiles({
    query: { queryKey: getListFilesQueryKey() }
  });

  const deleteMutation = useDeleteFile();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const buffer = await file.arrayBuffer();

      const base64 = btoa(
        String.fromCharCode(...new Uint8Array(buffer))
      );

      const token = await getToken();

      if (!token) {
        throw new Error("Authentication token unavailable");
      }

      const apiBaseUrl = import.meta.env.VITE_API_URL;

      const uploadUrl = apiBaseUrl
        ? `${apiBaseUrl.replace(/\/$/, "")}/files/upload`
        : "/api/files/upload";

      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          filename: file.name,
          content: base64,
          mimeType: file.type,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();

        throw new Error(
          `Upload failed: ${res.status} ${errorText}`
        );
      }

      queryClient.invalidateQueries({
        queryKey: getListFilesQueryKey()
      });

      toast({
        title: "File uploaded",
        description: file.name
      });

    } catch (error) {
      console.error("File upload error:", error);

      toast({
        title: "Upload failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to upload file.",
        variant: "destructive"
      });

    } finally {
      setUploading(false);

      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  };

  const handleDelete = (id: number, name: string) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListFilesQueryKey()
          });

          toast({
            title: "File deleted",
            description: name
          });
        },
      }
    );
  };

  return (
    <ClientLayout>
      <div className="p-6 max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-2xl font-bold"
              data-testid="text-files-heading"
            >
              Files
            </h1>

            <p className="text-muted-foreground text-sm mt-1">
              Upload and manage your project files.
            </p>
          </div>

          <div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
              data-testid="input-file-upload"
            />

            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm"
              data-testid="button-upload-file"
            >
              <Upload size={14} />

              {uploading
                ? "Uploading..."
                : "Upload File"}
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">

          {isLoading ? (

            <div className="space-y-px">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="h-14 bg-muted/30 animate-pulse"
                />
              ))}
            </div>

          ) : !files?.length ? (

            <div className="text-center py-16">

              <Upload
                size={32}
                className="text-muted-foreground mx-auto mb-3"
              />

              <p className="text-muted-foreground text-sm">
                No files uploaded yet.
              </p>

              <Button
                onClick={() => fileRef.current?.click()}
                variant="outline"
                size="sm"
                className="mt-4"
                data-testid="button-upload-first-file"
              >
                Upload your first file
              </Button>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>
                  <tr className="border-b border-border">

                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      File
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Size
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Uploaded
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Actions
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {files.map(f => (

                    <tr
                      key={f.id}
                      className="border-b border-border last:border-0 hover:bg-accent/20"
                      data-testid={`row-file-${f.id}`}
                    >

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2">

                          <FileIcon mimeType={f.mimeType} />

                          <span className="font-medium text-sm truncate max-w-[200px]">
                            {f.originalName}
                          </span>

                        </div>

                      </td>

                      <td className="px-5 py-4 text-muted-foreground text-xs">
                        {formatBytes(f.size)}
                      </td>

                      <td className="px-5 py-4 text-muted-foreground text-xs">
                        {formatDistanceToNow(
                          new Date(f.createdAt),
                          { addSuffix: true }
                        )}
                      </td>

                      <td className="px-5 py-4">

                        <div className="flex items-center justify-end gap-1">

                          <a
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              data-testid={`button-download-file-${f.id}`}
                            >
                              <Download size={13} />
                            </Button>
                          </a>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:text-destructive"
                            onClick={() =>
                              handleDelete(
                                f.id,
                                f.originalName
                              )
                            }
                            data-testid={`button-delete-file-${f.id}`}
                          >
                            <Trash2 size={13} />
                          </Button>

                        </div>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>
    </ClientLayout>
  );
}