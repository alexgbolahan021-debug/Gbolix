import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicNav } from "@/components/PublicNav";
import { ArrowRight, Zap, Bot, Activity, Check } from "lucide-react";

const services = [
  {
    category: "Automation Setup",
    items: ["CRM Workflow Automation", "WhatsApp Automation", "Email Automation Setup", "Make.com Workflow", "API Integration"],
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=480&q=80&auto=format&fit=crop",
  },
  {
    category: "App Testing",
    items: ["Google Play Closed Testing (14 Days)", "QA Report", "Android App Ranking Audit"],
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=480&q=80&auto=format&fit=crop",
  },
  {
    category: "FlutterFlow / Bubble MVP",
    items: ["Landing Page", "Authentication Setup", "Supabase Integration", "Admin Panel", "Client Portal"],
    image: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=480&q=80&auto=format&fit=crop",
  },
  {
    category: "Presentation Design",
    items: ["Pitch Deck", "Company Profile", "Existing Deck Redesign"],
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=480&q=80&auto=format&fit=crop",
  },
];

const products = [
  { name: "Gbolix Prospect Finder", desc: "Generate verified business prospects.", icon: Zap },
  { name: "Gbolix Monitor", desc: "Monitor websites and webhooks.", icon: Activity },
  { name: "Gbolix AI Agent", desc: "Automate conversations and bookings.", icon: Bot },
];

function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=85&auto=format&fit=crop"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-[#0B0F14]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#00FF66]/6 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#A855F7]/5 blur-[140px] rounded-full pointer-events-none" />
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Hero */}
      <section className="relative flex items-center justify-center min-h-screen overflow-hidden">
        <HeroBackground />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <Badge className="mb-6 bg-primary/15 text-primary border-primary/30 hover:bg-primary/15 backdrop-blur-sm px-4 py-1.5" data-testid="badge-tagline">
            Build. Automate. Scale.
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight drop-shadow-2xl" style={{ fontFamily: "Sora, sans-serif" }} data-testid="text-hero-headline">
            Build. Automate.<br />
            <span className="text-primary" style={{ textShadow: "0 0 40px rgba(0,255,102,0.4)" }}>Scale.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Helping founders and businesses automate operations, launch products faster, and scale efficiently.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/services">
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 gap-2 backdrop-blur-sm px-8 transition-all duration-300 hover:border-white/40"
                data-testid="button-explore-services"
              >
                Explore Services <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                className="gap-2 px-8 font-semibold transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, #00FF66, #00cc52)",
                  color: "#0B0F14",
                  boxShadow: "0 0 30px rgba(0,255,102,0.35)",
                }}
                data-testid="button-view-pricing"
              >
                View Pricing
              </Button>
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 opacity-40">
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-white/60" />
          <span className="text-xs text-white/60 uppercase tracking-widest">Scroll</span>
        </div>
      </section>

      {/* Services preview */}
      <section className="py-24 px-4 max-w-7xl mx-auto" id="services">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">What We Do</Badge>
          <h2 className="text-4xl font-extrabold mb-4" style={{ fontFamily: "Sora, sans-serif" }} data-testid="text-services-heading">Services That Scale With You</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">From automation setup to full MVP development — we handle the technical work so you can focus on growth.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map(s => (
            <div key={s.category} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,102,0.07)] group" data-testid={`card-service-${s.category.toLowerCase().replace(/\s/g, "-")}`}>
              <div className="h-36 overflow-hidden">
                <img src={s.image} alt={s.category} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              </div>
              <div className="p-5">
                <h3 className="font-semibold mb-3 text-xs uppercase tracking-wider text-primary">{s.category}</h3>
                <ul className="space-y-1.5">
                  {s.items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check size={12} className="text-primary shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/services">
            <Button
              variant="outline"
              className="gap-2 hover:border-primary/50 hover:text-primary transition-all duration-300"
              data-testid="button-view-all-services"
            >
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
            <h2 className="text-4xl font-extrabold mb-4" style={{ fontFamily: "Sora, sans-serif" }}>Gbolix Products</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Powerful tools built for the modern business. Join the waitlist.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {products.map(p => {
              const Icon = p.icon;
              return (
                <div key={p.name} className="bg-background border border-border rounded-2xl p-6 text-center hover:border-secondary/30 transition-all duration-300" data-testid={`card-product-${p.name.toLowerCase().replace(/\s/g, "-")}`}>
                  <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Icon size={24} className="text-secondary" />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ fontFamily: "Sora, sans-serif" }}>{p.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{p.desc}</p>
                  <Button variant="outline" size="sm" disabled data-testid={`button-coming-soon-${p.name.toLowerCase().replace(/\s/g, "-")}`}>Coming Soon</Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="py-14 px-4 border-b border-border">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "150+", label: "Clients Served" },
            { value: "500+", label: "Projects Delivered" },
            { value: "98%", label: "Satisfaction Rate" },
            { value: "4.9★", label: "Average Rating" },
          ].map(stat => (
            <div key={stat.label}>
              <p className="text-3xl font-extrabold text-primary mb-1" style={{ fontFamily: "Sora, sans-serif" }}>{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
        <div className="max-w-2xl mx-auto relative z-10">
          <h2 className="text-4xl font-extrabold mb-4" style={{ fontFamily: "Sora, sans-serif" }}>Ready to scale your business?</h2>
          <p className="text-muted-foreground mb-8 text-lg">Join founders, agencies, and businesses already using Gbolix.</p>
          <Link href="/sign-up">
            <Button
              size="lg"
              className="gap-2 px-10 font-semibold transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, #00FF66, #00cc52)",
                color: "#0B0F14",
                boxShadow: "0 0 30px rgba(0,255,102,0.3)",
              }}
              data-testid="button-cta-get-started"
            >
              Get Started Free <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="/logo-dark.png" alt="Gbolix" className="h-8 w-auto object-contain" />
          <p className="text-sm text-muted-foreground">Build. Automate. Scale. &copy; {new Date().getFullYear()} Gbolix. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Services</Link>
            <Link href="/products" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Products</Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
