import { PublicNav } from "@/components/PublicNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

const serviceCategories = [
  {
    category: "Automation Setup",
    desc: "Streamline your operations with powerful automation workflows.",
    items: [
      { name: "CRM Workflow Automation", price: 79 },
      { name: "WhatsApp Automation", price: 119 },
      { name: "Email Automation Setup", price: 49 },
      { name: "Make.com Workflow", price: 99 },
      { name: "API Integration", price: 149 },
    ],
  },
  {
    category: "App Testing",
    desc: "Ensure your app is ready for launch with professional QA.",
    items: [
      { name: "Google Play Closed Testing (14 Days)", price: 49 },
      { name: "QA Report", price: 15 },
      { name: "Android App Ranking Audit", price: 29 },
    ],
  },
  {
    category: "FlutterFlow / Bubble MVP",
    desc: "Launch your no-code MVP fast with full setup and integration.",
    items: [
      { name: "Landing Page", price: 129 },
      { name: "Authentication Setup", price: 69 },
      { name: "Supabase Integration", price: 119 },
      { name: "Admin Panel", price: 199 },
      { name: "Client Portal", price: 249 },
    ],
  },
  {
    category: "Presentation Design",
    desc: "Professional decks that make your business look its best.",
    items: [
      { name: "Pitch Deck", price: 59 },
      { name: "Company Profile", price: 49 },
      { name: "Existing Deck Redesign", price: 39 },
    ],
  },
];

export default function Services() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Services</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Everything You Need to Scale</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Professional services delivered by our expert team. Submit a request and we handle the rest.
            </p>
          </div>

          <div className="space-y-16">
            {serviceCategories.map(cat => (
              <div key={cat.category}>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-1">{cat.category}</h2>
                  <p className="text-muted-foreground text-sm">{cat.desc}</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cat.items.map(item => (
                    <div
                      key={item.name}
                      className="bg-card border border-border rounded-xl p-5 flex items-center justify-between hover:border-primary/30 transition-all group"
                      data-testid={`card-service-item-${item.name.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      <span className="text-sm font-medium">{item.name}</span>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="text-primary font-bold">${item.price}</span>
                        <Link href="/sign-up">
                          <Button size="sm" variant="outline" className="text-xs" data-testid={`button-request-${item.name.toLowerCase().replace(/\s/g, "-")}`}>
                            Request
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <p className="text-muted-foreground mb-4">Ready to get started?</p>
            <Link href="/sign-up">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" data-testid="button-get-started">
                Create an Account <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
