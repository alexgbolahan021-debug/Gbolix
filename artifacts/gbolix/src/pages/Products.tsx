import { PublicNav } from "@/components/PublicNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Activity, Bot } from "lucide-react";

const products = [
  {
    name: "Gbolix Prospect Finder",
    desc: "Generate verified business prospects automatically. Find your ideal customers with AI-powered prospecting that delivers accurate contact data and company insights.",
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    name: "Gbolix Monitor",
    desc: "Monitor websites and webhooks in real-time. Get instant alerts when your critical services go down, APIs change, or webhooks fail.",
    icon: Activity,
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    name: "Gbolix AI Agent",
    desc: "Automate conversations and bookings with intelligent AI. Handle customer inquiries, schedule appointments, and qualify leads 24/7 without lifting a finger.",
    icon: Bot,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
];

export default function Products() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-secondary/10 text-secondary border-secondary/20">Products</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Built for the Modern Business</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Powerful tools that automate, monitor, and scale your operations. Coming soon.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {products.map(p => {
              const Icon = p.icon;
              return (
                <div
                  key={p.name}
                  className="bg-card border border-border rounded-2xl p-8 flex flex-col"
                  data-testid={`card-product-${p.name.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <div className={`w-14 h-14 ${p.bg} rounded-2xl flex items-center justify-center mb-6`}>
                    <Icon size={26} className={p.color} />
                  </div>
                  <h3 className="text-lg font-bold mb-3">{p.name}</h3>
                  <p className="text-sm text-muted-foreground flex-1 mb-6">{p.desc}</p>
                  <Button variant="outline" size="sm" disabled className="w-full" data-testid={`button-coming-soon-${p.name.toLowerCase().replace(/\s/g, "-")}`}>
                    Coming Soon
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <h3 className="text-xl font-bold mb-2">Be the first to know</h3>
            <p className="text-muted-foreground mb-6 text-sm">Create your account and get notified when our products launch.</p>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-create-account">
              Create Free Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
