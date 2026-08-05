import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetMe, useListNotifications } from "@workspace/api-client-react";
import { useTheme } from "@/hooks/use-theme";
import {
  LayoutDashboard, ListTodo, Files, Zap, Wallet, HelpCircle,
  User, LogOut, ChevronLeft, ChevronRight, Moon, Sun, Shield, MessageSquare,
  Bell, Users, BarChart3, FolderOpen, Star, Menu, X,
} from "lucide-react";
import { useState } from "react";

type NavItem = { href: string; label: string; icon: React.ElementType; soon?: boolean };
type NavGroup = { section: string; items: NavItem[] };

const clientNav: NavGroup[] = [
  { section: "WORKSPACE", items: [
    { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
    { href: "/tasks",       label: "My Tasks",    icon: ListTodo },
    { href: "/files",       label: "Files",       icon: Files },
    { href: "/messages",    label: "Messages",    icon: MessageSquare },
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
    { href: "/admin/users",     label: "Users",      icon: Users },
    { href: "/admin/projects",  label: "Projects",   icon: ListTodo },
    { href: "/admin/messages",  label: "Messages",   icon: MessageSquare },
    { href: "/admin/files",     label: "Files",      icon: FolderOpen },
    { href: "/admin/insights",  label: "Insights",   icon: BarChart3 },
    { href: "/admin/team",      label: "Team",       icon: Star },
  ]},
];

const freelancerNav: NavGroup[] = [
  { section: "WORKSPACE", items: [
    { href: "/freelancer/dashboard", label: "Dashboard",  icon: LayoutDashboard },
    { href: "/messages",              label: "Messages",   icon: MessageSquare },
    { href: "/files",                 label: "Files",      icon: Files },
    { href: "/profile",               label: "Profile",    icon: User },
  ]},
];

function NotificationDot({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-4 h-4 bg-destructive text-[9px] text-white font-bold rounded-full flex items-center justify-center px-0.5">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { data: profile } = useGetMe();
  const { theme, setTheme } = useTheme();
  const { data: notifications } = useListNotifications();

  const isOwner = profile?.role === "owner";
  const isAdmin = profile?.role === "admin" || isOwner;
  const isFreelancer = profile?.role === "freelancer";
  const unreadNotifications = notifications?.filter(n => !n.isRead).length ?? 0;

  let nav: NavGroup[];
  let roleBadge: string | null = null;
  let roleBadgeColor = "text-secondary";

  if (isOwner) {
    nav = adminNav;
    roleBadge = "Owner Portal";
    roleBadgeColor = "text-yellow-400";
  } else if (isAdmin) {
    nav = adminNav;
    roleBadge = "Admin Portal";
    roleBadgeColor = "text-secondary";
  } else if (isFreelancer) {
    nav = freelancerNav;
    roleBadge = "Freelancer";
    roleBadgeColor = "text-blue-400";
  } else {
    nav = clientNav;
    roleBadge = null;
  }

  const profileHref = isFreelancer ? "/profile" : "/profile";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
          data-testid="sidebar-backdrop"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-sidebar transition-all duration-300 w-64
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0 ${collapsed ? "md:w-16" : "md:w-64"}
        `}
      >
        <div className="flex items-center justify-between h-16 px-3 border-b border-border shrink-0">
          {collapsed ? (
            <img src="/logo-g-icon.png" alt="G" className="h-9 w-9 object-contain rounded-lg hidden md:block" />
          ) : (
            <img src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"} alt="Gbolix" className="h-9 w-auto object-contain md:block" />
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-md hover:bg-sidebar-accent"
            data-testid="button-sidebar-close"
          >
            <X size={18} />
          </button>
        </div>

        {roleBadge && !collapsed && (
          <div className={`mx-3 mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20`}>
            <Shield size={11} className={roleBadgeColor} />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${roleBadgeColor}`}>{roleBadge}</span>
          </div>
        )}
        {roleBadge && collapsed && (
          <div className="hidden md:flex justify-center mt-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center">
              <Shield size={12} className={roleBadgeColor} />
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 px-2 py-4">
          {nav.map(group => (
            <div key={group.section} className="mb-4">
              {!collapsed && (
                <p className="px-2 mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">{group.section}</p>
              )}
              {group.items.map(item => {
                const Icon = item.icon;
                const active = location === item.href;
                const isMessages = item.href === "/messages" || item.href === "/admin/messages";
                return (
                  <Link key={item.label} href={item.href}>
                    <div
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                      title={collapsed ? item.label : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={`relative flex items-center gap-3 px-2 py-2 rounded-md mb-1 transition-colors cursor-pointer
                        ${active ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"}
                        ${item.soon ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}
                        ${collapsed ? "md:justify-center" : ""}
                      `}
                    >
                      <div className="relative shrink-0">
                        <Icon size={16} />
                        {isMessages && unreadNotifications > 0 && <NotificationDot count={unreadNotifications} />}
                      </div>
                      {!collapsed && (
                        <>
                          <span className="text-sm font-medium truncate">{item.label}</span>
                          {item.soon && (
                            <span className="ml-auto text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Soon</span>
                          )}
                          {isMessages && unreadNotifications > 0 && (
                            <span className="ml-auto bg-destructive text-[9px] text-white font-bold rounded-full px-1.5 py-0.5">
                              {unreadNotifications > 9 ? "9+" : unreadNotifications}
                            </span>
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

        <div className="border-t border-border p-2 space-y-1 shrink-0">
          <Link href={profileHref}>
            <div
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${collapsed ? "md:justify-center" : ""}`}
              data-testid="nav-profile"
              title={collapsed ? "Profile" : undefined}
            >
              <User size={16} className="shrink-0" />
              {!collapsed && <span className="text-sm font-medium">Profile</span>}
            </div>
          </Link>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${collapsed ? "md:justify-center" : ""}`}
            data-testid="button-theme-toggle"
            title={collapsed ? (theme === "dark" ? "Light Mode" : "Dark Mode") : undefined}
          >
            {theme === "dark" ? <Sun size={16} className="shrink-0" /> : <Moon size={16} className="shrink-0" />}
            {!collapsed && <span className="text-sm font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </button>
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ${collapsed ? "md:justify-center" : ""}`}
            data-testid="button-sign-out"
            title={collapsed ? "Sign Out" : undefined}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute bottom-32 -right-3 bg-background border border-border rounded-full p-1 shadow-sm hover:bg-accent transition-colors z-10"
          data-testid="button-sidebar-toggle"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      <main className="flex-1 overflow-auto relative">
        <div className="md:hidden flex items-center justify-between h-14 px-3 border-b border-border bg-background sticky top-0 z-20">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-md hover:bg-accent"
            data-testid="button-mobile-menu"
          >
            <Menu size={20} />
          </button>
          <img src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"} alt="Gbolix" className="h-7 w-auto object-contain" />
          <Link href="/messages">
            <button className="relative p-2 rounded-full hover:bg-accent transition-colors">
              <Bell size={16} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 bg-destructive text-[9px] text-white font-bold rounded-full flex items-center justify-center px-0.5">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
          </Link>
        </div>

        <div className="hidden md:block absolute top-4 right-4 z-20">
          <Link href="/messages">
            <button className="relative p-2 rounded-full bg-card border border-border hover:bg-accent transition-colors">
              <Bell size={16} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 bg-destructive text-[9px] text-white font-bold rounded-full flex items-center justify-center px-0.5">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}