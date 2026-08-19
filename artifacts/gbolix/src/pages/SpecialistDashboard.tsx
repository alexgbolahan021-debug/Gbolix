import { ClientLayout } from "@/components/ClientLayout";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useGetMe } from "@workspace/api-client-react";
import { Briefcase, MessageSquare, CheckSquare, Clock, Activity } from "lucide-react";

const statusColor: Record<string, string> = {
  submitted: "bg-muted text-muted-foreground",
  queued: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-secondary/10 text-secondary",
  review: "bg-yellow-500/10 text-yellow-400",
  completed: "bg-primary/10 text-primary",
};

const statusProgress: Record<string, number> = {
  submitted: 10, queued: 30, in_progress: 60, review: 80, completed: 100,
};

export default function SpecialistDashboard() {
  const { data: profile } = useGetMe();
  const firstName = profile?.name?.split(" ")[0];

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 pt-2">
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
            {firstName ? `Hey, ${firstName} 👋` : "Specialist Dashboard"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Your assigned projects and workspace overview.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Assigned", value: 0, icon: Briefcase, color: "text-primary", bg: "bg-primary/10" },
            { label: "In Progress", value: 0, icon: Activity, color: "text-secondary", bg: "bg-secondary/10" },
            { label: "Completed", value: 0, icon: CheckSquare, color: "text-primary", bg: "bg-primary/10" },
            { label: "Messages", value: 0, icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-400/10" },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{card.label}</span>
                  <div className={`w-7 h-7 ${card.bg} rounded-lg flex items-center justify-center`}>
                    <Icon size={13} className={card.color} />
                  </div>
                </div>
                <span className="text-3xl font-extrabold" style={{ fontFamily: "Sora, sans-serif" }}>{card.value}</span>
              </div>
            );
          })}
        </div>

        {/* Empty state for projects */}
        <div className="bg-card border border-border rounded-xl p-8">
          <h2 className="font-bold text-sm mb-6" style={{ fontFamily: "Sora, sans-serif" }}>Assigned Projects</h2>
          <div className="text-center py-8 text-muted-foreground">
            <Clock size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No projects assigned yet.</p>
            <p className="text-xs mt-1">An admin will assign projects to you shortly.</p>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
