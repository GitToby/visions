import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Step1Identity } from "@/features/wizard/Step1Identity";
import { Step2Rooms } from "@/features/wizard/Step2Rooms";
import { Step3Styles } from "@/features/wizard/Step3Styles";
import { useWizardState } from "@/features/wizard/useWizardState";

const STEP_LABELS = ["Name", "Rooms", "Styles"];

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const wizard = useWizardState();
  const navigate = useNavigate();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  function handleClose() {
    wizard.reset();
    onClose();
  }

  function handleComplete(houseId: string) {
    wizard.reset();
    onClose();
    navigate(`/home/${houseId}`);
  }

  return (
    <dialog ref={dialogRef} className="modal" onClose={handleClose}>
      <div className="modal-box w-full max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold">New Project</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Steps indicator */}
        <ul className="steps steps-horizontal mb-8 w-full">
          {STEP_LABELS.map((label, i) => (
            <li
              key={label}
              className={`step ${i + 1 <= wizard.step ? "step-primary" : ""}`}
            >
              {label}
            </li>
          ))}
        </ul>

        {/* Step content */}
        {wizard.step === 1 && (
          <Step1Identity
            houseName={wizard.houseName}
            onHouseNameChange={wizard.setHouseName}
            onHouseCreated={wizard.setHouseId}
            onNext={wizard.nextStep}
          />
        )}
        {wizard.step === 2 && wizard.houseId && (
          <Step2Rooms
            houseId={wizard.houseId}
            onNext={wizard.nextStep}
            onBack={wizard.prevStep}
          />
        )}
        {wizard.step === 3 && wizard.houseId && (
          <Step3Styles
            houseId={wizard.houseId}
            selectedStyleIds={wizard.selectedStyleIds}
            onStylesChange={wizard.setSelectedStyleIds}
            onBack={wizard.prevStep}
            onComplete={handleComplete}
          />
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" onClick={handleClose}>
          close
        </button>
      </form>
    </dialog>
  );
}
