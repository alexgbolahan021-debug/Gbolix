import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminListUsers, useAdminGetUser, useAdminChangeUserRole, useAdminDeactivateUser } from "@workspace/api-client-react";
import { getAdminListUsersQueryKey, getAdminGetUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { Search, Users, X, Pencil, Mail, Phone, Globe, Languages, Building2, MapPin, Calendar, FolderOpen, MessageSquare, Files, Activity, Shield, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const roleBadgeStyle: Record<string, string> = {
  owner: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  admin: "bg-secondary/10 text-secondary border-secondary/20",
  specialist: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  client: "bg-primary/10 text-primary border-primary/20",
};

const ROLES = ["owner", "admin", "specialist", "client"] as const;
const roleLabel: Record<string, string> = { owner: "Owner", admin: "Admin", specialist: "Specialist", freelancer: "Specialist", client: "Client" };

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const isOwner = me?.role === "owner";

  const { data: users, isLoading } = useAdminListUsers(
    {},
    { query: { queryKey: getAdminListUsersQueryKey({}) } }
  );

  const { data: userDetail, isLoading: detailLoading } = useAdminGetUser(
    selectedUserId ?? 0,
    { query: { enabled: !!selectedUserId, queryKey: getAdminGetUserQueryKey(selectedUserId ?? 0) } }
  );

  const roleMutation = useAdminChangeUserRole();
  const deactivateMutation = useAdminDeactivateUser();

  const filtered = users?.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchType = userTypeFilter === "all" || u.userType === userTypeFilter;
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchType && matchRole;
  }) ?? [];

  const userTypes = [...new Set(users?.map(u => u.userType).filter(Boolean) ?? [])];

  const handleRoleChange = (userId: number, role: string) => {
    roleMutation.mutate(
      { id: userId, data: { role: role as "owner" | "admin" | "specialist" | "client" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getAdminGetUserQueryKey(userId) });
          toast({ title: "Role updated", description: `${roleLabel[role] ?? role} access assigned.` });
        },
        onError: () => toast({ title: "Failed to update role", variant: "destructive" }),
      }
    );
  };

  const handleDeactivate = (userId: number, isActive: boolean) => {
    deactivateMutation.mutate(
      { id: userId, data: { isActive } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey({}) });
          toast({ title: isActive ? "User activated" : "User deactivated" });
        },
        onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
      }
    );
  };

  const initials = (name: string) => name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <ClientLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-2">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "Space Grotesk, sans-serif" }} data-testid="text-admin-users-heading">Users</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage and review all registered users.</p>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-2 text-center">
            <p className="text-2xl font-bold text-primary" data-testid="text-total-users">{users?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48 max-w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-8 h-9 text-sm" data-testid="input-search-users" />
          </div>
          <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
            <SelectTrigger className="w-40 h-9 text-sm" data-testid="select-user-type-filter">
              <SelectValue placeholder="Business Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {userTypes.map(t => <SelectItem key={t} value={t!}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ROLES.map(r => <SelectItem key={r} value={r}>{roleLabel[r]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="h-14 bg-muted/30 animate-pulse rounded" />)}
            </div>
          ) : !filtered.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">User</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Requests</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Joined</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(user => (
                    <tr
                      key={user.id}
                      className="border-b border-border last:border-0 hover:bg-accent/20 cursor-pointer transition-colors"
                      data-testid={`row-user-${user.id}`}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {user.avatarUrl ? <img src={user.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" /> : initials(user.name)}
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge className={`text-[10px] border ${roleBadgeStyle[user.role] ?? ""}`}>{roleLabel[user.role] ?? user.role}</Badge>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{user.userType ?? "—"}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{user.country ?? "—"}</td>
                      <td className="px-5 py-4">
                        <span className="font-medium text-primary" data-testid={`text-user-requests-${user.id}`}>{user.totalRequests}</span>
                      </td>
                      <td className="px-5 py-4">
                        {user.isActive !== false ? (
                          <span className="flex items-center gap-1 text-xs text-primary"><CheckCircle size={11} /> Active</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-destructive"><XCircle size={11} /> Inactive</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(user.registrationDate), { addSuffix: true })}
                      </td>
                      <td className="px-5 py-4 text-right" onClick={event => event.stopPropagation()}>
                        {isOwner ? <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setSelectedUserId(user.id)} data-testid={`button-edit-role-${user.id}`}><Pencil size={12} /> Edit Role</Button> : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Side Drawer */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setSelectedUserId(null)} />
          <div className="w-full max-w-md bg-background border-l border-border flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="font-bold text-sm" style={{ fontFamily: "Space Grotesk, sans-serif" }}>User Profile</h2>
              <button onClick={() => setSelectedUserId(null)} className="p-1.5 hover:bg-accent rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {detailLoading ? (
                <div className="space-y-4">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />)}
                </div>
              ) : userDetail ? (
                <div className="space-y-5">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                      {userDetail.avatarUrl ? <img src={userDetail.avatarUrl} className="w-16 h-16 rounded-2xl object-cover" alt="" /> : initials(userDetail.name)}
                    </div>
                    <div>
                      <p className="font-bold text-base">{userDetail.name}</p>
                      <p className="text-xs text-muted-foreground">{userDetail.email}</p>
                      <Badge className={`text-[10px] border mt-1 ${roleBadgeStyle[userDetail.role] ?? ""}`}>
                        <Shield size={9} className="mr-1" />{roleLabel[userDetail.role] ?? userDetail.role}
                      </Badge>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: FolderOpen, label: "Projects", value: userDetail.totalProjects, color: "text-primary" },
                      { icon: CheckCircle, label: "Completed", value: userDetail.completedProjects, color: "text-primary" },
                      { icon: Files, label: "Files", value: userDetail.totalFiles, color: "text-blue-400" },
                      { icon: MessageSquare, label: "Messages", value: userDetail.totalMessages, color: "text-secondary" },
                    ].map(s => {
                      const Icon = s.icon;
                      return (
                        <div key={s.label} className="bg-card border border-border rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon size={12} className={s.color} />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</span>
                          </div>
                          <p className="text-xl font-bold">{s.value}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Contact Info */}
                  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact</p>
                    {[
                      { icon: Mail, label: "Email", value: userDetail.email },
                      { icon: Phone, label: "Phone", value: userDetail.phone ?? "—" },
                      { icon: Globe, label: "Website", value: userDetail.website ?? "—" },
                      { icon: Building2, label: "Company", value: userDetail.companyName ?? "—" },
                      { icon: MapPin, label: "Location", value: [userDetail.city, userDetail.country].filter(Boolean).join(", ") || "—" },
                      { icon: Languages, label: "Language", value: userDetail.language ?? "—" },
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="flex items-center gap-3">
                          <Icon size={12} className="text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground w-16 shrink-0">{item.label}</span>
                          <span className="text-xs truncate">{item.value}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Onboarding info */}
                  <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Onboarding</p>
                    {[
                      { label: "Business Type", value: userDetail.userType ?? "—" },
                      { label: "Company Size", value: userDetail.companySize ?? "—" },
                      { label: "Acquisition Source", value: userDetail.acquisitionSource ?? "—" },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span>{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Dates */}
                  <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Account Dates</p>
                    {[
                      { label: "Joined", value: userDetail.createdAt ? new Date(userDetail.createdAt).toLocaleDateString() : "—" },
                      { label: "Last Login", value: userDetail.lastLoginAt ? formatDistanceToNow(new Date(userDetail.lastLoginAt), { addSuffix: true }) : "—" },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1"><Calendar size={10} /> {item.label}</span>
                        <span>{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Recent Activity */}
                  {userDetail.recentActivity && userDetail.recentActivity.length > 0 && (
                    <div className="bg-card border border-border rounded-xl p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1"><Activity size={10} /> Recent Activity</p>
                      <div className="space-y-2">
                        {userDetail.recentActivity.slice(0, 5).map((a: { id: number; type: string; description: string; createdAt: string }) => (
                          <div key={a.id} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            <div>
                              <p className="text-xs">{a.description}</p>
                              <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Owner actions */}
                  {isOwner && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Owner Actions</p>
                      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Change Role</p>
                          <div className="flex flex-wrap gap-2">
                            {ROLES.map(r => (
                              <button
                                key={r}
                                onClick={() => handleRoleChange(userDetail.id, r)}
                                disabled={roleMutation.isPending}
                                className={`text-[10px] px-3 py-1.5 rounded-lg border capitalize transition-all ${
                                  userDetail.role === r
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary"
                                }`}
                              >
                                {roleLabel[r]}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1 border-t border-border">
                          <Button
                            size="sm"
                            variant={userDetail.isActive ? "destructive" : "outline"}
                            className="text-xs h-8"
                            onClick={() => handleDeactivate(userDetail.id, !userDetail.isActive)}
                            disabled={deactivateMutation.isPending}
                          >
                            {userDetail.isActive ? "Deactivate User" : "Activate User"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </ClientLayout>
  );
}
