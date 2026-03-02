import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Step1Identity } from "@/features/wizard/Step1Identity";
import { Step2Rooms } from "@/features/wizard/Step2Rooms";
import { Step3Styles } from "@/features/wizard/Step3Styles";
import { useWizardState } from "@/features/wizard/useWizardState";
import { WizardShell } from "@/features/wizard/WizardShell";

export function WizardPage() {
  const wizard = useWizardState();
  const navigate = useNavigate();

  // Guard: steps 2 & 3 require a houseId
  useEffect(() => {
    if (wizard.step > 1 && !wizard.houseId) {
      navigate("/", { replace: true });
    }
  }, [wizard.step, wizard.houseId, navigate]);

  if (wizard.step === 1) {
    return (
      <WizardShell step={1}>
        <Step1Identity
          houseName={wizard.houseName}
          onHouseNameChange={wizard.setHouseName}
          onHouseCreated={wizard.setHouseId}
          onNext={wizard.nextStep}
        />
      </WizardShell>
    );
  }

  if (wizard.step === 2 && wizard.houseId) {
    return (
      <WizardShell step={2}>
        <Step2Rooms
          houseId={wizard.houseId}
          onNext={wizard.nextStep}
          onBack={wizard.prevStep}
        />
      </WizardShell>
    );
  }

  if (wizard.step === 3 && wizard.houseId) {
    return (
      <WizardShell step={3}>
        <Step3Styles
          houseId={wizard.houseId}
          selectedStyleIds={wizard.selectedStyleIds}
          onStylesChange={wizard.setSelectedStyleIds}
          onBack={wizard.prevStep}
        />
      </WizardShell>
    );
  }

  return null;
}
