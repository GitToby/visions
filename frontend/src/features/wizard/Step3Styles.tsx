import { useState } from "react";
import { StylePicker } from "@/features/styles/StylePicker";
import { $api } from "@/lib/api/client";

interface Step3StylesProps {
  houseId: string;
  selectedStyleIds: string[];
  onStylesChange: (ids: string[]) => void;
  onBack: () => void;
  onComplete: (houseId: string) => void;
}

export function Step3Styles({
  houseId,
  selectedStyleIds,
  onStylesChange,
  onBack,
  onComplete,
}: Step3StylesProps) {
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
      // biome-ignore lint/suspicious/noExplicitAny: stale API schema, HouseResponse missing rooms until regenerated
      const houseAny = house as any;
      const roomIds = houseAny.rooms?.map((r: { id: string }) => r.id) ?? [];
      await triggerGeneration({
        body: {
          house_id: houseId,
          room_ids: roomIds,
          style_ids: selectedStyleIds,
        },
      });
      onComplete(houseId);
    } catch {
      setError("Failed to start generation. Please try again.");
      setIsGenerating(false);
    }
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold">Choose your styles</h2>
      <p className="mb-6 text-base-content/60">
        Select one or more design aesthetics to apply to your rooms.
      </p>

      <StylePicker selected={selectedStyleIds} onChange={onStylesChange} />

      {error && (
        <div className="alert alert-error mt-4">
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 flex justify-between">
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
