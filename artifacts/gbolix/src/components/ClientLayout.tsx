import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useGetMe } from "@workspace/api-client-react";
import { useTheme } from "@/hooks/use-theme";
import {
  LayoutDashboard, ListTodo, Files, Zap, Wallet, HelpCircle,
  User, LogOut, ChevronLeft, ChevronRight, Moon, Sun, Shield, MessageSquare
} from "lucide-react";
import { useState } from "react";

type NavItem = { href: string; label: string; icon: React.ElementType; soon?: boolean };
type NavGroup = { section: string; items: NavItem[] };

const clientNav: NavGroup[] = [
  { section: "WORKSPACE", items: [
    { href: "/dashboard",   label: "Dashboard",  icon: LayoutDashboard },
    { href: "/tasks",       label: "My Tasks",   icon: ListTodo },
    { href: "/files",       label: "Files",      icon: Files },
    { href: "/messages",    label: "Messages",   icon: MessageSquare },
    { href: "/new-request", label: "New Request", icon: Zap },
  ]},
  { section: "PRODUCTS", items: [
    { href: "#", label: "Gbolix Tools", icon: Zap,    soon: true },
    { href: "#", label: "Wallet",       icon: Wallet, soon: true },
  ]},
  { section: "SUPPORT", items: [
    { href: "#", label: "Support Center", icon: HelpCircle, soon: true },
  ]},
];

const adminNav: NavGroup[] = [
  { section: "ADMIN", items: [
    { href: "/admin/dashboard", label: "Dashboard",  icon: LayoutDashboard },
    { href: "/admin/users",     label: "Users",      icon: User },
    { href: "/admin/projects",  label: "Projects",   icon: ListTodo },
    { href: "/admin/messages",  label: "Messages",   icon: MessageSquare },
    { href: "/admin/files",     label: "Files",      icon: Files },
    { href: "/admin/insights",  label: "Insights",   icon: Zap },
  ]},
];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { data: profile } = useGetMe();
  const { theme, setTheme } = useTheme();
  const isAdmin = profile?.role === "admin";
  const nav = isAdmin ? adminNav : clientNav;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`relative flex flex-col border-r border-border bg-sidebar transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-3 border-b border-border shrink-0">
          {collapsed ? (
            <img
              src="/logo-g-icon.png"
              alt="G"
              className="h-9 w-9 object-contain rounded-lg"
            />
          ) : (
            <img
              src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
              alt="Gbolix"
              className="h-9 w-auto object-contain"
            />
          )}
        </div>

        {/* Admin badge (expanded only) */}
        {isAdmin && !collapsed && (
          <div className="mx-3 mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20">
            <Shield size={11} className="text-secondary" />
            <span className="text-[10px] text-secondary font-bold uppercase tracking-widest">Admin Portal</span>
          </div>
        )}
        {isAdmin && collapsed && (
          <div className="flex justify-center mt-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center">
              <Shield size={12} className="text-secondary" />
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 px-2 py-4">
          {nav.map(group => (
            <div key={group.section} className="mb-4">
              {!collapsed && (
                <p className="px-2 mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  {group.section}
                </p>
              )}
              {group.items.map(item => {
                const Icon = item.icon;
                const active = location === item.href;
                return (
                  <Link key={item.label} href={item.href}>
                    <div
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-2 py-2 rounded-md mb-1 transition-colors cursor-pointer
                        ${active ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"}
                        ${item.soon ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}
                        ${collapsed ? "justify-center" : ""}
                      `}
                    >
                      <Icon size={16} className="shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="text-sm font-medium truncate">{item.label}</span>
                          {item.soon && (
                            <span className="ml-auto text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Soon</span>
                          )}
                        </>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </ScrollArea>

        {/* Account section */}
        <div className="border-t border-border p-2 space-y-1 shrink-0">
          <Link href="/profile">
            <div
              className={`flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${collapsed ? "justify-center" : ""}`}
              data-testid="nav-profile"
              title={collapsed ? "Profile" : undefined}
            >
              <User size={16} className="shrink-0" />
              {!collapsed && <span className="text-sm font-medium">Profile</span>}
            </div>
          </Link>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${collapsed ? "justify-center" : ""}`}
            data-testid="button-theme-toggle"
            title={collapsed ? (theme === "dark" ? "Light Mode" : "Dark Mode") : undefined}
          >
            {theme === "dark" ? <Sun size={16} className="shrink-0" /> : <Moon size={16} className="shrink-0" />}
            {!collapsed && <span className="text-sm font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </button>
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ${collapsed ? "justify-center" : ""}`}
            data-testid="button-sign-out"
            title={collapsed ? "Sign Out" : undefined}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-32 -right-3 bg-background border border-border rounded-full p-1 shadow-sm hover:bg-accent transition-colors z-10"
          data-testid="button-sidebar-toggle"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
