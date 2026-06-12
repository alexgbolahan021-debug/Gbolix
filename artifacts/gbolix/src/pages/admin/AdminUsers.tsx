import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminListUsers } from "@workspace/api-client-react";
import { getAdminListUsersQueryKey } from "@workspace/api-client-react";
import { Search, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("all");

  const { data: users, isLoading } = useAdminListUsers(
    {},
    { query: { queryKey: getAdminListUsersQueryKey({}) } }
  );

  const filtered = users?.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchType = userTypeFilter === "all" || u.userType === userTypeFilter;
    return matchSearch && matchType;
  }) ?? [];

  const userTypes = [...new Set(users?.map(u => u.userType).filter(Boolean) ?? [])];

  return (
    <ClientLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-admin-users-heading">Users</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage and review all registered clients.</p>
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
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              className="pl-8 h-9 text-sm"
              data-testid="input-search-users"
            />
          </div>
          <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
            <SelectTrigger className="w-44 h-9 text-sm" data-testid="select-user-type-filter">
              <SelectValue placeholder="User Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {userTypes.map(t => (
                <SelectItem key={t} value={t!}>{t}</SelectItem>
              ))}
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
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Source</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Requests</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(user => (
                    <tr key={user.id} className="border-b border-border last:border-0 hover:bg-accent/20" data-testid={`row-user-${user.id}`}>
                      <td className="px-5 py-4">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{user.userType ?? "—"}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{user.location ?? "—"}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{user.acquisitionSource ?? "—"}</td>
                      <td className="px-5 py-4">
                        <span className="font-medium text-primary" data-testid={`text-user-requests-${user.id}`}>{user.totalRequests}</span>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(user.registrationDate), { addSuffix: true })}
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
