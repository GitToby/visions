import type { ReactNode } from "react";
import type { WizardStep } from "./useWizardState";

const STEPS: { label: string }[] = [
  { label: "Name" },
  { label: "Rooms" },
  { label: "Styles" },
];

interface WizardShellProps {
  step: WizardStep;
  children: ReactNode;
}

export function WizardShell({ step, children }: WizardShellProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <ul className="steps steps-horizontal mb-8 w-full">
        {STEPS.map((s, i) => (
          <li
            key={s.label}
            className={`step ${i + 1 <= step ? "step-primary" : ""}`}
          >
            {s.label}
          </li>
        ))}
      </ul>
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">{children}</div>
      </div>
    </div>
  );
}
