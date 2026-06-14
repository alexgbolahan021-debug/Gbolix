import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { ALL_ROUTES, RouteAccess } from "@/components/DevRouteNavigator";
import { Terminal, Globe, Lock, Shield, CheckCircle2, XCircle, AlertCircle, User, ArrowRight } from "lucide-react";

if (!import.meta.env.DEV) {
  throw new Error("DevRoutes is only available in development mode.");
}

const ACCESS_META: Record<RouteAccess, { label: string; desc: string; color: string; Icon: typeof Globe }> = {
  public:        { label: "Public",         desc: "No auth required",                    color: "#00FF66", Icon: Globe },
  authenticated: { label: "Authenticated",  desc: "Requires Clerk sign-in + onboarding", color: "#22D3EE", Icon: Lock },
  admin:         { label: "Admin Only",     desc: "Requires role = 'admin' in DB",       color: "#A855F7", Icon: Shield },
};

const GROUP_COLORS: Record<string, string> = {
  "Public":        "#6B7280",
  "Auth":          "#F59E0B",
  "Client Portal": "#22D3EE",
  "Admin Portal":  "#A855F7",
  "Dev Tools":     "#00FF66",
};

function StatusDot({ ok, label }: { ok: boolean | undefined; label: string }) {
  if (ok === undefined) return (
    <span className="inline-flex items-center gap-1.5 text-xs text-yellow-400">
      <AlertCircle size={12} /> {label}
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${ok ? "text-green-400" : "text-red-400"}`}>
      {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {label}
    </span>
  );
}

export default function DevRoutes() {
  if (!import.meta.env.DEV) {
    return (
      <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center">
        <p className="text-red-400 font-mono text-sm">This page is only available in development mode.</p>
      </div>
    );
  }

  const [location] = useLocation();
  const { isLoaded, isSignedIn, user } = useUser();
  const { data: profile, isLoading: profileLoading } = useGetMe();

  const groups = [...new Set(ALL_ROUTES.map(r => r.group))];

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white font-mono">
      {/* Header */}
      <div className="border-b border-[#1F2937] px-6 py-4 sticky top-0 bg-[#0B0F14]/95 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#00FF66]/10 rounded-lg border border-[#00FF66]/30 flex items-center justify-center">
              <Terminal size={14} className="text-[#00FF66]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Route Navigator</p>
              <p className="text-[10px] text-[#4B5563]">/dev/routes · development only</p>
            </div>
          </div>
          <Link href="/" className="text-xs text-[#4B5563] hover:text-[#00FF66] transition-colors flex items-center gap-1">
            ← Back to App
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-[300px_1fr] gap-8">
        {/* Left panel — session status */}
        <div className="space-y-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5">
            <p className="text-[10px] text-[#4B5563] uppercase tracking-widest mb-4">Session Status</p>
            <div className="space-y-3">
              <StatusDot ok={isLoaded ? isSignedIn ?? false : undefined} label={isSignedIn ? "Signed In" : isLoaded ? "Signed Out" : "Loading..."} />
              <StatusDot ok={isLoaded && !profileLoading ? !!profile?.onboardingCompleted : undefined} label={profile?.onboardingCompleted ? "Onboarding Complete" : "Onboarding Pending"} />
              <StatusDot ok={isLoaded && !profileLoading ? profile?.role === "admin" : undefined} label={profile?.role === "admin" ? "Admin Role" : "Client Role"} />
            </div>
          </div>

          {isSignedIn && user && (
            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 space-y-2">
              <p className="text-[10px] text-[#4B5563] uppercase tracking-widest mb-3">Active User</p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#22D3EE]/10 border border-[#22D3EE]/20 rounded-lg flex items-center justify-center">
                  <User size={13} className="text-[#22D3EE]" />
                </div>
                <div>
                  <p className="text-xs text-white">{user.fullName ?? user.firstName ?? "—"}</p>
                  <p className="text-[10px] text-[#6B7280]">{user.primaryEmailAddress?.emailAddress}</p>
                </div>
              </div>
              <div className="pt-2 space-y-1.5 text-[10px]">
                <div className="flex justify-between"><span className="text-[#4B5563]">Clerk ID</span><span className="text-[#6B7280] truncate max-w-[130px]">{user.id.slice(0, 14)}…</span></div>
                <div className="flex justify-between"><span className="text-[#4B5563]">Role</span><span style={{ color: profile?.role === "admin" ? "#A855F7" : "#22D3EE" }}>{profile?.role ?? "…"}</span></div>
                <div className="flex justify-between"><span className="text-[#4B5563]">Onboarding</span><span className={profile?.onboardingCompleted ? "text-green-400" : "text-yellow-400"}>{profileLoading ? "…" : profile?.onboardingCompleted ? "done" : "pending"}</span></div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5">
            <p className="text-[10px] text-[#4B5563] uppercase tracking-widest mb-4">Access Levels</p>
            <div className="space-y-3">
              {(Object.entries(ACCESS_META) as [RouteAccess, typeof ACCESS_META[RouteAccess]][]).map(([key, meta]) => {
                const Icon = meta.Icon;
                return (
                  <div key={key} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}30` }}>
                      <Icon size={10} style={{ color: meta.color }} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold" style={{ color: meta.color }}>{meta.label}</p>
                      <p className="text-[10px] text-[#4B5563]">{meta.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick stats */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5">
            <p className="text-[10px] text-[#4B5563] uppercase tracking-widest mb-4">Stats</p>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between"><span className="text-[#6B7280]">Total routes</span><span className="text-white">{ALL_ROUTES.length}</span></div>
              <div className="flex justify-between"><span className="text-[#6B7280]">Public</span><span style={{ color: "#00FF66" }}>{ALL_ROUTES.filter(r => r.access === "public").length}</span></div>
              <div className="flex justify-between"><span className="text-[#6B7280]">Authenticated</span><span style={{ color: "#22D3EE" }}>{ALL_ROUTES.filter(r => r.access === "authenticated").length}</span></div>
              <div className="flex justify-between"><span className="text-[#6B7280]">Admin only</span><span style={{ color: "#A855F7" }}>{ALL_ROUTES.filter(r => r.access === "admin").length}</span></div>
              <div className="flex justify-between"><span className="text-[#6B7280]">Implemented</span><span className="text-green-400">{ALL_ROUTES.filter(r => r.implemented).length}</span></div>
            </div>
          </div>
        </div>

        {/* Right panel — route table */}
        <div className="space-y-6">
          <p className="text-[10px] text-[#4B5563] uppercase tracking-widest">
            {ALL_ROUTES.length} registered routes · <span className="text-[#00FF66]">current: {location}</span>
          </p>

          {groups.map(group => (
            <div key={group} className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden">
              <div
                className="px-4 py-2.5 border-b border-[#1F2937] flex items-center gap-2"
                style={{ borderLeft: `3px solid ${GROUP_COLORS[group] ?? "#374151"}` }}
              >
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: GROUP_COLORS[group] ?? "#6B7280" }}>
                  {group}
                </p>
                <span className="text-[10px] text-[#374151]">
                  {ALL_ROUTES.filter(r => r.group === group).length} routes
                </span>
              </div>

              <div className="divide-y divide-[#111827]">
                {/* Table header */}
                <div className="grid grid-cols-[160px_1fr_100px_80px] gap-3 px-4 py-2 text-[9px] text-[#374151] uppercase tracking-wider">
                  <span>Path</span>
                  <span>Description</span>
                  <span>Access</span>
                  <span>Action</span>
                </div>

                {ALL_ROUTES.filter(r => r.group === group).map(route => {
                  const meta = ACCESS_META[route.access];
                  const Icon = meta.Icon;
                  const isCurrent = location === route.path;
                  return (
                    <div
                      key={route.path}
                      className="grid grid-cols-[160px_1fr_100px_80px] gap-3 px-4 py-3 items-start hover:bg-[#0D1117] transition-colors"
                      style={isCurrent ? { background: "rgba(0,255,102,0.04)" } : {}}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span
                          className="text-xs font-semibold truncate"
                          style={{ color: isCurrent ? "#00FF66" : "#E5E7EB" }}
                        >
                          {route.path}
                        </span>
                        <span className="text-[10px]" style={{ color: "#6B7280" }}>{route.label}</span>
                        {isCurrent && (
                          <span className="text-[9px] text-[#00FF66]/60">← current</span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#6B7280] leading-relaxed">{route.description}</p>

                      <div>
                        <span
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold"
                          style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}25` }}
                        >
                          <Icon size={8} />
                          {meta.label}
                        </span>
                      </div>

                      <div>
                        {route.implemented ? (
                          <Link
                            href={route.path}
                            className="inline-flex items-center gap-1 text-[10px] text-[#4B5563] hover:text-[#00FF66] transition-colors"
                          >
                            Go <ArrowRight size={9} />
                          </Link>
                        ) : (
                          <span className="text-[10px] text-[#374151]">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
