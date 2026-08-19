import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useCompleteOnboarding, useUpdateMe } from "@workspace/api-client-react";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Check, Loader2 } from "lucide-react";

const steps = [
  {
    question: "What best describes you?",
    field: "userType",
    options: ["Startup Founder", "Agency Owner", "Small Business Owner", "Specialist", "Developer", "Marketing Professional", "Student", "Other"],
  },
  {
    question: "Where are you located?",
    field: "location",
    options: [
      "United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Nigeria", "South Africa",
      "India", "Brazil", "Mexico", "Netherlands", "Spain", "Italy", "Singapore", "UAE", "Kenya", "Ghana", "Other",
    ],
  },
  {
    question: "How big is your business?",
    field: "companySize",
    options: ["Just Me", "2–5 People", "6–20 People", "21–50 People", "50+ People"],
  },
  {
    question: "How did you hear about Gbolix?",
    field: "acquisitionSource",
    options: ["Google Search", "AI Suggestion", "X", "LinkedIn", "Facebook", "Instagram", "Discord", "Referral", "YouTube", "Other"],
  },
] as const;

type AccountDetails = {
  name: string;
  companyName: string;
  phone: string;
  website: string;
  city: string;
  country: string;
  language: string;
};

const emptyDetails: AccountDetails = {
  name: "",
  companyName: "",
  phone: "",
  website: "",
  city: "",
  country: "",
  language: "",
};

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<AccountDetails>(emptyDetails);
  const [detailsError, setDetailsError] = useState("");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const mutation = useCompleteOnboarding();
  const updateMutation = useUpdateMe();

  const totalSteps = steps.length + 1;
  const isDetailsStep = step === steps.length;
  const current = steps[step];
  const progress = (step / totalSteps) * 100;
  const isSaving = mutation.isPending || updateMutation.isPending;

  const select = (value: string) => {
    if (!current) return;
    const newAnswers = { ...answers, [current.field]: value };
    setAnswers(newAnswers);

    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setStep(steps.length);
    }
  };

  const updateDetail = (field: keyof AccountDetails, value: string) => {
    setDetailsError("");
    setDetails(currentDetails => ({ ...currentDetails, [field]: value }));
  };

  const completeSetup = () => {
    mutation.mutate(
      {
        data: {
          userType: answers.userType,
          location: answers.location,
          companySize: answers.companySize,
          acquisitionSource: answers.acquisitionSource,
        },
      },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetMeQueryKey(), data);
          queryClient.refetchQueries({ queryKey: getGetMeQueryKey() }).finally(() => {
            setLocation("/dashboard");
          });
        },
      },
    );
  };

  const saveDetailsAndFinish = () => {
    if (!details.name.trim()) {
      setDetailsError("Please enter your full name to continue.");
      return;
    }

    setDetailsError("");
    updateMutation.mutate(
      {
        data: {
          name: details.name.trim(),
          companyName: details.companyName.trim(),
          phone: details.phone.trim(),
          website: details.website.trim(),
          city: details.city.trim(),
          country: details.country.trim(),
          language: details.language.trim(),
        },
      },
      {
        onSuccess: (profile) => {
          queryClient.setQueryData(getGetMeQueryKey(), profile);
          completeSetup();
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <img src="/logo-icon.jpg" alt="Gbolix" className="h-16 w-16 mx-auto mb-3 object-contain rounded-xl" />
          <p className="text-muted-foreground text-sm">Let's personalize your experience</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Step {step + 1} of {totalSteps}</span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1" data-testid="progress-onboarding" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-lg">
          {isDetailsStep ? (
            <div>
              <div className="mb-7 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"><Check size={20} /></div>
                <h2 className="text-xl font-bold" data-testid="text-account-details-heading">Create your account profile</h2>
                <p className="mt-2 text-sm text-muted-foreground">Tell us a little more about you so we can personalize your Gbolix workspace.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="onboarding-full-name">Full Name</Label>
                  <Input id="onboarding-full-name" value={details.name} onChange={event => updateDetail("name", event.target.value)} placeholder="Your full name" autoComplete="name" data-testid="input-onboarding-full-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-company-name">Company Name</Label>
                  <Input id="onboarding-company-name" value={details.companyName} onChange={event => updateDetail("companyName", event.target.value)} placeholder="Your company" autoComplete="organization" data-testid="input-onboarding-company-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-phone">Phone Number</Label>
                  <Input id="onboarding-phone" value={details.phone} onChange={event => updateDetail("phone", event.target.value)} placeholder="+1 (555) 000-0000" autoComplete="tel" data-testid="input-onboarding-phone" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="onboarding-website">Website</Label>
                  <Input id="onboarding-website" value={details.website} onChange={event => updateDetail("website", event.target.value)} placeholder="https://yourcompany.com" type="url" autoComplete="url" data-testid="input-onboarding-website" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-city">City</Label>
                  <Input id="onboarding-city" value={details.city} onChange={event => updateDetail("city", event.target.value)} placeholder="Your city" autoComplete="address-level2" data-testid="input-onboarding-city" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-country">Country</Label>
                  <Input id="onboarding-country" value={details.country} onChange={event => updateDetail("country", event.target.value)} placeholder="Your country" autoComplete="country-name" data-testid="input-onboarding-country" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="onboarding-language">Language</Label>
                  <Input id="onboarding-language" value={details.language} onChange={event => updateDetail("language", event.target.value)} placeholder="e.g. English" autoComplete="language" data-testid="input-onboarding-language" />
                </div>
              </div>

              {detailsError && <div className="mt-5 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-destructive"><AlertCircle size={14} /><p className="text-sm">{detailsError}</p></div>}
              {(mutation.isError || updateMutation.isError) && <div className="mt-5 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-destructive"><AlertCircle size={14} /><p className="text-sm">Something went wrong. Please try again.</p></div>}

              <Button type="button" onClick={saveDetailsAndFinish} disabled={isSaving} className="mt-6 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-finish-onboarding">
                {isSaving ? <><Loader2 size={15} className="animate-spin" /> Saving your profile...</> : <>Continue to Gbolix <ArrowRight size={15} /></>}
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-6 text-center" data-testid="text-onboarding-question">{current.question}</h2>
              <div className="grid grid-cols-2 gap-3">
                {current.options.map(option => {
                  const selected = answers[current.field] === option;
                  return (
                    <button key={option} onClick={() => select(option)} disabled={isSaving} data-testid={`button-option-${option.toLowerCase().replace(/[\s–/]/g, "-")}`} className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left ${selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/40 hover:bg-accent text-foreground"} disabled:opacity-60 disabled:cursor-not-allowed`}>
                      {option}
                    </button>
                  );
                })}
              </div>
              {(mutation.isError || updateMutation.isError) && <div className="mt-6 flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg px-4 py-3"><AlertCircle size={14} /><p className="text-sm">Something went wrong. Please try again.</p></div>}
            </>
          )}
        </div>

        {step > 0 && !isSaving && <button onClick={() => setStep(step - 1)} className="mt-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto" data-testid="button-back">← Back</button>}
      </div>
    </div>
  );
}
