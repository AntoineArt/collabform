"use client";
import { STEPS } from "@/lib/types";
import { UserIcon, ShieldIcon, HeartIcon, CheckIcon } from "./Icons";

const STEP_ICONS = {
  user: UserIcon,
  shield: ShieldIcon,
  heart: HeartIcon,
  check: CheckIcon,
};

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: Set<number>;
}

export default function StepIndicator({ currentStep, completedSteps }: StepIndicatorProps) {
  return (
    <nav className="mb-8">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const Icon = STEP_ICONS[step.icon];
          const isActive = currentStep === step.id;
          const isCompleted = completedSteps.has(step.id);
          const isPast = step.id < currentStep;

          return (
            <li key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center relative">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? "bg-primary-600 text-white shadow-lg shadow-primary-200 scale-110"
                      : isCompleted || isPast
                      ? "bg-accent-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isCompleted || isPast ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium hidden @sm:block ${
                    isActive ? "text-primary-700" : isPast || isCompleted ? "text-accent-600" : "text-gray-400"
                  }`}
                >
                  {step.title}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-3 mt-[-20px] @sm:mt-[-32px]">
                  <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPast || isCompleted ? "bg-accent-500 w-full" : isActive ? "bg-primary-300 w-1/2" : "w-0"
                      }`}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
