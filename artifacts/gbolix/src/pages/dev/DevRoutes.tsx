import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Globe, Lock, Shield, ArrowUpRight, Terminal, X } from "lucide-react";

// ─── Route registry ──────────────────────────────────────────────────────────
type Access = "public" | "auth" | "admin";

interface Route {
  path: string;
  name: string;
  description: string;
  access: Access;
  group: string;
}

const ROUTES: Route[] = [
  // Public
  { path: "/",                label: "Home",              name: "Home",              description: "Landing page — hero, services, testimonials, products",        access: "public", group: "Public" },
  { path: "/about",           label: "About",             name: "About",             description: "Company overview, services, products, GEO-optimized content",   access: "public", group: "Public" },
  { path: "/contact",         label: "Contact",           name: "Contact",           description: "Contact form with email, social links, 24hr response time",     access: "public", group: "Public" },
  { path: "/services",        label: "Services",          name: "Services",          description: "Full service catalog with categories and pricing overview",      access: "public", group: "Public" },
  { path: "/products",        label: "Products",          name: "Products",          description: "Product showcase with waitlist sign-up for coming-soon tools",   access: "public", group: "Public" },
  { path: "/pricing",         label: "Pricing",           name: "Pricing",           description: "Per-service pricing page with fixed and custom tiers",          access: "public", group: "Public" },
  // Auth
  { path: "/sign-in",         label: "Sign In",           name: "SignInPage",        description: "Clerk-powered login — redirects to /dashboard if signed in",    access: "public", group: "Auth" },
  { path: "/sign-up",         label: "Sign Up",           name: "SignUpPage",        description: "Clerk-powered registration — leads to /onboarding after signup", access: "public", group: "Auth" },
  { path: "/onboarding",      label: "Onboarding",        name: "OnboardingRoute",   description: "4-step required flow: userType, location, companySize, source",  access: "auth",   group: "Auth" },
  // Client portal
  { path: "/dashboard",       label: "Dashboard",         name: "Dashboard",         description: "Client portal home — summary cards, active tasks, activity feed", access: "auth",  group: "Client Portal" },
  { path: "/tasks",           label: "My Tasks",          name: "Tasks",             description: "Filterable project/task table for the logged-in client",         access: "auth",   group: "Client Portal" },
  { path: "/files",           label: "Files",             name: "Files",             description: "Upload, download, and delete project delivery files",            access: "auth",   group: "Client Portal" },
  { path: "/messages",        label: "Messages",          name: "Messages",          description: "Project-scoped chat — admin must start conversation first",      access: "auth",   group: "Client Portal" },
  { path: "/profile",         label: "Profile",           name: "Profile",           description: "Editable user profile — name, company, location fields",        access: "auth",   group: "Client Portal" },
  { path: "/new-request",     label: "New Request",       name: "NewRequest",        description: "3-step wizard: select service → fill details → confirmation",   access: "auth",   group: "Client Portal" },
  // Admin
  { path: "/admin/dashboard", label: "Admin Dashboard",  name: "AdminDashboard",   description: "KPIs, recent project requests, platform-wide stats",            access: "admin",   group: "Admin Portal" },
  { path: "/admin/users",     label: "Admin Users",      name: "AdminUsers",       description: "Searchable user table — view roles, onboarding status",         access: "admin",   group: "Admin Portal" },
  { path: "/admin/projects",  label: "Admin Projects",   name: "AdminProjects",    description: "Update status, priority, notes — start client conversations",   access: "admin",   group: "Admin Portal" },
  { path: "/admin/messages",  label: "Admin Messages",   name: "AdminMessages",    description: "Reply to all active project chat threads",                      access: "admin",   group: "Admin Portal" },
  { path: "/admin/files",     label: "Admin Files",      name: "AdminFiles",       description: "View and delete any file across all client projects",           access: "admin",   group: "Admin Portal" },
  { path: "/admin/insights",  label: "Admin Insights",   name: "AdminInsights",    description: "Charts: user type, acquisition, location + AI summary",        access: "admin",   group: "Admin Portal" },
  // Dev
  { path: "/dev/routes",      label: "Dev: Routes",      name: "DevRoutes",        description: "This page — route registry, path, access, one-click navigate", access: "public",  group: "Dev" },
] as (Route & { label: string })[];

// ─── Access config ─────────────────────────────────────────────────────────
const ACCESS: Record<Access, { label: string; color: string; bg: string; border: string; Icon: typeof Globe }> = {
  public: { label: "Public", color: "#4ADE80", bg: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.2)",  Icon: Globe  },
  auth:   { label: "Auth",   color: "#38BDF8", bg: "rgba(56,189,248,0.1)",  border: "rgba(56,189,248,0.2)",  Icon: Lock   },
  admin:  { label: "Admin",  color: "#C084FC", bg: "rgba(192,132,252,0.1)", border: "rgba(192,132,252,0.2)", Icon: Shield },
};

const GROUP_COLOR: Record<string, string> = {
  "Public":        "#6B7280",
  "Auth":          "#FBBF24",
  "Client Portal": "#38BDF8",
  "Admin Portal":  "#C084FC",
  "Dev":           "#4ADE80",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function DevRoutes() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? ROUTES.filter(r =>
        r.path.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r as any).label?.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.group.toLowerCase().includes(q) ||
        r.access.toLowerCase().includes(q)
      )
    : ROUTES;

  const groups = [...new Set(ROUTES.map(r => r.group))].filter(g => filtered.some(r => r.group === g));

  return (
    <div style={{ minHeight: "100vh", background: "#070A0F", color: "#E5E7EB", fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}>

      {/* Top bar */}
      <div style={{ borderBottom: "1px solid #111827", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#070A0F", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Terminal size={14} color="#4ADE80" />
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB" }}>Route Registry</span>
            <span style={{ fontSize: 10, color: "#374151", marginLeft: 10 }}>/dev/routes · {ROUTES.length} routes registered</span>
          </div>
        </div>
        <button
          onClick={() => navigate("/")}
          style={{ background: "none", border: "1px solid #1F2937", borderRadius: 6, padding: "5px 12px", color: "#6B7280", fontSize: 11, cursor: "pointer" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#374151"; (e.currentTarget as HTMLElement).style.color = "#9CA3AF"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1F2937"; (e.currentTarget as HTMLElement).style.color = "#6B7280"; }}
        >
          ← Back to App
        </button>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 32 }}>
          <Search size={14} color="#4B5563" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by path, name, group, or access level…"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "#0D1117", border: "1px solid #1F2937", borderRadius: 10,
              padding: "11px 40px 11px 38px", fontSize: 13, color: "#E5E7EB",
              outline: "none", transition: "border-color .15s",
              fontFamily: "inherit",
            }}
            onFocus={e => (e.target.style.borderColor = "rgba(74,222,128,0.4)")}
            onBlur={e => (e.target.style.borderColor = "#1F2937")}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4B5563", padding: 2 }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Access legend */}
        <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
          {(Object.entries(ACCESS) as [Access, typeof ACCESS[Access]][]).map(([key, cfg]) => {
            const Icon = cfg.Icon;
            const count = ROUTES.filter(r => r.access === key).length;
            return (
              <button
                key={key}
                onClick={() => setQuery(q === key ? "" : key)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: q === key ? cfg.bg : "transparent",
                  border: `1px solid ${q === key ? cfg.border : "#1F2937"}`,
                  borderRadius: 8, padding: "5px 12px", cursor: "pointer",
                  color: q === key ? cfg.color : "#6B7280", fontSize: 11,
                  transition: "all .15s", fontFamily: "inherit",
                }}
                onMouseEnter={e => { if (q !== key) { (e.currentTarget as HTMLElement).style.borderColor = cfg.border; (e.currentTarget as HTMLElement).style.color = cfg.color; } }}
                onMouseLeave={e => { if (q !== key) { (e.currentTarget as HTMLElement).style.borderColor = "#1F2937"; (e.currentTarget as HTMLElement).style.color = "#6B7280"; } }}
              >
                <Icon size={10} />
                {cfg.label}
                <span style={{ color: "inherit", opacity: 0.6, marginLeft: 2 }}>{count}</span>
              </button>
            );
          })}
          {q && (
            <span style={{ fontSize: 11, color: "#4B5563", display: "flex", alignItems: "center", gap: 4 }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{q}"
            </span>
          )}
        </div>

        {/* Route groups */}
        {groups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#374151", fontSize: 13 }}>
            No routes match "{query}"
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {groups.map(group => {
              const groupRoutes = filtered.filter(r => r.group === group);
              const color = GROUP_COLOR[group] ?? "#6B7280";
              return (
                <div key={group} style={{ border: "1px solid #111827", borderRadius: 12, overflow: "hidden" }}>
                  {/* Group header */}
                  <div style={{ padding: "9px 16px", background: "#0D1117", borderBottom: "1px solid #111827", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 3, height: 14, borderRadius: 2, background: color }} />
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color }}>{group}</span>
                    <span style={{ fontSize: 10, color: "#374151", marginLeft: 2 }}>{groupRoutes.length}</span>
                  </div>

                  {/* Column headers */}
                  <div style={{ display: "grid", gridTemplateColumns: "200px 80px 1fr 90px", gap: 0, padding: "7px 16px", borderBottom: "1px solid #0D1117", background: "#070A0F" }}>
                    {["PATH", "ACCESS", "DESCRIPTION", ""].map((h, i) => (
                      <span key={i} style={{ fontSize: 9, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>
                    ))}
                  </div>

                  {/* Rows */}
                  {groupRoutes.map((route, idx) => {
                    const cfg = ACCESS[route.access];
                    const Icon = cfg.Icon;
                    const isLast = idx === groupRoutes.length - 1;
                    return (
                      <div
                        key={route.path}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "200px 80px 1fr 90px",
                          gap: 0,
                          padding: "12px 16px",
                          alignItems: "center",
                          borderBottom: isLast ? "none" : "1px solid #0D1117",
                          transition: "background .12s",
                          cursor: "default",
                        }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#0D1117")}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                      >
                        {/* Path + name */}
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#F9FAFB" }}>{route.path}</div>
                          <div style={{ fontSize: 10, color: "#4B5563", marginTop: 2 }}>{(route as any).label}</div>
                        </div>

                        {/* Access badge */}
                        <div>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            background: cfg.bg, border: `1px solid ${cfg.border}`,
                            borderRadius: 5, padding: "2px 7px",
                            fontSize: 9, fontWeight: 700, color: cfg.color, letterSpacing: "0.04em",
                          }}>
                            <Icon size={8} />
                            {cfg.label}
                          </span>
                        </div>

                        {/* Description */}
                        <div style={{ fontSize: 11, color: "#6B7280", paddingRight: 16, lineHeight: 1.5 }}>
                          {route.description}
                        </div>

                        {/* Action */}
                        <div>
                          <button
                            onClick={() => navigate(route.path)}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              background: "transparent", border: "1px solid #1F2937",
                              borderRadius: 6, padding: "5px 10px",
                              fontSize: 10, color: "#6B7280", cursor: "pointer",
                              transition: "all .15s", fontFamily: "inherit",
                              whiteSpace: "nowrap",
                            }}
                            onMouseEnter={e => {
                              const el = e.currentTarget as HTMLElement;
                              el.style.background = cfg.bg;
                              el.style.borderColor = cfg.border;
                              el.style.color = cfg.color;
                            }}
                            onMouseLeave={e => {
                              const el = e.currentTarget as HTMLElement;
                              el.style.background = "transparent";
                              el.style.borderColor = "#1F2937";
                              el.style.color = "#6B7280";
                            }}
                          >
                            Open <ArrowUpRight size={9} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
