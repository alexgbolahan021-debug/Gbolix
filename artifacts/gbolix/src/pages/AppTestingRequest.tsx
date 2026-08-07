import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, ChevronLeft, ChevronRight, FileText, Upload } from "lucide-react";
import { useCreateProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const services = [
  { name: "Google Play Closed Testing (14 Days)", price: 49, time: "14 days", included: "Closed testing management and tester coordination" },
  { name: "QA Report", price: 15, time: "2–3 business days", included: "Professional QA review with findings" },
  { name: "Android App Ranking Audit", price: 29, time: "2–3 business days", included: "Play Store visibility and ranking review" },
];

const testingFocus = ["App functionality", "User experience", "Navigation", "Forms & interactions", "Performance", "Bugs & crashes", "General testing"];
const qaAreas = ["UI", "UX", "Performance", "Crashes", "Login", "Payments", "Navigation", "General app quality"];
const rankingGoals = ["Improve app visibility", "Increase downloads", "Improve search ranking", "Improve store listing", "Understand low performance", "General ranking audit"];

const STORAGE_KEY = "gbolix-app-testing-request-draft";

type Draft = {
  serviceName: string;
  appName: string;
  appLink: string;
  packageName: string;
  playConsoleEmail: string;
  testingStage: string;
  testingFocus: string[];
  specialInstructions: string;
  qaPlatform: string;
  qaAreas: string[];
  rankingGoal: string;
  targetCountry: string;
  targetAudience: string;
  competitors: string;
  keywords: string;
  accessNote: string;
  notes: string;
  fileNames: string[];
};

const emptyDraft: Draft = {
  serviceName: "", appName: "", appLink: "", packageName: "", playConsoleEmail: "", testingStage: "",
  testingFocus: [], specialInstructions: "", qaPlatform: "", qaAreas: [], rankingGoal: "", targetCountry: "",
  targetAudience: "", competitors: "", keywords: "", accessNote: "", notes: "", fileNames: [],
};

export default function AppTestingRequest() {
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
    } catch { /* ignore malformed drafts */ }
  }, []);

  useEffect(() => {
    if (Object.values(draft).some(value => Array.isArray(value) ? value.length > 0 : Boolean(value))) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }
  }, [draft]);

  const selectedService = useMemo(() => services.find(service => service.name === draft.serviceName) ?? null, [draft.serviceName]);
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(current => ({ ...current, [key]: value }));
  const toggle = (key: "testingFocus" | "qaAreas", value: string) => setDraft(current => ({ ...current, [key]: current[key].includes(value) ? current[key].filter(item => item !== value) : [...current[key], value] }));

  const canContinue = () => {
    if (step === 1) return Boolean(draft.serviceName);
    if (step === 2) return Boolean(draft.appName.trim() && draft.appLink.trim());
    if (draft.serviceName.startsWith("Google Play")) {
      if (step === 3) return Boolean(draft.testingStage);
      if (step === 4) return draft.testingFocus.length > 0;
    } else if (draft.serviceName === "QA Report") {
      if (step === 3) return Boolean(draft.qaPlatform);
      if (step === 4) return draft.qaAreas.length > 0;
    } else {
      if (step === 3) return Boolean(draft.rankingGoal);
      if (step === 4) return Boolean(draft.targetCountry.trim() && draft.targetAudience.trim());
    }
    return true;
  };

  const next = () => { if (canContinue()) setStep(current => Math.min(current + 1, 7)); };
  const back = () => setStep(current => Math.max(current - 1, 1));
  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    update("fileNames", [...new Set([...draft.fileNames, ...files.map(file => file.name)])]);
    event.target.value = "";
  };

  const handleSubmit = () => {
    if (!selectedService) return;
    const requirements = {
      service: selectedService.name,
      app_name: draft.appName.trim(),
      app_link: draft.appLink.trim(),
      package_name: draft.packageName.trim(),
      play_console_email: draft.playConsoleEmail.trim(),
      testing_stage: draft.testingStage,
      testing_focus: draft.testingFocus,
      special_instructions: draft.specialInstructions.trim(),
      qa_platform: draft.qaPlatform,
      qa_areas: draft.qaAreas,
      ranking_goal: draft.rankingGoal,
      target_country: draft.targetCountry.trim(),
      target_audience: draft.targetAudience.trim(),
      competitors: draft.competitors.trim(),
      keywords: draft.keywords.trim(),
      access_note: draft.accessNote.trim(),
      attached_files: draft.fileNames,
      additional_notes: draft.notes.trim(),
    };
    createMutation.mutate({ data: {
      serviceType: selectedService.name,
      title: `${selectedService.name} Request`,
      description: draft.appName.trim(),
      priority: "medium",
      price: selectedService.price,
      requirements,
    } as any }, { onSuccess: project => {
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      setSubmittedCode(project.projectCode ?? `GBX-${project.id}`);
      localStorage.removeItem(STORAGE_KEY);
      setStep(7);
    }});
  };

  const labels = ["Service", "App", "Details", "Focus", "References", "Review"];
  const isClosed = draft.serviceName.startsWith("Google Play");
  const isQA = draft.serviceName === "QA Report";

  return <ClientLayout><div className="p-4 md:p-6 max-w-3xl mx-auto w-full">
    {step < 7 && <div className="mb-7">
      <div className="flex items-start justify-between gap-4 mb-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">App Testing</p><h1 className="text-2xl font-bold mt-1">Let's understand your app</h1><p className="text-sm text-muted-foreground mt-1">A few simple questions so we can review your request properly.</p></div><span className="text-sm text-muted-foreground whitespace-nowrap">Step {step} of 6</span></div>
      <div className="flex gap-1.5">{labels.map((label, index) => <div key={label} className="flex-1"><div className={`h-1.5 rounded-full ${index + 1 <= step ? "bg-primary" : "bg-muted"}`} /><p className="text-[10px] text-muted-foreground mt-1 hidden sm:block">{label}</p></div>)}</div>
    </div>}

    {step === 1 && <section className="bg-card border border-border rounded-xl p-5 md:p-6"><p className="text-sm text-muted-foreground mb-5">Choose the App Testing service you need.</p><div className="space-y-2">{services.map(service => { const selected = draft.serviceName === service.name; return <button key={service.name} type="button" onClick={() => update("serviceName", service.name)} className={`w-full rounded-xl border p-4 text-left transition-all ${selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{selected ? <Check size={15} /> : <span className="text-xs">+</span>}</div><div><p className={selected ? "font-semibold text-primary" : "font-medium"}>{service.name}</p><p className="text-xs text-muted-foreground mt-1">{service.included}</p></div></div><span className="font-bold text-primary whitespace-nowrap">${service.price}</span></div><div className="mt-3 ml-11 text-[11px] text-muted-foreground">Typical delivery: {service.time}</div></button>})}</div></section>}

    {step === 2 && <Question title="Tell us about your app" description="Start with the basics. You don't need to explain the technical side yet."><Field label="App name" value={draft.appName} onChange={value => update("appName", value)} placeholder="e.g. My Business App" /><Field label={isClosed ? "Testing or Google Play link" : "App link"} value={draft.appLink} onChange={value => update("appLink", value)} placeholder="https://play.google.com/..." /><div className="grid sm:grid-cols-2 gap-4"><Field label="Package name" value={draft.packageName} onChange={value => update("packageName", value)} placeholder="Optional" /><Field label="Google Play Console email" value={draft.playConsoleEmail} onChange={value => update("playConsoleEmail", value)} placeholder="Optional" /></div></Question>}

    {step === 3 && isClosed && <Question title="Where is your app currently?" description="Choose the option that best describes your testing setup."><div className="space-y-2">{[["ready", "Ready for closed testing"],["already_testing", "Already in closed testing"],["setup_needed", "Testing setup is not complete"],["not_sure", "I'm not sure"]].map(([value,label]) => <Choice key={value} selected={draft.testingStage === value} onClick={() => update("testingStage", value)} label={label} />)}</div></Question>}
    {step === 3 && isQA && <Question title="Which platform should we review?" description="Choose where you want the QA review performed."><div className="grid sm:grid-cols-3 gap-2">{["Android","iOS","Web"].map(value => <Choice key={value} selected={draft.qaPlatform === value} onClick={() => update("qaPlatform", value)} label={value} />)}</div></Question>}
    {step === 3 && !isClosed && !isQA && <Question title="What are you trying to improve?" description="Choose the main goal for your ranking audit."><div className="space-y-2">{rankingGoals.map(value => <Choice key={value} selected={draft.rankingGoal === value} onClick={() => update("rankingGoal", value)} label={value} />)}</div></Question>}

    {step === 4 && isClosed && <Question title="What should our testers focus on?" description="Select everything that matters for your app."><div className="grid sm:grid-cols-2 gap-2">{testingFocus.map(value => <Choice key={value} selected={draft.testingFocus.includes(value)} onClick={() => toggle("testingFocus", value)} label={value} />)}</div></Question>}
    {step === 4 && isQA && <Question title="What should our QA review focus on?" description="Select the areas you want us to check."><div className="grid sm:grid-cols-2 gap-2">{qaAreas.map(value => <Choice key={value} selected={draft.qaAreas.includes(value)} onClick={() => toggle("qaAreas", value)} label={value} />)}</div></Question>}
    {step === 4 && !isClosed && !isQA && <Question title="Tell us about your current situation" description="A short explanation helps us understand why you want the audit."><Textarea value={draft.specialInstructions} onChange={e => update("specialInstructions", e.target.value)} placeholder="Example: My app is live but we're getting very few downloads and I don't know why." rows={6} /></Question>}

    {step === 5 && <Question title={isClosed ? "Anything important our team should know?" : isQA ? "Is there anything specific you'd like us to check?" : "Tell us about your audience and market"} description="Keep it simple. You can provide more technical details later through the project conversation.">
      {isClosed && <><Textarea value={draft.specialInstructions} onChange={e => update("specialInstructions", e.target.value)} placeholder="Test accounts, areas of concern, special instructions, or anything else..." rows={6} /><div className="mt-4"><Field label="Optional tester note" value={draft.accessNote} onChange={value => update("accessNote", value)} placeholder="Anything testers should know before starting" /></div></>}
      {isQA && <><Textarea value={draft.specialInstructions} onChange={e => update("specialInstructions", e.target.value)} placeholder="For example: please pay special attention to login, checkout, or a specific feature." rows={6} /><div className="mt-4"><Field label="App access note (optional)" value={draft.accessNote} onChange={value => update("accessNote", value)} placeholder="Describe how our team can access the app. Do not enter passwords here." /></div></>}
      {!isClosed && !isQA && <div className="space-y-4"><Field label="Target country" value={draft.targetCountry} onChange={value => update("targetCountry", value)} placeholder="e.g. United States" /><Field label="Target audience" value={draft.targetAudience} onChange={value => update("targetAudience", value)} placeholder="Who is the app for?" /><Field label="Competitors (optional)" value={draft.competitors} onChange={value => update("competitors", value)} placeholder="App names or Play Store links" /><Field label="Keywords (optional)" value={draft.keywords} onChange={value => update("keywords", value)} placeholder="Keywords you want to rank for" /></div>}
    </Question>}

    {step === 6 && <Question title="Files & references" description="Optional. Upload screenshots, reports, test instructions, APK/AAB files, or other helpful material."><label className="border border-dashed border-border rounded-xl p-7 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 transition-colors"><Upload size={22} className="text-primary mb-2" /><span className="font-medium text-sm">Choose helpful files</span><span className="text-xs text-muted-foreground mt-1">PDF, DOCX, ZIP, PNG, JPG, JPEG, CSV, TXT, or other relevant files</span><input type="file" multiple className="hidden" onChange={handleFiles} /></label>{draft.fileNames.length > 0 && <div className="mt-4 space-y-2">{draft.fileNames.map(name => <div key={name} className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg px-3 py-2"><FileText size={15} className="text-primary shrink-0" /><span className="truncate">{name}</span></div>)}</div>}<div className="mt-5"><label className="text-sm font-medium mb-1.5 block">Additional notes <span className="text-muted-foreground font-normal">(optional)</span></label><Textarea value={draft.notes} onChange={e => update("notes", e.target.value)} placeholder="Anything else you'd like our team to know?" rows={5} /></div></Question>}

    {step === 7 && !submittedCode && selectedService && <section className="bg-card border border-border rounded-xl p-5 md:p-6"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Review & Confirm</p><h1 className="text-2xl font-bold mt-1 mb-6">Your request is ready</h1><div className="rounded-xl border border-border bg-muted/20 p-4 mb-5"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{selectedService.name}</p><p className="text-xs text-muted-foreground mt-1">Delivery: {selectedService.time}</p></div><span className="font-bold text-primary">${selectedService.price}</span></div></div><div className="space-y-4"><ReviewRow label="App" value={`${draft.appName} — ${draft.appLink}`} /><ReviewRow label="Package name" value={draft.packageName} /><ReviewRow label="Google Play Console email" value={draft.playConsoleEmail} />{isClosed && <><ReviewRow label="Testing stage" value={draft.testingStage} /><ReviewRow label="Testing focus" value={draft.testingFocus.join(", ")} /><ReviewRow label="Instructions" value={draft.specialInstructions} /></>}{isQA && <><ReviewRow label="Platform" value={draft.qaPlatform} /><ReviewRow label="QA areas" value={draft.qaAreas.join(", ")} /><ReviewRow label="Instructions" value={draft.specialInstructions} /></>}{!isClosed && !isQA && <><ReviewRow label="Goal" value={draft.rankingGoal} /><ReviewRow label="Target country" value={draft.targetCountry} /><ReviewRow label="Target audience" value={draft.targetAudience} /><ReviewRow label="Competitors" value={draft.competitors} /><ReviewRow label="Keywords" value={draft.keywords} /></>} {draft.fileNames.length > 0 && <ReviewRow label="Files" value={draft.fileNames.join(", ")} />}<ReviewRow label="Additional notes" value={draft.notes} /></div></section>}

    {step === 7 && submittedCode && <section className="text-center py-12" data-testid="section-app-testing-success"><div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"><Check size={30} className="text-primary" /></div><p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Request Submitted</p><h1 className="text-3xl font-bold mb-3">We have received your request.</h1><p className="text-muted-foreground max-w-lg mx-auto mb-7">We'll review the information and use your project conversation if we need anything else.</p><div className="inline-flex flex-col items-center rounded-xl border border-border bg-card px-8 py-5 mb-7"><span className="text-xs text-muted-foreground uppercase tracking-wider">Project ID</span><span className="text-xl font-bold tracking-wide mt-1">{submittedCode}</span><Badge className="mt-3 bg-primary/10 text-primary border-primary/20">Pending Review</Badge></div><Button onClick={() => setLocation("/tasks")} className="bg-primary text-primary-foreground hover:bg-primary/90">View My Tasks</Button></section>}

    {step < 7 && <div className="flex gap-3 mt-6">{step > 1 ? <Button variant="outline" onClick={back} className="flex-1 gap-2"><ChevronLeft size={14} /> Back</Button> : <Button variant="outline" onClick={() => setLocation("/services")} className="flex-1">Cancel</Button>}<Button onClick={step === 6 ? () => { if (canContinue()) setStep(7); } : next} disabled={createMutation.isPending || !canContinue()} className="flex-1 gap-2">{step === 6 ? "Review Request" : "Continue"}<ChevronRight size={14} /></Button></div>}
    {step === 7 && !submittedCode && <div className="flex gap-3 mt-6"><Button variant="outline" onClick={back} className="flex-1">Back</Button><Button onClick={handleSubmit} disabled={createMutation.isPending} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">{createMutation.isPending ? "Submitting..." : "Submit Request"}</Button></div>}
  </div></ClientLayout>;
}

function Question({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="bg-card border border-border rounded-xl p-5 md:p-6"><h2 className="text-xl font-semibold">{title}</h2><p className="text-sm text-muted-foreground mt-2 mb-6">{description}</p>{children}</section>; }
function Choice({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) { return <button type="button" onClick={onClick} className={`w-full rounded-xl border p-3.5 text-left text-sm transition-all flex items-center gap-3 ${selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}><span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>{selected && <Check size={12} />}</span>{label}</button>; }
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <div><label className="text-sm font-medium mb-1.5 block">{label}</label><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></div>; }
function ReviewRow({ label, value }: { label: string; value?: string }) { if (!value) return null; return <div className="border-b border-border last:border-0 pb-3 last:pb-0"><p className="text-xs font-medium text-muted-foreground mb-1">{label}</p><p className="text-sm whitespace-pre-wrap break-words">{value}</p></div>; }
