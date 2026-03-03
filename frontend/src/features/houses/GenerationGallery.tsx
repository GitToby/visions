import { $api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

// The actual API returns presigned URLs; schema keys reflect storage keys.
// These local types reflect the actual runtime shape until schema is regenerated.
type Room = {
  id: string;
  label: string;
  original_image_url: string;
};

type HouseWithRooms = components["schemas"]["HouseResponse"] & {
  rooms: Room[];
};

type Job = components["schemas"]["GenerationJobResponse"] & {
  result_image_url?: string | null;
};

interface GenerationGalleryProps {
  house: HouseWithRooms;
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
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!house.rooms.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-base-content/50">No rooms uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {house.rooms.map((room) => {
        const roomJobs =
          (jobs as Job[] | undefined)?.filter((j) => j.room_id === room.id) ??
          [];
        return (
          <section key={room.id}>
            <h2 className="mb-4 text-lg font-semibold">{room.label}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <RoomTile url={room.original_image_url} label="Original" />
              {roomJobs.map((job) => (
                <GenerationTile key={job.id} job={job} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function RoomTile({ url, label }: { url: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="aspect-square overflow-hidden rounded-xl bg-base-200 ring-2 ring-primary/20">
        <img src={url} alt={label} className="h-full w-full object-cover" />
      </div>
      <p className="text-center text-xs font-semibold text-primary">{label}</p>
    </div>
  );
}

function GenerationTile({ job }: { job: Job }) {
  return (
    <div className="space-y-1.5">
      <div className="aspect-square overflow-hidden rounded-xl bg-base-200">
        {job.status === "completed" && job.result_image_url ? (
          <img
            src={job.result_image_url}
            alt="Generated design"
            className="h-full w-full object-cover"
          />
        ) : job.status === "failed" ? (
          <div className="flex h-full items-center justify-center p-3">
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
