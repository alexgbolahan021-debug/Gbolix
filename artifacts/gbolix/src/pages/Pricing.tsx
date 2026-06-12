import { PublicNav } from "@/components/PublicNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Check, ArrowRight } from "lucide-react";

const serviceCategories = [
  {
    category: "Automation Setup",
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
    items: [
      { name: "Google Play Closed Testing (14 Days)", price: 49 },
      { name: "QA Report", price: 15 },
      { name: "Android App Ranking Audit", price: 29 },
    ],
  },
  {
    category: "FlutterFlow / Bubble MVP",
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
    items: [
      { name: "Pitch Deck", price: 59 },
      { name: "Company Profile", price: 49 },
      { name: "Existing Deck Redesign", price: 39 },
    ],
  },
];

const subscriptionPlans = [
  { name: "Starter", color: "border-border", badge: "bg-muted text-muted-foreground" },
  { name: "Growth", color: "border-primary/40", badge: "bg-primary/10 text-primary" },
  { name: "Scale", color: "border-secondary/40", badge: "bg-secondary/10 text-secondary" },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Pricing</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Pay only for what you need. No subscriptions required for fixed services.
            </p>
          </div>

          {/* Fixed Services */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-8">Fixed Services</h2>
            <div className="space-y-8">
              {serviceCategories.map(cat => (
                <div key={cat.category}>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">{cat.category}</h3>
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    {cat.items.map((item, idx) => (
                      <div
                        key={item.name}
                        className={`flex items-center justify-between px-5 py-4 ${idx < cat.items.length - 1 ? "border-b border-border" : ""} hover:bg-accent/30 transition-colors`}
                        data-testid={`row-pricing-${item.name.toLowerCase().replace(/\s/g, "-")}`}
                      >
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-primary" />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-primary">${item.price}</span>
                          <Link href="/sign-up">
                            <Button size="sm" variant="outline" className="text-xs h-7" data-testid={`button-select-${item.name.toLowerCase().replace(/\s/g, "-")}`}>
                              Select
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Subscription Plans Coming Soon */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <h2 className="text-2xl font-bold">Subscription Plans</h2>
              <Badge className="bg-muted text-muted-foreground border-0">Coming Soon</Badge>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {subscriptionPlans.map(plan => (
                <div
                  key={plan.name}
                  className={`bg-card border ${plan.color} rounded-xl p-6 text-center opacity-70`}
                  data-testid={`card-plan-${plan.name.toLowerCase()}`}
                >
                  <Badge className={`mb-4 ${plan.badge} border-0 text-xs`}>Coming Soon</Badge>
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">Subscription pricing coming soon.</p>
                  <Button variant="outline" disabled size="sm" className="w-full">Coming Soon</Button>
                </div>
              ))}
            </div>
          </section>

          {/* Custom Plan */}
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <Badge className="mb-4 bg-muted text-muted-foreground border-0">Coming Soon</Badge>
            <h3 className="text-xl font-bold mb-2">Custom Plan Builder</h3>
            <p className="text-muted-foreground text-sm mb-6">Build a plan tailored to your exact needs. Available soon.</p>
            <Link href="/sign-up">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" data-testid="button-get-started">
                Get Started <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
