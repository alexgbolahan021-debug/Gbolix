import { PublicNav } from "@/components/PublicNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

const products = [
  {
    name: "Gbolix Leads",
    tagline: "Verified Lead Intelligence",
    desc: "Generate, enrich, verify, deduplicate, and score B2B leads. Spend Gbolix Wallet credits only on qualified new leads.",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80&auto=format&fit=crop",
    accentColor: "text-primary",
    accentBg: "bg-primary/10",
    borderHover: "hover:border-primary/30",
    glowColor: "rgba(0,255,102,0.1)",
    features: ["1 qualified lead = 1 credit", "Workspace deduplication", "Evidence-aware verification", "Scored CSV exports"],
    href: "/dashboard/products/gbolix-leads",
  },
  {
    name: "Gbolix Monitor",
    tagline: "Real-Time Website & API Monitoring",
    desc: "Monitor websites and webhooks in real-time. Get instant alerts when your critical services go down, APIs change, or webhooks fail. Never miss an outage again.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80&auto=format&fit=crop",
    accentColor: "text-secondary",
    accentBg: "bg-secondary/10",
    borderHover: "hover:border-secondary/30",
    glowColor: "rgba(168,85,247,0.1)",
    features: ["Uptime monitoring", "Webhook alerts", "Status pages", "Slack & email notifications"],
  },
  {
    name: "Gbolix AI Agent",
    tagline: "24/7 Intelligent Automation",
    desc: "Automate conversations and bookings with intelligent AI. Handle customer inquiries, schedule appointments, and qualify leads around the clock without lifting a finger.",
    image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80&auto=format&fit=crop",
    accentColor: "text-blue-400",
    accentBg: "bg-blue-400/10",
    borderHover: "hover:border-blue-400/30",
    glowColor: "rgba(96,165,250,0.1)",
    features: ["Natural language AI", "Multi-channel support", "Booking automation", "CRM sync"],
  },
];

export default function Products() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <div className="pt-28 pb-12 px-4 text-center border-b border-border">
        <Badge className="mb-4 bg-secondary/10 text-secondary border-secondary/20">Products</Badge>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4" style={{ fontFamily: "Sora, sans-serif" }}>Built for the Modern Business</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Powerful tools that automate, monitor, and scale your operations. Gbolix Leads is available through your Gbolix account; more tools are on the way.
        </p>
      </div>

      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {products.map(p => (
              <div
                key={p.name}
                className={`bg-card border border-border rounded-2xl overflow-hidden flex flex-col ${p.borderHover} transition-all duration-300`}
                data-testid={`card-product-${p.name.toLowerCase().replace(/\s/g, "-")}`}
              >
                <div className="h-44 overflow-hidden relative">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                  {p.href ? <Badge className="absolute top-3 right-3 bg-primary/90 text-primary-foreground border-0 backdrop-blur-sm text-[10px]">Account access</Badge> : <Badge className="absolute top-3 right-3 bg-muted/80 text-muted-foreground border-0 backdrop-blur-sm text-[10px]">Coming Soon</Badge>}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${p.accentColor}`}>{p.tagline}</p>
                  <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "Sora, sans-serif" }}>{p.name}</h3>
                  <p className="text-sm text-muted-foreground mb-5 flex-1 leading-relaxed">{p.desc}</p>
                  <ul className="space-y-1.5 mb-6">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className={`w-1.5 h-1.5 rounded-full ${p.accentBg} ${p.accentColor} shrink-0`} style={{ backgroundColor: "currentColor", opacity: 0.7 }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {p.href ? <Link href={p.href}><Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-open-gbolix-leads">Open Gbolix Leads</Button></Link> : <Button variant="outline" size="sm" disabled className="w-full" data-testid={`button-coming-soon-${p.name.toLowerCase().replace(/\s/g, "-")}`}>Coming Soon</Button>}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-border rounded-2xl p-10 text-center">
            <h3 className="text-2xl font-extrabold mb-2" style={{ fontFamily: "Sora, sans-serif" }}>Be the first to know</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">Create your account and get notified the moment our products launch.</p>
            <Link href="/sign-up">
              <Button
                className="gap-2 font-semibold transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, #00FF66, #00cc52)",
                  color: "#0B0F14",
                  boxShadow: "0 0 24px rgba(0,255,102,0.25)",
                }}
                data-testid="button-create-account"
              >
                Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
