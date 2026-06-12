import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { useListFiles, useDeleteFile } from "@workspace/api-client-react";
import { getListFilesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Trash2, FileText, Image as ImageIcon, File } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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

export default function AdminFiles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: files, isLoading } = useListFiles({}, { query: { queryKey: getListFilesQueryKey({}) } });
  const deleteMutation = useDeleteFile();

  const handleDelete = (id: number, name: string) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey({}) });
        toast({ title: "File deleted", description: name });
      },
    });
  };

  return (
    <ClientLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-admin-files-heading">All Files</h1>
            <p className="text-muted-foreground text-sm mt-1">View and manage files uploaded by clients.</p>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-2 text-center">
            <p className="text-2xl font-bold text-primary" data-testid="text-total-files">{files?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Files</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-muted/30 animate-pulse rounded" />)}
            </div>
          ) : !files?.length ? (
            <div className="py-16 text-center text-muted-foreground text-sm">No files uploaded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">File</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Size</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Uploaded</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map(f => (
                    <tr key={f.id} className="border-b border-border last:border-0 hover:bg-accent/20" data-testid={`row-admin-file-${f.id}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <FileIcon mimeType={f.mimeType} />
                          <span className="font-medium text-sm truncate max-w-[200px]">{f.originalName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{f.mimeType}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{formatBytes(f.size)}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <a href={f.url} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`button-download-file-${f.id}`}>
                              <Download size={13} />
                            </Button>
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:text-destructive"
                            onClick={() => handleDelete(f.id, f.originalName)}
                            data-testid={`button-delete-admin-file-${f.id}`}
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
