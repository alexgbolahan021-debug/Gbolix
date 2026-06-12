import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicNav } from "@/components/PublicNav";
import { ArrowRight, Zap, Bot, Activity, Check } from "lucide-react";
import { useEffect, useRef } from "react";

const services = [
  { category: "Automation Setup", items: ["CRM Workflow Automation", "WhatsApp Automation", "Email Automation Setup", "Make.com Workflow", "API Integration"] },
  { category: "App Testing", items: ["Google Play Closed Testing (14 Days)", "QA Report", "Android App Ranking Audit"] },
  { category: "FlutterFlow / Bubble MVP", items: ["Landing Page", "Authentication Setup", "Supabase Integration", "Admin Panel", "Client Portal"] },
  { category: "Presentation Design", items: ["Pitch Deck", "Company Profile", "Existing Deck Redesign"] },
];

const products = [
  { name: "Gbolix Prospect Finder", desc: "Generate verified business prospects.", icon: Zap },
  { name: "Gbolix Monitor", desc: "Monitor websites and webhooks.", icon: Activity },
  { name: "Gbolix AI Agent", desc: "Automate conversations and bookings.", icon: Bot },
];

function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Buildings
    const buildings: { x: number; w: number; h: number; color: string; windows: { x: number; y: number; lit: boolean }[] }[] = [];
    const buildingColors = ["#0d1520", "#0a1018", "#0f1a28", "#081220"];
    for (let i = 0; i < 20; i++) {
      const w = 40 + Math.random() * 80;
      const h = 100 + Math.random() * 300;
      const x = (i / 20) * 1200 + Math.random() * 40 - 20;
      const windows: { x: number; y: number; lit: boolean }[] = [];
      for (let wy = 20; wy < h - 20; wy += 20) {
        for (let wx = 8; wx < w - 8; wx += 14) {
          windows.push({ x: wx, y: wy, lit: Math.random() > 0.4 });
        }
      }
      buildings.push({ x, w, h, color: buildingColors[i % buildingColors.length], windows });
    }

    // Clouds
    const clouds: { x: number; y: number; r: number; speed: number }[] = [];
    for (let i = 0; i < 8; i++) {
      clouds.push({ x: Math.random() * 1400 - 200, y: 30 + Math.random() * 120, r: 40 + Math.random() * 60, speed: 0.1 + Math.random() * 0.3 });
    }

    let frame = 0;
    let animId: number;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#020408");
      sky.addColorStop(0.5, "#050c14");
      sky.addColorStop(1, "#0B0F14");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Stars
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      for (let i = 0; i < 80; i++) {
        const sx = ((i * 137.5 + frame * 0.01) % W + W) % W;
        const sy = (i * 73.3) % (H * 0.4);
        const opacity = 0.3 + 0.7 * Math.abs(Math.sin(frame * 0.02 + i));
        ctx.globalAlpha = opacity;
        ctx.fillRect(sx, sy, 1, 1);
      }
      ctx.globalAlpha = 1;

      // Moving clouds
      clouds.forEach(cloud => {
        cloud.x = (cloud.x + cloud.speed + W) % (W + 200) - 200;
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = "#a0c8ff";
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.r * 0.8, cloud.y - 10, cloud.r * 0.6, 0, Math.PI * 2);
        ctx.arc(cloud.x - cloud.r * 0.7, cloud.y - 5, cloud.r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Buildings
      const groundY = H;
      buildings.forEach(b => {
        const bx = (b.x / 1200) * W;
        const bTop = groundY - b.h;
        ctx.fillStyle = b.color;
        ctx.fillRect(bx, bTop, b.w, b.h);

        b.windows.forEach(win => {
          if (win.lit) {
            const flicker = Math.random() > 0.997;
            if (flicker) win.lit = false;
            ctx.fillStyle = `rgba(${200 + Math.floor(Math.random() * 55)}, ${200 + Math.floor(Math.random() * 30)}, 120, 0.8)`;
          } else {
            if (Math.random() > 0.999) win.lit = true;
            ctx.fillStyle = "rgba(20, 30, 50, 0.8)";
          }
          ctx.fillRect(bx + win.x, bTop + win.y, 6, 8);
        });

        // Antenna on tall buildings
        if (b.h > 250) {
          ctx.fillStyle = "#1a2a3a";
          ctx.fillRect(bx + b.w / 2 - 1, bTop - 20, 2, 20);
          ctx.fillStyle = "#ff3300";
          ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(frame * 0.05));
          ctx.beginPath();
          ctx.arc(bx + b.w / 2, bTop - 20, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      });

      // Fog at base
      const fog = ctx.createLinearGradient(0, H - 80, 0, H);
      fog.addColorStop(0, "rgba(11,15,20,0)");
      fog.addColorStop(1, "rgba(11,15,20,0.9)");
      ctx.fillStyle = fog;
      ctx.fillRect(0, H - 80, W, 80);

      // Dark overlay
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, W, H);

      frame++;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Hero */}
      <section className="relative flex items-center justify-center min-h-screen overflow-hidden">
        <HeroBackground />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10" data-testid="badge-tagline">
            Build. Automate. Scale.
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight" data-testid="text-hero-headline">
            Build. Automate.<br />
            <span className="text-primary">Scale.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto" data-testid="text-hero-subheadline">
            Helping founders and businesses automate operations, launch products faster, and scale efficiently.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/services">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-2" data-testid="button-explore-services">
                Explore Services <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" data-testid="button-view-pricing">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 opacity-50">
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-white/50" />
          <span className="text-xs text-white/50 uppercase tracking-widest">Scroll</span>
        </div>
      </section>

      {/* Services preview */}
      <section className="py-24 px-4 max-w-7xl mx-auto" id="services">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">What We Do</Badge>
          <h2 className="text-4xl font-bold mb-4" data-testid="text-services-heading">Services That Scale With You</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">From automation setup to full MVP development — we handle the technical work so you can focus on growth.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map(s => (
            <div key={s.category} className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-all group" data-testid={`card-service-${s.category.toLowerCase().replace(/\s/g, "-")}`}>
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-primary">{s.category}</h3>
              <ul className="space-y-2">
                {s.items.map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check size={13} className="text-primary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/services">
            <Button variant="outline" className="gap-2" data-testid="button-view-all-services">
              View All Services <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      </section>

      {/* Products coming soon */}
      <section className="py-24 px-4 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-secondary/10 text-secondary border-secondary/20">Coming Soon</Badge>
            <h2 className="text-4xl font-bold mb-4">Gbolix Products</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Powerful tools built for the modern business. Join the waitlist.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {products.map(p => {
              const Icon = p.icon;
              return (
                <div key={p.name} className="bg-background border border-border rounded-xl p-6 text-center" data-testid={`card-product-${p.name.toLowerCase().replace(/\s/g, "-")}`}>
                  <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon size={22} className="text-secondary" />
                  </div>
                  <h3 className="font-semibold mb-2">{p.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{p.desc}</p>
                  <Button variant="outline" size="sm" disabled data-testid={`button-coming-soon-${p.name.toLowerCase().replace(/\s/g, "-")}`}>Coming Soon</Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">Ready to scale your business?</h2>
          <p className="text-muted-foreground mb-8">Join founders, agencies, and businesses already using Gbolix.</p>
          <Link href="/sign-up">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" data-testid="button-cta-get-started">
              Get Started Free <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="/logo.svg" alt="Gbolix" className="h-7" />
          <p className="text-sm text-muted-foreground">Build. Automate. Scale. &copy; {new Date().getFullYear()} Gbolix. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground">Services</Link>
            <Link href="/products" className="text-sm text-muted-foreground hover:text-foreground">Products</Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
