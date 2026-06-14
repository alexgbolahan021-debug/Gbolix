import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCompleteOnboarding } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { AlertCircle } from "lucide-react";

const steps = [
  {
    question: "What best describes you?",
    field: "userType",
    options: ["Startup Founder", "Agency Owner", "Small Business Owner", "Freelancer", "Developer", "Marketing Professional", "Student", "Other"],
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
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const mutation = useCompleteOnboarding();

  const current = steps[step];
  const progress = ((step) / steps.length) * 100;

  const select = (value: string) => {
    const newAnswers = { ...answers, [current.field]: value };
    setAnswers(newAnswers);

    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      mutation.mutate(
        {
          data: {
            userType: newAnswers.userType,
            location: newAnswers.location,
            companySize: newAnswers.companySize,
            acquisitionSource: newAnswers.acquisitionSource,
          },
        },
        {
          onSuccess: (data) => {
            queryClient.setQueryData(getGetMeQueryKey(), data);
            queryClient.refetchQueries({ queryKey: getGetMeQueryKey() }).finally(() => {
              setLocation("/dashboard");
            });
          },
          onError: () => {
            // Error state is shown via mutation.isError
          },
        }
      );
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <img src="/logo-icon.jpg" alt="Gbolix" className="h-16 w-16 mx-auto mb-3 object-contain rounded-xl" />
          <p className="text-muted-foreground text-sm">Let's personalize your experience</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Step {step + 1} of {steps.length}</span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1" data-testid="progress-onboarding" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <h2 className="text-xl font-bold mb-6 text-center" data-testid="text-onboarding-question">
            {current.question}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {current.options.map(option => {
              const selected = answers[current.field] === option;
              return (
                <button
                  key={option}
                  onClick={() => select(option)}
                  disabled={mutation.isPending}
                  data-testid={`button-option-${option.toLowerCase().replace(/[\s–/]/g, "-")}`}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left
                    ${selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:border-primary/40 hover:bg-accent text-foreground"
                    }
                    disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {mutation.isPending && (
            <div className="text-center mt-6 space-y-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground text-sm">Setting up your workspace...</p>
            </div>
          )}

          {mutation.isError && (
            <div className="mt-6 flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg px-4 py-3">
              <AlertCircle size={14} />
              <p className="text-sm">Something went wrong. Please try again.</p>
            </div>
          )}
        </div>

        {step > 0 && !mutation.isPending && (
          <button
            onClick={() => setStep(step - 1)}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto"
            data-testid="button-back"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
