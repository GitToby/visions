import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { StylePicker } from "@/features/styles/StylePicker";
import { apiClient } from "@/lib/api/hooks";
import type { components } from "@/lib/api/schema";

type RoomResponse = components["schemas"]["RoomResponse"];

interface GenerateWizardModalProps {
  propertyId: string;
  rooms: RoomResponse[];
  /** If set, wizard is in single-room mode — only this room is used */
  preselectedRoomId?: string;
  /** If set, shown as the base image (for "continue from here" flows) */
  baseImageUrl?: string;
  /** If set, this style is pre-selected (for "continue from here" flows) */
  preselectedStyleId?: string;
  onClose: () => void;
}

export function GenerateWizardModal({
  propertyId,
  rooms,
  preselectedRoomId,
  baseImageUrl,
  preselectedStyleId,
  onClose,
}: GenerateWizardModalProps) {
  const [step, setStep] = useState<1 | 2>(() => (preselectedStyleId ? 2 : 1));
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>(() =>
    preselectedStyleId ? [preselectedStyleId] : []
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<"balance" | "generic" | null>(null);
  const [extraContext, setExtraContext] = useState("");
  const queryClient = useQueryClient();

  const isSingleRoomMode = !!preselectedRoomId;

  const uploadedRooms = rooms.filter((r) => r.image_url);

  // In single-room mode the room is locked; in global mode all rooms start selected
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(() => {
    if (isSingleRoomMode) {
      return new Set(preselectedRoomId ? [preselectedRoomId] : []);
    }
    return new Set(uploadedRooms.map((r) => r.id));
  });

  const toggleRoom = (id: string) => {
    if (isSingleRoomMode) return; // locked
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
    if (
      !propertyId ||
      chosenRooms.length === 0 ||
      selectedStyleIds.length === 0
    )
      return;
    setGenerating(true);
    setError(null);
    const context = extraContext.trim() || undefined;
    const jobs = chosenRooms.flatMap((r) =>
      selectedStyleIds.map((style) => ({
        room_id: r.id,
        style,
        ...(context ? { extra_context: context } : {}),
      }))
    );
    const results = await Promise.all(
      jobs.map((body) => apiClient.POST("/generation", { body }))
    );
    const failed = results.find((r) => r.error);
    setGenerating(false);
    if (failed) {
      setError(failed.response?.status === 402 ? "balance" : "generic");
      return;
    }
    await queryClient.invalidateQueries({
      queryKey: ["get", "/generation/properties/{property_id}", propertyId],
    });
    onClose();
  };

  const handleClose = () => {
    if (!generating) onClose();
  };

  const lockedRoom = isSingleRoomMode
    ? uploadedRooms.find((r) => r.id === preselectedRoomId)
    : null;

  return (
    <dialog
      className="modal modal-open"
      onKeyDown={(e) => {
        if (e.key === "Escape") handleClose();
      }}
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
          <li className={`step ${step >= 1 ? "step-primary" : ""}`}>
            Choose styles
          </li>
          <li className={`step ${step >= 2 ? "step-primary" : ""}`}>Confirm</li>
        </ul>

        {/* Step 1: Style picker */}
        {step === 1 && (
          <>
            <div className="overflow-y-auto flex-1 min-h-0">
              <StylePicker
                selectedIds={selectedStyleIds}
                onChange={setSelectedStyleIds}
              />
            </div>
            <div className="modal-action shrink-0 mt-4">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleClose}
              >
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
              {/* Base image (continue from here) */}
              {baseImageUrl && (
                <div>
                  <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium mb-2">
                    Base image
                  </p>
                  <div className="flex gap-4 items-start">
                    <div className="w-32 rounded-box overflow-hidden border border-base-200 shadow-sm shrink-0">
                      <img
                        src={baseImageUrl}
                        alt="Base vision"
                        className="w-full aspect-square object-cover"
                      />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-xs text-base-content/60 mb-2">
                        New visions will continue from this design.
                      </p>
                      <input
                        type="text"
                        className="input input-sm input-bordered w-full"
                        placeholder="Add refinement notes (optional)…"
                        value={extraContext}
                        onChange={(e) => setExtraContext(e.target.value)}
                        disabled={generating}
                        maxLength={300}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Rooms */}
                <div className="bg-base-200 rounded-box p-4">
                  <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium mb-3">
                    Rooms
                  </p>
                  {isSingleRoomMode ? (
                    /* Single-room mode: locked display */
                    lockedRoom ? (
                      <div className="flex items-center gap-2">
                        <span className="badge badge-primary badge-sm">
                          {lockedRoom.label}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-base-content/40 italic">
                        Room not found
                      </p>
                    )
                  ) : uploadedRooms.length === 0 ? (
                    <p className="text-sm text-base-content/40 italic">
                      No rooms uploaded
                    </p>
                  ) : (
                    /* Global mode: selectable rooms */
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
                              <span
                                className={`text-sm ${on ? "" : "text-base-content/40 line-through"}`}
                              >
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
                      <li key={s} className="text-sm">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="alert">
                <Sparkles size={16} />
                <span className="text-sm">
                  This will create{" "}
                  <strong>
                    {totalGenerations} vision
                    {totalGenerations !== 1 ? "s" : ""}
                  </strong>{" "}
                  ({chosenRooms.length} room
                  {chosenRooms.length !== 1 ? "s" : ""} ×{" "}
                  {selectedStyleIds.length} style
                  {selectedStyleIds.length !== 1 ? "s" : ""})
                </span>
              </div>

              {error === "balance" && (
                <div className="alert alert-error">
                  <span>No balance left for generation.</span>
                  <Link
                    to="/profile"
                    className="btn btn-sm btn-outline"
                    onClick={onClose}
                  >
                    Profile
                  </Link>
                </div>
              )}
              {error === "generic" && (
                <div className="alert alert-error">
                  <span>Generation failed. Please try again.</span>
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
                    Generate {totalGenerations > 0 ? totalGenerations : ""}{" "}
                    {totalGenerations === 1 ? "Vision" : "Visions"}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
      <button type="button" className="modal-backdrop" onClick={handleClose} />
    </dialog>
  );
}
