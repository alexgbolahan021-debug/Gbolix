import { PublicNav } from "@/components/PublicNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowRight, Check } from "lucide-react";

const serviceCategories = [
  {
    category: "Automation Setup",
    cta: "Get Quote",
    desc: "Streamline your operations with powerful automation workflows. Connect your CRM, WhatsApp, email, and more into seamless automated systems.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=700&q=80&auto=format&fit=crop",
    items: [
      { name: "CRM Workflow Automation" },
      { name: "WhatsApp Automation" },
      { name: "Email Automation Setup" },
      { name: "Make.com Workflow" },
      { name: "API Integration" },
    ],
  },
  {
    category: "App Testing",
    cta: "View Pricing",
    desc: "Ensure your mobile app is ready for launch with professional QA services, ranking audits, and closed testing management.",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=700&q=80&auto=format&fit=crop",
    items: [
      { name: "Google Play Closed Testing (14 Days)" },
      { name: "QA Report" },
      { name: "Android App Ranking Audit" },
    ],
  },
  {
    category: "FlutterFlow / Bubble MVP",
    cta: "See Plans",
    desc: "Launch your no-code MVP fast with complete setup, authentication, database integration, and production-ready delivery.",
    image: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=700&q=80&auto=format&fit=crop",
    items: [
      { name: "Landing Page" },
      { name: "Authentication Setup" },
      { name: "Supabase Integration" },
      { name: "Admin Panel" },
      { name: "Client Portal" },
    ],
  },
  {
    category: "Presentation Design",
    cta: "Get Quote",
    desc: "Professional pitch decks, company profiles, and slide redesigns that make your business stand out to investors and clients.",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=700&q=80&auto=format&fit=crop",
    items: [
      { name: "Pitch Deck" },
      { name: "Company Profile" },
      { name: "Existing Deck Redesign" },
    ],
  },
];

export default function Services() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Page header */}
      <div className="pt-28 pb-12 px-4 text-center border-b border-border">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Services</Badge>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4" style={{ fontFamily: "Sora, sans-serif" }}>Everything You Need to Scale</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Professional services delivered by our expert team. Submit a request and we handle the rest.
        </p>
      </div>

      <div className="py-16 px-4">
        <div className="max-w-7xl mx-auto space-y-24">
          {serviceCategories.map((cat, idx) => (
            <div
              key={cat.category}
              className={`grid lg:grid-cols-2 gap-12 items-center ${idx % 2 === 1 ? "lg:flex-row-reverse" : ""}`}
            >
              {/* Image */}
              <div className={`rounded-2xl overflow-hidden border border-border shadow-2xl ${idx % 2 === 1 ? "lg:order-2" : ""}`}>
                <img
                  src={cat.image}
                  alt={cat.category}
                  className="w-full h-72 object-cover"
                  loading="lazy"
                />
              </div>

              {/* Content */}
              <div className={idx % 2 === 1 ? "lg:order-1" : ""}>
                <Badge className="mb-3 bg-primary/10 text-primary border-primary/20 text-xs">{cat.category}</Badge>
                <h2 className="text-2xl font-extrabold mb-3" style={{ fontFamily: "Sora, sans-serif" }}>{cat.category}</h2>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">{cat.desc}</p>

                <div className="space-y-2 mb-6">
                  {cat.items.map(item => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/30 transition-all"
                      data-testid={`card-service-item-${item.name.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      <div className="flex items-center gap-2">
                        <Check size={13} className="text-primary shrink-0" />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <Link href="/pricing" className="shrink-0 ml-4">
                        <Button size="sm" variant="outline" className="text-xs h-7 hover:border-primary/50 hover:text-primary transition-all" data-testid={`button-request-${item.name.toLowerCase().replace(/\s/g, "-")}`}>
                          {cat.cta}
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-20">
          <p className="text-muted-foreground mb-4 text-lg">Ready to get started?</p>
          <Link href="/sign-up">
            <Button
              size="lg"
              className="gap-2 px-8 font-semibold transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, #00FF66, #00cc52)",
                color: "#0B0F14",
                boxShadow: "0 0 24px rgba(0,255,102,0.3)",
              }}
              data-testid="button-get-started"
            >
              Create an Account <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
