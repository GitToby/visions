import { $api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type HouseDetail = components["schemas"]["HouseDetailResponse"];
type Job = components["schemas"]["GenerationJobResponse"];

interface GenerationGalleryProps {
  house: HouseDetail;
}

export function GenerationGallery({ house }: GenerationGalleryProps) {
  const { data: jobs, isLoading } = $api.useQuery(
    "get",
    "/generation/houses/{house_id}",
    {
      params: { path: { house_id: house.id } },
    }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner" />
      </div>
    );
  }

  if (!house.rooms.length) {
    return (
      <div className="py-12 text-center">
        <p className="text-base-content/50">No rooms uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {house.rooms.map((room) => {
        const roomJobs = jobs?.filter((j) => j.room_id === room.id) ?? [];
        return (
          <div key={room.id}>
            <h2 className="mb-4 text-xl font-semibold">{room.label}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <RoomTile url={room.original_image_url} label="Original" />
              {roomJobs.map((job) => (
                <GenerationTile key={job.id} job={job} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoomTile({ url, label }: { url: string; label: string }) {
  return (
    <div className="space-y-1">
      <div className="aspect-square overflow-hidden rounded-lg bg-base-200">
        <img src={url} alt={label} className="h-full w-full object-cover" />
      </div>
      <p className="text-center text-xs font-medium text-base-content/60">
        {label}
      </p>
    </div>
  );
}

function GenerationTile({ job }: { job: Job }) {
  return (
    <div className="space-y-1">
      <div className="aspect-square overflow-hidden rounded-lg bg-base-200">
        {job.status === "completed" && job.result_image_url ? (
          <img
            src={job.result_image_url}
            alt="Generated design"
            className="h-full w-full object-cover"
          />
        ) : job.status === "failed" ? (
          <div className="flex h-full items-center justify-center p-2">
            <p className="text-center text-xs text-error">Generation failed</p>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="loading loading-spinner loading-sm" />
          </div>
        )}
      </div>
      <p className="text-center text-xs capitalize text-base-content/40">
        {job.status}
      </p>
    </div>
  );
}
