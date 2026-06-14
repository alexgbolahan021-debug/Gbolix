import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Terminal, Search, X, Globe, Lock, Shield, ArrowUpRight, Layers, ChevronRight } from "lucide-react";

if (!import.meta.env.DEV) {
  // Render nothing in production at module level check
}

// ─── Route registry ───────────────────────────────────────────────────────────
type Access = "public" | "auth" | "admin";

interface Route {
  path: string;
  label: string;
  description: string;
  access: Access;
  group: string;
}

const ROUTES: Route[] = [
  { path: "/",                label: "Home",             description: "Landing page — hero, services, testimonials, products",              access: "public", group: "Public" },
  { path: "/about",           label: "About",            description: "Company overview and GEO-optimized content",                         access: "public", group: "Public" },
  { path: "/contact",         label: "Contact",          description: "Contact form with email and social links",                           access: "public", group: "Public" },
  { path: "/services",        label: "Services",         description: "Full service catalog with categories and pricing",                   access: "public", group: "Public" },
  { path: "/products",        label: "Products",         description: "Product showcase with waitlist sign-up",                            access: "public", group: "Public" },
  { path: "/pricing",         label: "Pricing",          description: "Per-service pricing page",                                          access: "public", group: "Public" },
  { path: "/sign-in",         label: "Sign In",          description: "Clerk-powered login page",                                          access: "public", group: "Auth" },
  { path: "/sign-up",         label: "Sign Up",          description: "Clerk-powered registration page",                                   access: "public", group: "Auth" },
  { path: "/onboarding",      label: "Onboarding",       description: "4-step required flow after sign-up",                                access: "auth",   group: "Auth" },
  { path: "/dashboard",       label: "Dashboard",        description: "Client portal home — summary cards, tasks, activity",               access: "auth",   group: "Client Portal" },
  { path: "/tasks",           label: "My Tasks",         description: "Filterable project/task table",                                     access: "auth",   group: "Client Portal" },
  { path: "/files",           label: "Files",            description: "Upload, download, and delete project files",                        access: "auth",   group: "Client Portal" },
  { path: "/messages",        label: "Messages",         description: "Project-scoped chat with admin team",                               access: "auth",   group: "Client Portal" },
  { path: "/profile",         label: "Profile",          description: "Editable user profile page",                                        access: "auth",   group: "Client Portal" },
  { path: "/new-request",     label: "New Request",      description: "3-step wizard: select service → details → confirm",                 access: "auth",   group: "Client Portal" },
  { path: "/admin/dashboard", label: "Admin Dashboard",  description: "KPIs, recent requests, platform stats",                            access: "admin",  group: "Admin Portal" },
  { path: "/admin/users",     label: "Admin Users",      description: "Searchable user table with role management",                        access: "admin",  group: "Admin Portal" },
  { path: "/admin/projects",  label: "Admin Projects",   description: "Update status, priority, notes, start conversations",               access: "admin",  group: "Admin Portal" },
  { path: "/admin/messages",  label: "Admin Messages",   description: "Reply to all active project chat threads",                          access: "admin",  group: "Admin Portal" },
  { path: "/admin/files",     label: "Admin Files",      description: "View and delete files across all projects",                         access: "admin",  group: "Admin Portal" },
  { path: "/admin/insights",  label: "Admin Insights",   description: "Charts: user type, acquisition, location + AI summary",            access: "admin",  group: "Admin Portal" },
  { path: "/dev/routes",      label: "Dev: Route Registry", description: "Full route reference page",                                     access: "public", group: "Dev" },
];

const ACCESS: Record<Access, { label: string; color: string; bg: string; border: string; Icon: typeof Globe }> = {
  public: { label: "Public", color: "#4ADE80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.25)",  Icon: Globe  },
  auth:   { label: "Auth",   color: "#38BDF8", bg: "rgba(56,189,248,0.12)",  border: "rgba(56,189,248,0.25)",  Icon: Lock   },
  admin:  { label: "Admin",  color: "#C084FC", bg: "rgba(192,132,252,0.12)", border: "rgba(192,132,252,0.25)", Icon: Shield },
};

const GROUP_COLOR: Record<string, string> = {
  "Public":        "#9CA3AF",
  "Auth":          "#FBBF24",
  "Client Portal": "#38BDF8",
  "Admin Portal":  "#C084FC",
  "Dev":           "#4ADE80",
};

// ─── Route panel (command palette) ───────────────────────────────────────────
function RoutePanel({ onClose }: { onClose: () => void }) {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? ROUTES.filter(r =>
        r.path.toLowerCase().includes(q) ||
        r.label.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.group.toLowerCase().includes(q) ||
        r.access.toLowerCase().includes(q)
      )
    : ROUTES;

  const groups = [...new Set(ROUTES.map(r => r.group))].filter(g => filtered.some(r => r.group === g));

  // Reset cursor when query changes
  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const go = useCallback((path: string) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
      if (e.key === "Enter" && filtered[cursor]) { go(filtered[cursor].path); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filtered, cursor, go, onClose]);

  // Scroll cursor into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const flatIdx = (route: Route) => filtered.indexOf(route);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          zIndex: 99998, backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed", top: "8vh", left: "50%", transform: "translateX(-50%)",
          width: "min(760px, 94vw)", maxHeight: "78vh",
          background: "#0D1117", border: "1px solid #1F2937",
          borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(74,222,128,0.07)",
          zIndex: 99999, display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Search header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid #111827", flexShrink: 0 }}>
          <Search size={15} color="#4B5563" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search routes by path, name, group or access…"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#F9FAFB", fontSize: 14,
              fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
            }}
          />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {query && (
              <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#4B5563", padding: 2 }}>
                <X size={13} />
              </button>
            )}
            <span style={{ fontSize: 10, color: "#374151", padding: "2px 6px", border: "1px solid #1F2937", borderRadius: 4 }}>esc</span>
          </div>
        </div>

        {/* Access filters */}
        <div style={{ display: "flex", gap: 6, padding: "8px 16px", borderBottom: "1px solid #0D1117", flexShrink: 0 }}>
          {(Object.entries(ACCESS) as [Access, typeof ACCESS[Access]][]).map(([key, cfg]) => {
            const Icon = cfg.Icon;
            const active = q === key;
            return (
              <button
                key={key}
                onClick={() => setQuery(active ? "" : key)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  background: active ? cfg.bg : "transparent",
                  border: `1px solid ${active ? cfg.border : "#1F2937"}`,
                  borderRadius: 6, padding: "3px 10px",
                  color: active ? cfg.color : "#6B7280", fontSize: 10,
                  cursor: "pointer", fontFamily: "monospace", transition: "all .12s",
                }}
              >
                <Icon size={9} />{cfg.label} {ROUTES.filter(r => r.access === key).length}
              </button>
            );
          })}
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#374151", alignSelf: "center" }}>
            {filtered.length} / {ROUTES.length}
          </span>
        </div>

        {/* Route list */}
        <div ref={listRef} style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center", color: "#374151", fontSize: 13, fontFamily: "monospace" }}>
              No routes match "{query}"
            </div>
          ) : (
            groups.map(group => (
              <div key={group}>
                <div style={{
                  padding: "6px 16px 4px",
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                  color: GROUP_COLOR[group] ?? "#6B7280",
                  background: "#070A0F", position: "sticky", top: 0,
                  borderBottom: "1px solid #0D1117", fontFamily: "monospace",
                }}>
                  {group} · {filtered.filter(r => r.group === group).length}
                </div>
                {filtered.filter(r => r.group === group).map(route => {
                  const cfg = ACCESS[route.access];
                  const Icon = cfg.Icon;
                  const idx = flatIdx(route);
                  const isActive = idx === cursor;
                  const isCurrent = location === route.path;
                  return (
                    <div
                      key={route.path}
                      data-idx={idx}
                      onClick={() => go(route.path)}
                      onMouseEnter={() => setCursor(idx)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 16px", cursor: "pointer",
                        background: isActive ? "#111827" : "transparent",
                        borderBottom: "1px solid #0D1117",
                        transition: "background .08s",
                      }}
                    >
                      {/* Active indicator */}
                      <div style={{ width: 3, height: 32, borderRadius: 2, flexShrink: 0, background: isActive ? cfg.color : "transparent", transition: "background .08s" }} />

                      {/* Path + label */}
                      <div style={{ minWidth: 170, flexShrink: 0 }}>
                        <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: isCurrent ? "#4ADE80" : "#F9FAFB" }}>
                          {route.path}
                          {isCurrent && <span style={{ fontSize: 9, color: "#4ADE8070", marginLeft: 6 }}>current</span>}
                        </div>
                        <div style={{ fontSize: 10, color: "#6B7280", marginTop: 1 }}>{route.label}</div>
                      </div>

                      {/* Access badge */}
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                        borderRadius: 5, padding: "2px 7px",
                        fontSize: 9, fontWeight: 700, color: cfg.color,
                        flexShrink: 0,
                      }}>
                        <Icon size={8} />{cfg.label}
                      </span>

                      {/* Description */}
                      <div style={{ flex: 1, fontSize: 11, color: "#6B7280", lineHeight: 1.4 }}>{route.description}</div>

                      {/* Arrow */}
                      <ArrowUpRight size={13} color={isActive ? cfg.color : "#374151"} style={{ flexShrink: 0, transition: "color .08s" }} />
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div style={{
          padding: "7px 16px", borderTop: "1px solid #111827", flexShrink: 0,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ fontSize: 9, color: "#374151", fontFamily: "monospace" }}>
            {ROUTES.length} routes · dev only
          </div>
          <div style={{ display: "flex", gap: 10, fontSize: 9, color: "#374151" }}>
            {[["↑↓", "navigate"], ["↵", "open"], ["esc", "close"]].map(([k, v]) => (
              <span key={k}><span style={{ padding: "1px 4px", border: "1px solid #1F2937", borderRadius: 3, marginRight: 3 }}>{k}</span>{v}</span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Dev Toolbar ──────────────────────────────────────────────────────────────
export function DevToolbar() {
  if (!import.meta.env.DEV) return null;

  const [panelOpen, setPanelOpen] = useState(false);
  const [location] = useLocation();

  const currentRoute = ROUTES.find(r => r.path === location);
  const currentAccess = currentRoute ? ACCESS[currentRoute.access] : null;

  // Global keyboard shortcut: ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPanelOpen(v => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      {/* Toolbar pill */}
      <div
        style={{
          position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 99990, display: "flex", alignItems: "center",
          background: "#0D1117",
          border: "1px solid #1F2937",
          borderRadius: 999,
          boxShadow: "0 4px 24px rgba(0,0,0,0.7), 0 0 0 1px rgba(74,222,128,0.06)",
          padding: "5px 6px",
          gap: 4,
          userSelect: "none",
        }}
      >
        {/* DEV badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)",
          borderRadius: 999, padding: "3px 10px",
          fontSize: 10, fontWeight: 700, color: "#4ADE80",
          fontFamily: "monospace", letterSpacing: "0.06em",
        }}>
          <Terminal size={10} />
          DEV
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: "#1F2937", margin: "0 2px" }} />

        {/* Current route indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "3px 10px", borderRadius: 999,
          fontSize: 11, fontFamily: "monospace",
          color: currentAccess ? currentAccess.color : "#6B7280",
        }}>
          {currentAccess && <currentAccess.Icon size={9} />}
          <span style={{ color: "#9CA3AF" }}>{location}</span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: "#1F2937", margin: "0 2px" }} />

        {/* Routes button */}
        <button
          onClick={() => setPanelOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: panelOpen ? "rgba(74,222,128,0.12)" : "transparent",
            border: `1px solid ${panelOpen ? "rgba(74,222,128,0.3)" : "transparent"}`,
            borderRadius: 999, padding: "3px 12px",
            fontSize: 11, fontFamily: "monospace",
            color: panelOpen ? "#4ADE80" : "#9CA3AF", cursor: "pointer",
            transition: "all .15s",
          }}
          onMouseEnter={e => {
            if (!panelOpen) {
              (e.currentTarget as HTMLElement).style.background = "#111827";
              (e.currentTarget as HTMLElement).style.color = "#F9FAFB";
            }
          }}
          onMouseLeave={e => {
            if (!panelOpen) {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "#9CA3AF";
            }
          }}
        >
          <Layers size={11} />
          Routes
          <ChevronRight size={9} style={{ opacity: 0.4 }} />
          <span style={{
            fontSize: 9, padding: "1px 4px",
            border: "1px solid #1F2937", borderRadius: 3, color: "#4B5563",
          }}>⌘K</span>
        </button>
      </div>

      {/* Route panel */}
      {panelOpen && <RoutePanel onClose={() => setPanelOpen(false)} />}
    </>
  );
}
