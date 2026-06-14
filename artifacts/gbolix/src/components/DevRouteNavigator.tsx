import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Terminal, Search, X, ChevronDown, Lock, Shield, Globe, ExternalLink } from "lucide-react";

// ─── Route registry ──────────────────────────────────────────────────────────
export type RouteAccess = "public" | "authenticated" | "admin";

export interface RouteEntry {
  path: string;
  label: string;
  description: string;
  access: RouteAccess;
  implemented: boolean;
  group: string;
}

export const ALL_ROUTES: RouteEntry[] = [
  // Public
  { path: "/",               label: "Home",                description: "Public landing page with hero, services, testimonials, and products.",   access: "public",        implemented: true,  group: "Public" },
  { path: "/about",          label: "About",               description: "GEO-optimized company info page.",                                        access: "public",        implemented: true,  group: "Public" },
  { path: "/contact",        label: "Contact",             description: "Contact form with email and social links.",                               access: "public",        implemented: true,  group: "Public" },
  { path: "/services",       label: "Services",            description: "Full services catalog with pricing tiers.",                               access: "public",        implemented: true,  group: "Public" },
  { path: "/products",       label: "Products",            description: "Product showcase with waitlist sign-up.",                                 access: "public",        implemented: true,  group: "Public" },
  { path: "/pricing",        label: "Pricing",             description: "Per-service pricing page.",                                               access: "public",        implemented: true,  group: "Public" },
  // Auth flows
  { path: "/sign-in",        label: "Sign In",             description: "Clerk-powered login page.",                                               access: "public",        implemented: true,  group: "Auth" },
  { path: "/sign-up",        label: "Sign Up",             description: "Clerk-powered registration page.",                                        access: "public",        implemented: true,  group: "Auth" },
  { path: "/onboarding",     label: "Onboarding",          description: "4-step required flow after signup (userType, location, companySize, acquisitionSource).", access: "authenticated", implemented: true, group: "Auth" },
  // Client portal
  { path: "/dashboard",      label: "Dashboard",           description: "Client portal home: summary cards, active tasks, recent activity.",       access: "authenticated", implemented: true,  group: "Client Portal" },
  { path: "/tasks",          label: "My Tasks",            description: "Filterable project/task table for the logged-in client.",                 access: "authenticated", implemented: true,  group: "Client Portal" },
  { path: "/files",          label: "Files",               description: "Upload, download, and delete project files.",                             access: "authenticated", implemented: true,  group: "Client Portal" },
  { path: "/messages",       label: "Messages",            description: "Project-scoped chat with admin team.",                                    access: "authenticated", implemented: true,  group: "Client Portal" },
  { path: "/profile",        label: "Profile",             description: "Editable user profile page.",                                             access: "authenticated", implemented: true,  group: "Client Portal" },
  { path: "/new-request",    label: "New Request",         description: "3-step wizard: select service → details → confirmation.",                 access: "authenticated", implemented: true,  group: "Client Portal" },
  // Admin portal
  { path: "/admin/dashboard", label: "Admin Dashboard",   description: "KPIs, recent requests, and platform stats.",                              access: "admin",         implemented: true,  group: "Admin Portal" },
  { path: "/admin/users",    label: "Admin Users",         description: "Searchable user table with role management.",                             access: "admin",         implemented: true,  group: "Admin Portal" },
  { path: "/admin/projects", label: "Admin Projects",      description: "Update project status, priority, notes, start conversations.",            access: "admin",         implemented: true,  group: "Admin Portal" },
  { path: "/admin/messages", label: "Admin Messages",      description: "Reply to all project chat threads.",                                      access: "admin",         implemented: true,  group: "Admin Portal" },
  { path: "/admin/files",    label: "Admin Files",         description: "View and delete all uploaded files.",                                     access: "admin",         implemented: true,  group: "Admin Portal" },
  { path: "/admin/insights", label: "Admin Insights",      description: "Charts: user type, acquisition, location, company size + AI summary.",   access: "admin",         implemented: true,  group: "Admin Portal" },
  // Dev tools
  { path: "/dev/routes",     label: "Dev: Routes",         description: "Full route reference page — all routes, auth requirements, user status.", access: "public",        implemented: true,  group: "Dev Tools" },
];

// ─── Access badge ─────────────────────────────────────────────────────────────
const ACCESS_CONFIG: Record<RouteAccess, { label: string; color: string; Icon: typeof Globe }> = {
  public:        { label: "Public",    color: "#00FF66", Icon: Globe },
  authenticated: { label: "Auth",      color: "#22D3EE", Icon: Lock },
  admin:         { label: "Admin",     color: "#A855F7", Icon: Shield },
};

function AccessBadge({ access, mini = false }: { access: RouteAccess; mini?: boolean }) {
  const { label, color, Icon } = ACCESS_CONFIG[access];
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30`, fontSize: mini ? 9 : 10 }}
    >
      <Icon size={mini ? 8 : 9} />
      {label}
    </span>
  );
}

// ─── Group colour strip ───────────────────────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  "Public":        "#6B7280",
  "Auth":          "#F59E0B",
  "Client Portal": "#22D3EE",
  "Admin Portal":  "#A855F7",
  "Dev Tools":     "#00FF66",
};

// ─── Main component ───────────────────────────────────────────────────────────
export function DevRouteNavigator() {
  if (!import.meta.env.DEV) return null;

  const [, navigate] = useLocation();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? ALL_ROUTES.filter(r =>
        r.path.toLowerCase().includes(query.toLowerCase()) ||
        r.label.toLowerCase().includes(query.toLowerCase()) ||
        r.group.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_ROUTES;

  const groups = [...new Set(filtered.map(r => r.group))];

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setOpen(v => !v); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: "fixed", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 99999 }}
    >
      {/* Trigger pill */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#0B0F14", border: "1px solid #00FF6640",
          borderRadius: 999, padding: "5px 14px 5px 10px",
          color: "#00FF66", fontSize: 11, fontFamily: "monospace",
          cursor: "pointer", boxShadow: "0 2px 12px rgba(0,255,102,0.2)",
          whiteSpace: "nowrap",
        }}
      >
        <Terminal size={12} style={{ flexShrink: 0 }} />
        <span style={{ color: "#6B7280" }}>DEV</span>
        <span style={{ color: "#4B5563" }}>›</span>
        <span>{ALL_ROUTES.find(r => r.path === location)?.label ?? location}</span>
        <ChevronDown size={11} style={{ color: "#4B5563", marginLeft: 2, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        <span style={{ color: "#374151", fontSize: 9, marginLeft: 4, paddingLeft: 6, borderLeft: "1px solid #1F2937" }}>⌘K</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
            width: 380, maxHeight: 480, overflowY: "auto",
            background: "#0B0F14", border: "1px solid #1F2937",
            borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,255,102,0.06)",
            display: "flex", flexDirection: "column",
          }}
        >
          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid #1F2937", flexShrink: 0 }}>
            <Search size={13} style={{ color: "#4B5563", flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search routes…"
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#E5E7EB", fontSize: 12, fontFamily: "monospace",
              }}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#4B5563", padding: 0 }}>
                <X size={12} />
              </button>
            )}
            <a
              href="/dev/routes"
              onClick={e => { e.preventDefault(); navigate("/dev/routes"); setOpen(false); }}
              style={{ color: "#4B5563", display: "flex", alignItems: "center", padding: 0, background: "none", border: "none", cursor: "pointer" }}
              title="Open full routes page"
            >
              <ExternalLink size={11} />
            </a>
          </div>

          {/* Route list */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {groups.length === 0 && (
              <div style={{ padding: "20px 12px", textAlign: "center", color: "#4B5563", fontSize: 12 }}>
                No routes match "{query}"
              </div>
            )}
            {groups.map(group => (
              <div key={group}>
                <div style={{
                  padding: "6px 12px 4px",
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                  color: GROUP_COLORS[group] ?? "#6B7280",
                  textTransform: "uppercase", position: "sticky", top: 0,
                  background: "#0B0F14", borderBottom: "1px solid #111827",
                }}>
                  {group}
                </div>
                {filtered.filter(r => r.group === group).map(route => {
                  const active = location === route.path;
                  return (
                    <button
                      key={route.path}
                      onClick={() => { navigate(route.path); setOpen(false); setQuery(""); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        width: "100%", padding: "7px 12px", border: "none", cursor: "pointer",
                        background: active ? "rgba(0,255,102,0.07)" : "transparent",
                        textAlign: "left", transition: "background .1s",
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#111827"; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <div
                        style={{
                          width: 3, height: 28, borderRadius: 2, flexShrink: 0,
                          background: active ? "#00FF66" : GROUP_COLORS[group] ?? "#374151",
                          opacity: active ? 1 : 0.4,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ fontFamily: "monospace", fontSize: 11, color: active ? "#00FF66" : "#E5E7EB", fontWeight: active ? 600 : 400 }}>
                            {route.path}
                          </span>
                          <AccessBadge access={route.access} mini />
                        </div>
                        <span style={{ fontSize: 10, color: "#6B7280", display: "block", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                          {route.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            padding: "6px 12px", borderTop: "1px solid #111827", flexShrink: 0,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 9, color: "#374151", fontFamily: "monospace" }}>
              {ALL_ROUTES.length} routes · dev only
            </span>
            <div style={{ display: "flex", gap: 8, fontSize: 9, color: "#374151" }}>
              <span>↑↓ navigate</span>
              <span>↵ go</span>
              <span>esc close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
