import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCompleteOnboarding } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { ChevronRight } from "lucide-react";

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
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
            setLocation("/dashboard");
          },
        }
      );
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-10">
          <img src="/logo.svg" alt="Gbolix" className="h-8 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Let's personalize your experience</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Step {step + 1} of {steps.length}</span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1" data-testid="progress-onboarding" />
        </div>

        {/* Question */}
        <div className="bg-card border border-border rounded-2xl p-8">
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
                    }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {mutation.isPending && (
            <p className="text-center text-muted-foreground text-sm mt-6">Setting up your account...</p>
          )}
        </div>

        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto"
            data-testid="button-back"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}
