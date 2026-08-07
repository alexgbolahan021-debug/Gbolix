import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronLeft, ChevronRight, FileText, Upload } from "lucide-react";
import { useCreateProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const automationServices = [
  { name: "CRM Workflow Automation", price: 79, platformLabel: "Which CRM are you currently using?", platforms: ["HubSpot", "GoHighLevel", "Salesforce", "Zoho", "Pipedrive", "Other", "I'm not sure"] },
  { name: "WhatsApp Automation", price: 119, platformLabel: "How are you currently using WhatsApp for your business?", platforms: ["WhatsApp Business App", "WhatsApp Business Platform", "Third-party WhatsApp tool", "Not set up yet", "I'm not sure"] },
  { name: "Email Automation Setup", price: 49, platformLabel: "Which email platform do you currently use?", platforms: ["Brevo", "MailerLite", "GetResponse", "Mailchimp", "ActiveCampaign", "Other", "I'm not sure"] },
  { name: "Make.com Workflow", price: 99, platformLabel: "Which apps do you want to connect?", platforms: ["Google Workspace", "CRM", "Email", "WhatsApp", "Forms", "Other"] },
  { name: "API Integration", price: 149, platformLabel: "Which two systems do you want to connect?", platforms: ["Website + CRM", "CRM + Email", "Website + Payment", "App + Backend", "Other", "I'm not sure"] },
];

const outcomeOptions = [
  "Capture leads",
  "Follow up with customers",
  "Send notifications",
  "Move information between systems",
  "Organize customer information",
  "Reduce repetitive work",
];

const STORAGE_KEY = "gbolix-automation-request-draft";

type Draft = {
  serviceName: string;
  goal: string;
  platform: string;
  currentProcess: string;
  outcomes: string[];
  accountsReady: string;
  notes: string;
  fileNames: string[];
};

const emptyDraft: Draft = {
  serviceName: "",
  goal: "",
  platform: "",
  currentProcess: "",
  outcomes: [],
  accountsReady: "",
  notes: "",
  fileNames: [],
};

export default function NewRequest() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createMutation = useCreateProject();

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setDraft({ ...emptyDraft, ...JSON.parse(saved) });
    } catch {
      // Ignore malformed local drafts.
    }
  }, []);

  useEffect(() => {
    if (draft.serviceName || draft.goal || draft.platform || draft.currentProcess || draft.notes || draft.fileNames.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }
  }, [draft]);

  const selectedService = useMemo(
    () => automationServices.find((service) => service.name === draft.serviceName) ?? null,
    [draft.serviceName]
  );

  const updateDraft = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const toggleOutcome = (outcome: string) => {
    setDraft((current) => ({
      ...current,
      outcomes: current.outcomes.includes(outcome)
        ? current.outcomes.filter((item) => item !== outcome)
        : [...current.outcomes, outcome],
    }));
  };

  const canContinue = () => {
    if (step === 1) return Boolean(draft.serviceName);
    if (step === 2) return draft.goal.trim().length >= 10;
    if (step === 3) return Boolean(draft.platform);
    if (step === 4) return draft.currentProcess.trim().length >= 10;
    if (step === 5) return draft.outcomes.length > 0;
    if (step === 6) return Boolean(draft.accountsReady);
    return true;
  };

  const next = () => {
    if (!canContinue()) return;
    setStep((current) => Math.min(current + 1, 8));
  };

  const back = () => setStep((current) => Math.max(current - 1, 1));

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    updateDraft("fileNames", [...new Set([...draft.fileNames, ...files.map((file) => file.name)])]);
    event.target.value = "";
  };

  const handleSubmit = () => {
    if (!selectedService) return;

    const requirements = {
      service: selectedService.name,
      automation_goal: draft.goal.trim(),
      platform: draft.platform,
      current_process: draft.currentProcess.trim(),
      desired_outcomes: draft.outcomes,
      accounts_ready: draft.accountsReady,
      attached_files: draft.fileNames,
      additional_notes: draft.notes.trim(),
    };

    createMutation.mutate(
      {
        data: {
          serviceType: selectedService.name,
          title: `${selectedService.name} Request`,
          description: draft.goal.trim(),
          priority: "medium",
          price: selectedService.price,
          requirements,
        } as any,
      },
      {
        onSuccess: (project) => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          setSubmittedCode(project.projectCode ?? `GBX-${project.id}`);
          localStorage.removeItem(STORAGE_KEY);
          setStep(8);
        },
      }
    );
  };

  const stepLabels = ["Service", "Goal", "Platform", "Current Process", "Outcome", "Accounts", "Files", "Review"];

  return (
    <ClientLayout>
      <div className="p-6 max-w-3xl mx-auto">
        {step < 8 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Automation Setup</p>
                <h1 className="text-2xl font-bold mt-1">Let's understand what you need</h1>
              </div>
              <span className="text-sm text-muted-foreground">Step {step} of 7</span>
            </div>
            <div className="flex gap-1.5 mb-3">
              {stepLabels.slice(0, 7).map((label, index) => (
                <div key={label} className="flex-1">
                  <div className={`h-1.5 rounded-full ${index + 1 <= step ? "bg-primary" : "bg-muted"}`} />
                  <p className="text-[10px] text-muted-foreground mt-1 hidden sm:block">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <section className="bg-card border border-border rounded-xl p-6">
            <p className="text-sm text-muted-foreground mb-5">Choose the automation service that best matches what you want to achieve.</p>
            <div className="space-y-2">
              {automationServices.map((service) => {
                const selected = draft.serviceName === service.name;
                return (
                  <button
                    key={service.name}
                    type="button"
                    onClick={() => updateDraft("serviceName", service.name)}
                    className={`w-full flex items-center justify-between rounded-xl border p-4 text-left transition-all ${selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {selected ? <Check size={15} /> : <span className="text-xs">+</span>}
                      </div>
                      <span className={selected ? "font-semibold text-primary" : "font-medium"}>{service.name}</span>
                    </div>
                    <span className="font-bold text-primary">${service.price}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 2 && (
          <Question title="What would you like us to automate?" description="Describe the task or problem in your own words. No technical details are needed." >
            <Textarea value={draft.goal} onChange={(e) => updateDraft("goal", e.target.value)} placeholder="Example: When someone submits our website form, I want their information added to our CRM and our sales team notified." rows={6} autoFocus />
            <p className="text-xs text-muted-foreground mt-2">{draft.goal.length}/500</p>
          </Question>
        )}

        {step === 3 && selectedService && (
          <Question title={selectedService.platformLabel} description="Choose the option that best describes your current setup. You can explain more later if needed.">
            <div className="grid gap-2 sm:grid-cols-2">
              {selectedService.platforms.map((platform) => (
                <Choice key={platform} selected={draft.platform === platform} onClick={() => updateDraft("platform", platform)} label={platform} />
              ))}
            </div>
          </Question>
        )}

        {step === 4 && (
          <Question title="How does this process work today?" description="Tell us what happens from start to finish. Write it just as you would explain it to a person.">
            <Textarea value={draft.currentProcess} onChange={(e) => updateDraft("currentProcess", e.target.value)} placeholder="Example: A customer fills out our form. I receive the information by email, then manually add it to our CRM and send a follow-up message." rows={7} autoFocus />
          </Question>
        )}

        {step === 5 && (
          <Question title="What should happen automatically?" description="Select everything you would like the automation to accomplish.">
            <div className="grid gap-2 sm:grid-cols-2">
              {outcomeOptions.map((outcome) => (
                <Choice key={outcome} selected={draft.outcomes.includes(outcome)} onClick={() => toggleOutcome(outcome)} label={outcome} />
              ))}
            </div>
          </Question>
        )}

        {step === 6 && (
          <Question title="Do you already have the necessary accounts?" description="Don't enter passwords, API keys, or other sensitive credentials here. We'll request anything else later if needed.">
            <div className="space-y-2">
              {[
                ["everything_ready", "Yes, everything is ready"],
                ["some_ready", "I have some of the accounts"],
                ["need_setup", "No, I need help setting them up"],
                ["not_sure", "I'm not sure"],
              ].map(([value, label]) => (
                <Choice key={value} selected={draft.accountsReady === value} onClick={() => updateDraft("accountsReady", value)} label={label} />
              ))}
            </div>
          </Question>
        )}

        {step === 7 && (
          <Question title="Anything that could help us understand the project?" description="Files are optional. You can also leave a note for our team.">
            <label className="border border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 transition-colors">
              <Upload size={22} className="text-primary mb-2" />
              <span className="font-medium text-sm">Choose helpful files</span>
              <span className="text-xs text-muted-foreground mt-1">Screenshots, documents, examples, or workflow diagrams</span>
              <input type="file" multiple className="hidden" onChange={handleFiles} />
            </label>

            {draft.fileNames.length > 0 && (
              <div className="mt-4 space-y-2">
                {draft.fileNames.map((name) => (
                  <div key={name} className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg px-3 py-2">
                    <FileText size={15} className="text-primary" />
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5">
              <label className="text-sm font-medium mb-1.5 block">Additional notes <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Textarea value={draft.notes} onChange={(e) => updateDraft("notes", e.target.value)} placeholder="Anything else you'd like our team to know?" rows={5} />
            </div>
          </Question>
        )}

        {step === 8 && !submittedCode && selectedService && (
          <section className="bg-card border border-border rounded-xl p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Review & Confirm</p>
            <h1 className="text-2xl font-bold mt-1 mb-6">Here is what we'll review</h1>
            <div className="space-y-4">
              <ReviewRow label="Service" value={`${selectedService.name} — $${selectedService.price}`} />
              <ReviewRow label="What you want to automate" value={draft.goal} />
              <ReviewRow label="Current platform" value={draft.platform} />
              <ReviewRow label="Current process" value={draft.currentProcess} />
              <ReviewRow label="Desired outcome" value={draft.outcomes.join(", ")} />
              <ReviewRow label="Accounts" value={accountLabel(draft.accountsReady)} />
              {draft.fileNames.length > 0 && <ReviewRow label="Files" value={draft.fileNames.join(", ")} />}
              {draft.notes && <ReviewRow label="Additional notes" value={draft.notes} />}
            </div>
          </section>
        )}

        {step === 8 && submittedCode && (
          <section className="text-center py-12" data-testid="section-request-success">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={30} className="text-primary" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Request Submitted</p>
            <h1 className="text-3xl font-bold mb-3">We have received your request.</h1>
            <p className="text-muted-foreground max-w-lg mx-auto mb-7">Our team will review the information and contact you through your project conversation if we need anything else.</p>
            <div className="inline-flex flex-col items-center rounded-xl border border-border bg-card px-8 py-5 mb-7">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Project ID</span>
              <span className="text-xl font-bold tracking-wide mt-1">{submittedCode}</span>
              <Badge className="mt-3 bg-primary/10 text-primary border-primary/20">Pending Review</Badge>
            </div>
            <div>
              <Button onClick={() => setLocation("/tasks")} className="bg-primary text-primary-foreground hover:bg-primary/90">View My Tasks</Button>
            </div>
          </section>
        )}

        {step < 8 && (
          <div className="flex gap-3 mt-6">
            {step > 1 ? (
              <Button variant="outline" onClick={back} className="flex-1 gap-2"><ChevronLeft size={14} /> Back</Button>
            ) : (
              <Button variant="outline" onClick={() => setLocation("/services")} className="flex-1">Cancel</Button>
            )}
            <Button onClick={next} disabled={!canContinue()} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
              Continue <ChevronRight size={14} />
            </Button>
          </div>
        )}

        {step === 8 && !submittedCode && (
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={back} className="flex-1 gap-2"><ChevronLeft size={14} /> Back</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              {createMutation.isPending ? "Submitting..." : "Confirm & Submit"}
            </Button>
          </div>
        )}

        {createMutation.isError && (
          <p className="text-sm text-destructive text-center mt-4">We couldn't submit the request. Please try again.</p>
        )}
      </div>
    </ClientLayout>
  );
}

function Question({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground mb-6">{description}</p>
      {children}
    </section>
  );
}

function Choice({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`w-full flex items-center gap-3 text-left rounded-xl border px-4 py-3.5 transition-all ${selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
      <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
        {selected && <Check size={12} />}
      </span>
      <span className={selected ? "font-medium text-primary" : "text-sm"}>{label}</span>
    </button>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border pb-3 last:border-0 last:pb-0">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm leading-6 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function accountLabel(value: string) {
  const labels: Record<string, string> = {
    everything_ready: "Yes, everything is ready",
    some_ready: "I have some of the accounts",
    need_setup: "I need help setting them up",
    not_sure: "I'm not sure",
  };
  return labels[value] ?? value;
}
