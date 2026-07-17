import { ClientLayout } from "@/components/ClientLayout";
import { Badge } from "@/components/ui/badge";
import { useAdminListTeam } from "@workspace/api-client-react";
import { getAdminListTeamQueryKey } from "@workspace/api-client-react";
import { Users, Star, Shield, Briefcase, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const roleBadgeStyle: Record<string, string> = {
  owner: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  admin: "bg-secondary/10 text-secondary border-secondary/20",
  freelancer: "bg-blue-400/10 text-blue-400 border-blue-400/20",
};

const roleIcon: Record<string, React.ElementType> = {
  owner: Star,
  admin: Shield,
  freelancer: Briefcase,
};

export default function AdminTeam() {
  const { data: team, isLoading } = useAdminListTeam({
    query: { queryKey: getAdminListTeamQueryKey() }
  });

  const owners = team?.filter(m => m.role === "owner") ?? [];
  const admins = team?.filter(m => m.role === "admin") ?? [];
  const freelancers = team?.filter(m => m.role === "freelancer") ?? [];

  const initials = (name: string) => name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const MemberCard = ({ member }: { member: NonNullable<typeof team>[0] }) => {
    const Icon = roleIcon[member.role] ?? Shield;
    return (
      <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-all group">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-bold text-primary border border-primary/20 shrink-0">
            {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover" /> : initials(member.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{member.name}</p>
            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge className={`text-[10px] border capitalize ${roleBadgeStyle[member.role] ?? ""}`}>
                <Icon size={9} className="mr-1" />{member.role}
              </Badge>
              {member.isActive ? (
                <span className="text-[10px] text-primary flex items-center gap-0.5"><CheckCircle size={9} /> Active</span>
              ) : (
                <span className="text-[10px] text-destructive flex items-center gap-0.5"><XCircle size={9} /> Inactive</span>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border">
          <div className="text-center">
            <p className="text-lg font-bold text-primary">{member.assignedProjects}</p>
            <p className="text-[10px] text-muted-foreground">Projects</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {member.lastLoginAt
                ? formatDistanceToNow(new Date(member.lastLoginAt), { addSuffix: true })
                : "Never"}
            </p>
            <p className="text-[10px] text-muted-foreground">Last Active</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ClientLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-2">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Team Management</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage all staff members and their roles.</p>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Total Staff", value: team?.length ?? 0, color: "text-primary" },
              { label: "Admins", value: admins.length, color: "text-secondary" },
              { label: "Freelancers", value: freelancers.length, color: "text-blue-400" },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-lg px-4 py-2 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-40 bg-muted/30 animate-pulse rounded-xl" />)}
          </div>
        ) : !team?.length ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">No staff members yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {owners.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Star size={14} className="text-yellow-400" />
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-yellow-400">Owner</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {owners.map(m => <MemberCard key={m.id} member={m} />)}
                </div>
              </div>
            )}

            {admins.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={14} className="text-secondary" />
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-secondary">Admins</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {admins.map(m => <MemberCard key={m.id} member={m} />)}
                </div>
              </div>
            )}

            {freelancers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase size={14} className="text-blue-400" />
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-blue-400">Freelancers</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {freelancers.map(m => <MemberCard key={m.id} member={m} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
