import { useState } from "react";

export type WizardStep = 1 | 2 | 3;

interface WizardState {
  step: WizardStep;
  houseName: string;
  houseId: string | null;
  selectedStyleIds: string[];
}

interface WizardActions {
  setHouseName: (name: string) => void;
  setHouseId: (id: string) => void;
  setSelectedStyleIds: (ids: string[]) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function useWizardState(): WizardState & WizardActions {
  const [step, setStep] = useState<WizardStep>(1);
  const [houseName, setHouseName] = useState("");
  const [houseId, setHouseId] = useState<string | null>(null);
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);

  function nextStep() {
    setStep((s) => Math.min(s + 1, 3) as WizardStep);
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1) as WizardStep);
  }

  return {
    step,
    houseName,
    houseId,
    selectedStyleIds,
    setHouseName,
    setHouseId,
    setSelectedStyleIds,
    nextStep,
    prevStep,
  };
}
