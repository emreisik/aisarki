"use client";

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
}

export default function WizardProgress({
  currentStep,
  totalSteps,
}: WizardProgressProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isDone = step < currentStep;
        return (
          <div
            key={step}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              isActive
                ? "w-6 bg-[#1db954]"
                : isDone
                  ? "w-3 bg-[#1db954]/50"
                  : "w-3 bg-[#333]"
            }`}
          />
        );
      })}
    </div>
  );
}
