import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useGetMe } from "@workspace/api-client-react";
import { useTheme } from "@/hooks/use-theme";
import {
  LayoutDashboard, ListTodo, Files, Zap, Wallet, HelpCircle,
  User, LogOut, ChevronLeft, ChevronRight, Moon, Sun, Shield
} from "lucide-react";
import { useState } from "react";

type NavItem = { href: string; label: string; icon: React.ElementType; soon?: boolean };
type NavGroup = { section: string; items: NavItem[] };

const clientNav: NavGroup[] = [
  { section: "SERVICES", items: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tasks", label: "My Tasks", icon: ListTodo },
    { href: "/files", label: "Files", icon: Files },
  ]},
  { section: "PRODUCTS", items: [
    { href: "#", label: "Gbolix Tools", icon: Zap, soon: true },
    { href: "#", label: "Wallet", icon: Wallet, soon: true },
  ]},
  { section: "SUPPORT", items: [
    { href: "#", label: "Support Center", icon: HelpCircle },
  ]},
];

const adminNav: NavGroup[] = [
  { section: "ADMIN", items: [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: User },
    { href: "/admin/projects", label: "Projects", icon: ListTodo },
    { href: "/admin/messages", label: "Messages", icon: HelpCircle },
    { href: "/admin/files", label: "Files", icon: Files },
    { href: "/admin/insights", label: "Insights", icon: Zap },
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
      <aside className={`flex flex-col border-r border-border bg-sidebar transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-border shrink-0">
          {collapsed ? (
            <span className="text-primary font-bold text-xl">G</span>
          ) : (
            <img src="/logo.svg" alt="Gbolix" className="h-7" />
          )}
        </div>

        <ScrollArea className="flex-1 px-2 py-4">
          {nav.map(group => (
            <div key={group.section} className="mb-4">
              {!collapsed && (
                <p className="px-2 mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">{group.section}</p>
              )}
              {group.items.map(item => {
                const Icon = item.icon;
                const active = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                      className={`flex items-center gap-3 px-2 py-2 rounded-md mb-1 transition-colors cursor-pointer
                        ${active ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"}
                        ${item.soon ? "opacity-50 cursor-not-allowed" : ""}
                      `}
                    >
                      <Icon size={16} className="shrink-0" />
                      {!collapsed && (
                        <span className="text-sm font-medium truncate">{item.label}</span>
                      )}
                      {!collapsed && item.soon && (
                        <span className="ml-auto text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Soon</span>
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
          {isAdmin && !collapsed && (
            <div className="flex items-center gap-2 px-2 py-1 mb-1">
              <Shield size={12} className="text-primary" />
              <span className="text-[10px] text-primary font-semibold uppercase tracking-wide">Admin</span>
            </div>
          )}
          <Link href="/profile">
            <div className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent transition-colors" data-testid="nav-profile">
              <User size={16} className="shrink-0" />
              {!collapsed && <span className="text-sm font-medium">Profile</span>}
            </div>
          </Link>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun size={16} className="shrink-0" /> : <Moon size={16} className="shrink-0" />}
            {!collapsed && <span className="text-sm font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </button>
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            data-testid="button-sign-out"
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
