import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { GenerationGallery } from "../features/houses/detail/GenerationGallery";
import { RoomUploader } from "../features/houses/detail/RoomUploader";
import { StylePicker } from "../features/styles/StylePicker";
import { apiClient, useHouse } from "../lib/api/hooks";
import type { components } from "../lib/api/schema";

type RoomResponse = components["schemas"]["RoomResponse"];

export function HouseDetailPage() {
  const { houseId } = useParams<{ houseId: string }>();
  const { data: house, isLoading, error } = useHouse(houseId ?? "");
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleRoomAdded = (room: RoomResponse) => {
    setRooms((prev) => [...prev.filter((r) => r.label !== room.label), room]);
  };

  const handleGenerate = async () => {
    if (!houseId || rooms.length === 0 || selectedStyleIds.length === 0) return;
    setGenerating(true);
    setGenerateError(null);
    const { error: apiError } = await apiClient.POST("/generation", {
      body: {
        house_id: houseId,
        room_ids: rooms.map((r) => r.id),
        style_ids: selectedStyleIds,
      },
    });
    setGenerating(false);
    if (apiError) {
      setGenerateError("Generation failed. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({
      queryKey: ["get", "/generation/houses/{house_id}", houseId],
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </div>
    );
  }

  if (error || !house) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
          <div className="alert alert-error">
            <span>Failed to load project.</span>
          </div>
        </div>
      </div>
    );
  }

  const canGenerate = rooms.length > 0 && selectedStyleIds.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-10">
        {/* Header */}
        <div>
          <Link
            to="/houses"
            className="text-sm text-base-content/50 hover:text-base-content mb-2 inline-block"
          >
            ← My Projects
          </Link>
          <h1 className="text-2xl font-bold">{house.name}</h1>
        </div>

        {/* Rooms */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Rooms</h2>
          <RoomUploader houseId={house.id} onRoomAdded={handleRoomAdded} />
        </section>

        {/* Styles */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Design Styles</h2>
          <StylePicker
            selectedIds={selectedStyleIds}
            onChange={setSelectedStyleIds}
          />
        </section>

        {/* Generate */}
        <section>
          {generateError && (
            <div className="alert alert-error mb-3">
              <span>{generateError}</span>
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
          >
            {generating ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Generating…
              </>
            ) : (
              "Generate designs"
            )}
          </button>
          {!canGenerate && (
            <p className="text-sm text-base-content/50 mt-2">
              Upload at least one room and select at least one style to
              generate.
            </p>
          )}
        </section>

        {/* Gallery */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Generated designs</h2>
          <GenerationGallery houseId={house.id} />
        </section>
      </main>
    </div>
  );
}
