import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { apiClient } from "../../../lib/api/hooks";
import type { components } from "../../../lib/api/schema";
import { StylePicker } from "../../styles/StylePicker";

type RoomResponse = components["schemas"]["RoomResponse"];

interface GenerateWizardModalProps {
  propertyId: string;
  rooms: RoomResponse[];
  onClose: () => void;
}

export function GenerateWizardModal({ propertyId, rooms, onClose }: GenerateWizardModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const uploadedRooms = rooms.filter((r) => r.image_url);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(
    () => new Set(uploadedRooms.map((r) => r.id))
  );

  const toggleRoom = (id: string) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const chosenRooms = uploadedRooms.filter((r) => selectedRoomIds.has(r.id));
  const totalGenerations = chosenRooms.length * selectedStyleIds.length;

  const handleGenerate = async () => {
    if (!propertyId || chosenRooms.length === 0 || selectedStyleIds.length === 0) return;
    setGenerating(true);
    setError(null);
    const jobs = chosenRooms.flatMap((r) =>
      selectedStyleIds.map((style) => ({ room_id: r.id, style }))
    );
    const results = await Promise.all(
      jobs.map((body) => apiClient.POST("/generation", { body }))
    );
    const apiError = results.find((r) => r.error)?.error ?? null;
    setGenerating(false);
    if (apiError) {
      setError("Generation failed. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({
      queryKey: ["get", "/generation/houses/{property_id}", propertyId],
    });
    onClose();
  };

  const handleClose = () => {
    if (!generating) onClose();
  };

  return (
    <dialog
      className="modal modal-open"
      onKeyDown={(e) => { if (e.key === "Escape") handleClose(); }}
    >
      <div className="modal-box max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            <h3 className="text-lg font-semibold">
              {step === 1 ? "Choose styles" : "Confirm & generate"}
            </h3>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={handleClose}
            disabled={generating}
          >
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <ul className="steps steps-horizontal w-full mb-5 text-xs shrink-0">
          <li className={`step ${step >= 1 ? "step-primary" : ""}`}>Choose styles</li>
          <li className={`step ${step >= 2 ? "step-primary" : ""}`}>Confirm</li>
        </ul>

        {/* Step 1: Style picker */}
        {step === 1 && (
          <>
            <div className="overflow-y-auto flex-1 min-h-0">
              <StylePicker selectedIds={selectedStyleIds} onChange={setSelectedStyleIds} />
            </div>
            <div className="modal-action shrink-0 mt-4">
              <button type="button" className="btn btn-ghost" onClick={handleClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(2)}
                disabled={selectedStyleIds.length === 0}
              >
                Next →
              </button>
            </div>
          </>
        )}

        {/* Step 2: Confirm */}
        {step === 2 && (
          <>
            <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-2 gap-4">
                {/* Rooms — toggleable */}
                <div className="bg-base-200 rounded-box p-4">
                  <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium mb-3">
                    Rooms
                  </p>
                  {uploadedRooms.length === 0 ? (
                    <p className="text-sm text-base-content/40 italic">No rooms uploaded</p>
                  ) : (
                    <ul className="space-y-2">
                      {uploadedRooms.map((r) => {
                        const on = selectedRoomIds.has(r.id);
                        return (
                          <li key={r.id}>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-primary checkbox-sm"
                                checked={on}
                                onChange={() => toggleRoom(r.id)}
                                disabled={generating}
                              />
                              <span className={`text-sm ${on ? "" : "text-base-content/40 line-through"}`}>
                                {r.label}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Styles */}
                <div className="bg-base-200 rounded-box p-4">
                  <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium mb-3">
                    Styles
                  </p>
                  <ul className="space-y-1">
                    {selectedStyleIds.map((s) => (
                      <li key={s} className="text-sm">{s}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="alert">
                <Sparkles size={16} />
                <span className="text-sm">
                  This will create{" "}
                  <strong>{totalGenerations} generation{totalGenerations !== 1 ? "s" : ""}</strong>
                  {" "}({chosenRooms.length} room{chosenRooms.length !== 1 ? "s" : ""} ×{" "}
                  {selectedStyleIds.length} style{selectedStyleIds.length !== 1 ? "s" : ""})
                </span>
              </div>

              {error && (
                <div className="alert alert-error">
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="modal-action shrink-0 mt-4">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(1)}
                disabled={generating}
              >
                ← Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleGenerate()}
                disabled={generating || chosenRooms.length === 0}
              >
                {generating ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
      <div className="modal-backdrop" onClick={handleClose} />
    </dialog>
  );
}
