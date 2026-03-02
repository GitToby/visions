import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StylePicker } from "@/features/styles/StylePicker";
import { $api } from "@/lib/api/client";

interface Step3StylesProps {
  houseId: string;
  selectedStyleIds: string[];
  onStylesChange: (ids: string[]) => void;
  onBack: () => void;
}

export function Step3Styles({
  houseId,
  selectedStyleIds,
  onStylesChange,
  onBack,
}: Step3StylesProps) {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: house } = $api.useQuery("get", "/houses/{house_id}", {
    params: { path: { house_id: houseId } },
  });

  const { mutateAsync: triggerGeneration } = $api.useMutation(
    "post",
    "/generation"
  );

  async function handleGenerate() {
    if (!house || selectedStyleIds.length === 0) return;

    setIsGenerating(true);
    setError(null);

    try {
      const roomIds = house.rooms.map((r) => r.id);
      await triggerGeneration({
        body: {
          house_id: houseId,
          room_ids: roomIds,
          style_ids: selectedStyleIds,
        },
      });
      navigate(`/houses/${houseId}`);
    } catch {
      setError("Failed to start generation. Please try again.");
      setIsGenerating(false);
    }
  }

  return (
    <div>
      <h2 className="card-title mb-2 text-2xl">Choose your styles</h2>
      <p className="mb-6 text-base-content/60">
        Select one or more design aesthetics to apply to your rooms.
      </p>

      <StylePicker selected={selectedStyleIds} onChange={onStylesChange} />

      {error && (
        <div className="alert alert-error mt-4">
          <span>{error}</span>
        </div>
      )}

      <div className="card-actions mt-6 justify-between">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={selectedStyleIds.length === 0 || isGenerating}
        >
          {isGenerating ? (
            <span className="loading loading-spinner" />
          ) : (
            "Generate Designs"
          )}
        </button>
      </div>
    </div>
  );
}
