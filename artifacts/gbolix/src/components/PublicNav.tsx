import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Menu, X, Shield, MessageSquarePlus } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/use-theme";
import { Show } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";

const navLinks = [
  { href: "/",         label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/products", label: "Products" },
  { href: "/pricing",  label: "Pricing" },
  { href: "/about",    label: "About" },
  { href: "/feedback", label: "Feedback" },
];

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const { data: profile } = useGetMe();
  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img
              src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
              alt="Gbolix"
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <Link
                key={l.label}
                href={l.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:text-foreground hover:bg-accent/50 ${
                  location === l.href ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              data-testid="button-theme-toggle"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <Show when="signed-in">
              {isAdmin && (
                <Link href="/admin/dashboard">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-secondary/40 text-secondary hover:bg-secondary/10 hover:border-secondary/60 transition-all"
                    data-testid="link-admin-portal"
                  >
                    <Shield size={12} />
                    Admin Portal
                  </Button>
                </Link>
              )}
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:border-primary/50 hover:text-primary transition-all"
                  data-testid="link-dashboard"
                >
                  Dashboard
                </Button>
              </Link>
            </Show>

            <Show when="signed-out">
              <Link href="/sign-in">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="link-login"
                >
                  Login
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button
                  size="sm"
                  className="font-semibold transition-all duration-300 hover:-translate-y-px"
                  style={{
                    background: "linear-gradient(135deg, #00FF66, #22D3EE)",
                    color: "#0B0F14",
                    boxShadow: "0 0 16px rgba(0,255,102,0.3)",
                  }}
                  data-testid="link-get-started"
                >
                  Get Started
                </Button>
              </Link>
            </Show>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(!open)}
            data-testid="button-mobile-menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t border-border py-4 space-y-1 bg-background/95 backdrop-blur-md">
            {navLinks.map(l => (
              <Link
                key={l.label}
                href={l.href}
                className={`block px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-accent ${
                  location === l.href ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/contact"
              className="block px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Contact
            </Link>
            {isAdmin && (
              <Link href="/admin/dashboard" onClick={() => setOpen(false)}>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-secondary hover:bg-secondary/10">
                  <Shield size={13} /> Admin Portal
                </div>
              </Link>
            )}
            <div className="flex gap-2 pt-3 px-1">
              <Show when="signed-out">
                <Link href="/sign-in" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full" data-testid="link-login-mobile">Login</Button>
                </Link>
                <Link href="/sign-up" className="flex-1">
                  <Button
                    size="sm"
                    className="w-full font-semibold"
                    style={{ background: "linear-gradient(135deg, #00FF66, #22D3EE)", color: "#0B0F14" }}
                    data-testid="link-get-started-mobile"
                  >
                    Get Started
                  </Button>
                </Link>
              </Show>
              <Show when="signed-in">
                <Link href="/dashboard" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">Dashboard</Button>
                </Link>
              </Show>
            </div>
          </div>
        )}
      </div>
      {location !== "/feedback" && <Link href="/feedback" className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-primary/30 bg-card/95 px-4 py-3 text-sm font-semibold text-primary shadow-xl shadow-primary/10 backdrop-blur transition-transform hover:-translate-y-0.5" aria-label="Share feedback"><MessageSquarePlus size={16} /> <span className="hidden sm:inline">Feedback</span></Link>}
    </nav>
  );
}
