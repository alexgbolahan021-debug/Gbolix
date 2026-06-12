import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { Show } from "@clerk/react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/products", label: "Products" },
  { href: "/pricing", label: "Pricing" },
];

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Gbolix" className="h-7" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${location === l.href ? "text-primary" : "text-muted-foreground"}`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              data-testid="button-theme-toggle"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Show when="signed-in">
              <Link href="/dashboard">
                <Button variant="outline" size="sm" data-testid="link-dashboard">Dashboard</Button>
              </Link>
            </Show>
            <Show when="signed-out">
              <Link href="/sign-in">
                <Button variant="ghost" size="sm" data-testid="link-login">Login</Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="link-get-started">
                  Get Started
                </Button>
              </Link>
            </Show>
          </div>

          {/* Mobile */}
          <button className="md:hidden p-2" onClick={() => setOpen(!open)} data-testid="button-mobile-menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t border-border py-4 space-y-2">
            {navLinks.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="block px-2 py-2 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              <Link href="/sign-in" className="flex-1">
                <Button variant="outline" size="sm" className="w-full" data-testid="link-login-mobile">Login</Button>
              </Link>
              <Link href="/sign-up" className="flex-1">
                <Button size="sm" className="w-full bg-primary text-primary-foreground" data-testid="link-get-started-mobile">Get Started</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
