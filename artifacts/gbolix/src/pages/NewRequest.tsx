import { useState } from "react";
import { useLocation } from "wouter";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateProject } from "@workspace/api-client-react";
import { getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight } from "lucide-react";

const serviceCategories = [
  { category: "Automation Setup", items: [
    { name: "CRM Workflow Automation", price: 79 },
    { name: "WhatsApp Automation", price: 119 },
    { name: "Email Automation Setup", price: 49 },
    { name: "Make.com Workflow", price: 99 },
    { name: "API Integration", price: 149 },
  ]},
  { category: "App Testing", items: [
    { name: "Google Play Closed Testing (14 Days)", price: 49 },
    { name: "QA Report", price: 15 },
    { name: "Android App Ranking Audit", price: 29 },
  ]},
  { category: "FlutterFlow / Bubble MVP", items: [
    { name: "Landing Page", price: 129 },
    { name: "Authentication Setup", price: 69 },
    { name: "Supabase Integration", price: 119 },
    { name: "Admin Panel", price: 199 },
    { name: "Client Portal", price: 249 },
  ]},
  { category: "Presentation Design", items: [
    { name: "Pitch Deck", price: 59 },
    { name: "Company Profile", price: 49 },
    { name: "Existing Deck Redesign", price: 39 },
  ]},
];

const allServices = serviceCategories.flatMap(c => c.items.map(i => ({ ...i, category: c.category })));

export default function NewRequest() {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<typeof allServices[0] | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [submittedId, setSubmittedId] = useState<number | null>(null);

  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createMutation = useCreateProject();

  const handleSubmit = () => {
    if (!selectedService) return;
    createMutation.mutate(
      {
        data: {
          serviceType: selectedService.name,
          title: title || selectedService.name,
          description,
          priority,
          price: selectedService.price,
        },
      },
      {
        onSuccess: (project) => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          setSubmittedId(project.id);
          setStep(3);
        },
      }
    );
  };

  return (
    <ClientLayout>
      <div className="p-6 max-w-2xl mx-auto">
        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step === s ? "bg-primary text-primary-foreground" : step > s ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
                data-testid={`step-indicator-${s}`}
              >
                {step > s ? <Check size={12} /> : s}
              </div>
              {s < 3 && <div className={`h-px w-8 ${step > s ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
          <div className="ml-2 text-sm text-muted-foreground">
            {step === 1 ? "Select Service" : step === 2 ? "Project Details" : "Confirmation"}
          </div>
        </div>

        {/* Step 1 — Service Selection */}
        {step === 1 && (
          <div>
            <h1 className="text-xl font-bold mb-6" data-testid="text-step1-heading">Select a Service</h1>
            <div className="space-y-6">
              {serviceCategories.map(cat => (
                <div key={cat.category}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">{cat.category}</p>
                  <div className="space-y-2">
                    {cat.items.map(item => {
                      const fullItem = { ...item, category: cat.category };
                      const selected = selectedService?.name === item.name;
                      return (
                        <button
                          key={item.name}
                          onClick={() => setSelectedService(fullItem)}
                          data-testid={`button-select-service-${item.name.toLowerCase().replace(/\s/g, "-")}`}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-all text-left
                            ${selected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
                        >
                          <div className="flex items-center gap-2">
                            {selected && <Check size={13} className="text-primary" />}
                            <span className={selected ? "text-primary font-medium" : ""}>{item.name}</span>
                          </div>
                          <span className="text-primary font-bold shrink-0">${item.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedService}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 w-full"
                data-testid="button-continue-to-details"
              >
                Continue <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 — Project Details */}
        {step === 2 && selectedService && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold" data-testid="text-step2-heading">Project Details</h1>
              <Badge className="bg-primary/10 text-primary border-primary/20">{selectedService.name} — ${selectedService.price}</Badge>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Project Title</label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={selectedService.name}
                  data-testid="input-project-title"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe what you need..."
                  rows={4}
                  data-testid="input-project-description"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Priority</label>
                <Select value={priority} onValueChange={v => setPriority(v as any)}>
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1" data-testid="button-back-to-services">Back</Button>
              <Button
                onClick={handleSubmit}
                disabled={!description.trim() || createMutation.isPending}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-submit-request"
              >
                {createMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Confirmation */}
        {step === 3 && (
          <div className="text-center py-8" data-testid="section-confirmation">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={28} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Request Submitted Successfully</h1>
            <p className="text-muted-foreground text-sm mb-2">Our team will review your request and contact you through project communication shortly.</p>
            <p className="text-muted-foreground text-sm mb-8">Expected response time: 24 hours.</p>
            <Button
              onClick={() => setLocation("/tasks")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-view-my-tasks"
            >
              View My Tasks
            </Button>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
