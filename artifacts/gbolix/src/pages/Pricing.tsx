import { useState } from "react";
import { PublicNav } from "@/components/PublicNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { Check, ShoppingCart, X, ArrowRight } from "lucide-react";

type ServiceItem = { key: string; name: string; price: number; category: string };

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

const allItems: ServiceItem[] = serviceCategories.flatMap(cat =>
  cat.items.map(item => ({ key: `${cat.category}::${item.name}`, name: item.name, price: item.price, category: cat.category }))
);

const subscriptionPlans = [
  { name: "Starter", color: "border-border", badge: "bg-muted text-muted-foreground" },
  { name: "Growth", color: "border-primary/40", badge: "bg-primary/10 text-primary" },
  { name: "Scale", color: "border-secondary/40", badge: "bg-secondary/10 text-secondary" },
];

export default function Pricing() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { isSignedIn } = useUser();
  const [, setLocation] = useLocation();

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedItems = allItems.filter(item => selected.has(item.key));
  const total = selectedItems.reduce((sum, item) => sum + item.price, 0);

  const handleContinue = () => {
    if (!isSignedIn) {
      setLocation("/sign-up");
    } else {
      setLocation("/new-request");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-40">
      <PublicNav />

      <div className="pt-28 pb-12 px-4 text-center border-b border-border">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Pricing</Badge>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4" style={{ fontFamily: "Sora, sans-serif" }}>Simple, Transparent Pricing</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Select any services below. Your total updates in real time — then click Continue to get started.
        </p>
      </div>

      <div className="pt-12 px-4">
        <div className="max-w-3xl mx-auto">

          {/* Fixed Services Calculator */}
          <section className="mb-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>Fixed Services</h2>
              {selected.size > 0 && (
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <X size={12} /> Clear selection
                </button>
              )}
            </div>
            <div className="space-y-8">
              {serviceCategories.map(cat => (
                <div key={cat.category}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">{cat.category}</h3>
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    {cat.items.map((item, idx) => {
                      const key = `${cat.category}::${item.name}`;
                      const isSelected = selected.has(key);
                      return (
                        <div
                          key={item.name}
                          onClick={() => toggle(key)}
                          className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-all
                            ${idx < cat.items.length - 1 ? "border-b border-border" : ""}
                            ${isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-accent/30"}`}
                          data-testid={`row-pricing-${item.name.toLowerCase().replace(/\s/g, "-")}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0
                              ${isSelected ? "bg-primary border-primary" : "border-border"}`}>
                              {isSelected && <Check size={12} className="text-black" />}
                            </div>
                            <span className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-foreground/80"}`}>{item.name}</span>
                          </div>
                          <span className={`font-bold text-sm shrink-0 ml-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                            ${item.price}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Subscription Plans Coming Soon */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>Subscription Plans</h2>
              <Badge className="bg-muted text-muted-foreground border-0 text-xs">Coming Soon</Badge>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {subscriptionPlans.map(plan => (
                <div
                  key={plan.name}
                  className={`bg-card border ${plan.color} rounded-xl p-6 text-center opacity-60`}
                  data-testid={`card-plan-${plan.name.toLowerCase()}`}
                >
                  <Badge className={`mb-4 ${plan.badge} border-0 text-xs`}>Coming Soon</Badge>
                  <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "Sora, sans-serif" }}>{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">Subscription pricing coming soon.</p>
                  <Button variant="outline" disabled size="sm" className="w-full">Coming Soon</Button>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>

      {/* Sticky Calculator Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 ${
          selected.size > 0 ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-[#0B0F14]/95 border-t border-border backdrop-blur-lg shadow-[0_-8px_40px_rgba(0,0,0,0.5)]">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              {/* Selected items preview */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingCart size={14} className="text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {selected.size} service{selected.size !== 1 ? "s" : ""} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedItems.slice(0, 3).map(item => (
                    <span key={item.key} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full truncate max-w-[150px]">
                      {item.name}
                    </span>
                  ))}
                  {selectedItems.length > 3 && (
                    <span className="text-xs text-muted-foreground py-0.5">+{selectedItems.length - 3} more</span>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-extrabold text-primary" style={{ fontFamily: "Sora, sans-serif" }}>${total}</p>
              </div>

              {/* Continue button */}
              <Button
                size="lg"
                onClick={handleContinue}
                className="gap-2 font-semibold shrink-0 transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, #00FF66, #00cc52)",
                  color: "#0B0F14",
                  boxShadow: "0 0 24px rgba(0,255,102,0.35)",
                }}
                data-testid="button-continue-to-checkout"
              >
                {isSignedIn ? "Continue" : "Create Account"} <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
