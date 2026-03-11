import { Sparkles, SquarePlus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BeforeAfterDiff } from "@/components/BeforeAfterDiff";
import { Navbar } from "@/components/Navbar";
import { GenerateWizardModal } from "@/features/properties/detail/generations/GenerateWizardModal";
import { VisionCard } from "@/features/properties/detail/generations/VisionCard";
import { useProperty } from "@/lib/api/hooks";
import type { components } from "@/lib/api/schema";
import { deriveStatus } from "@/lib/generation";

type GenerationJobResponse = components["schemas"]["GenerationJobResponse"];

export function RoomViewPage() {
  const { propertyId = "", roomId = "" } = useParams<{
    propertyId: string;
    roomId: string;
  }>();
  const { data: property, isLoading } = useProperty(propertyId, {
    refetchInterval: (data) => {
      const r = data?.rooms?.find((r) => r.id === roomId);
      return r?.generation_jobs.some((j) => !j.completed_at && !j.error_message)
        ? 3000
        : false;
    },
  });

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [continueFromJob, setContinueFromJob] =
    useState<GenerationJobResponse | null>(null);

  const room = property?.rooms?.find((r) => r.id === roomId) ?? null;
  const roomJobs = room?.generation_jobs ?? [];
  const completedJobs = roomJobs.filter(
    (j) => deriveStatus(j) === "completed" && j.image_url
  );

  // Default selection: the explicitly selected job, or the first completed one
  const selectedJob =
    (selectedJobId ? roomJobs.find((j) => j.id === selectedJobId) : null) ??
    completedJobs[0] ??
    null;

  const openReimagineSingleRoom = () => {
    setContinueFromJob(null);
    setWizardOpen(true);
  };

  const openContinueFrom = (job: GenerationJobResponse) => {
    setContinueFromJob(job);
    setWizardOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-8">
          <div className="skeleton h-3 w-48 rounded" />
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="skeleton h-6 w-32 rounded" />
              <div className="skeleton h-8 w-32 rounded" />
            </div>
            <div className="skeleton aspect-video w-full rounded-box" />
          </section>
          <section>
            <div className="skeleton h-3 w-16 rounded mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card card-border overflow-hidden">
                  <div className="aspect-square skeleton rounded-none" />
                  <div className="px-2 py-1.5">
                    <div className="skeleton h-3 w-20 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (!property || !room) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
          <div className="alert alert-error">
            <span>Room not found.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-8">
        {/* Breadcrumb */}
        <div className="breadcrumbs text-sm">
          <ul>
            <li>
              <Link to="/properties">My Projects</Link>
            </li>
            <li>
              <Link to={`/properties/${propertyId}`}>{property.name}</Link>
            </li>
            <li>{room.label}</li>
          </ul>
        </div>

        {/* Diff Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{room.label}</h2>
            <button
              type="button"
              className="btn btn-primary btn-sm gap-1"
              onClick={openReimagineSingleRoom}
              disabled={!room.image_url}
            >
              <Sparkles size={13} />
              Reimagine Room
            </button>
          </div>

          {room.image_url ? (
            selectedJob?.image_url ? (
              <BeforeAfterDiff
                beforeSrc={room.image_url}
                afterSrc={selectedJob.image_url}
                afterLabel={selectedJob.style}
              />
            ) : (
              <>
                <figure className="aspect-video rounded-box shadow-md border border-base-200 overflow-hidden">
                  <img
                    src={room.image_url}
                    alt="Original"
                    className="w-full h-full object-cover"
                  />
                </figure>
                <div className="flex items-center justify-between mt-2 px-1">
                  <span className="badge badge-ghost badge-sm">Original</span>
                  <span className="text-xs text-base-content/40">
                    {roomJobs.length > 0
                      ? "Select a vision below"
                      : "No visions yet"}
                  </span>
                </div>
              </>
            )
          ) : (
            <div className="aspect-video bg-base-200 rounded-box flex items-center justify-center text-base-content/30 border border-base-200">
              <span className="text-sm">No room image uploaded</span>
            </div>
          )}

          {/* Continue from here action */}
          {selectedJob && (
            <div className="flex items-center justify-end mt-1">
              <button
                type="button"
                className="btn btn-sm btn-ghost gap-1 text-base-content/60"
                onClick={() => openContinueFrom(selectedJob)}
              >
                <Sparkles size={13} />
                Continue from here
              </button>
            </div>
          )}
        </section>

        {/* Gallery Section */}
        <section>
          <p className="text-xs text-base-content/40 uppercase tracking-wide font-medium mb-4">
            Visions
          </p>

          {roomJobs.length === 0 ? (
            /* Empty state */
            <button
              type="button"
              className="card card-border bg-base-100 border-dashed w-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
              onClick={openReimagineSingleRoom}
              disabled={!room.image_url}
            >
              <div className="card-body items-center py-12 gap-3 text-base-content/30">
                <SquarePlus size={48} strokeWidth={1} />
                <p className="text-base font-medium">Reimagine Room</p>
                <p className="text-xs">Generate AI visions for this room</p>
              </div>
            </button>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {roomJobs.map((job) => (
                <VisionCard
                  key={job.id}
                  job={job}
                  isSelected={selectedJob?.id === job.id}
                  onSelect={() => setSelectedJobId(job.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {wizardOpen && (
        <GenerateWizardModal
          propertyId={propertyId}
          rooms={property.rooms ?? []}
          preselectedRoomId={roomId}
          baseImageUrl={continueFromJob?.image_url ?? undefined}
          preselectedStyleId={continueFromJob?.style ?? undefined}
          onClose={() => {
            setWizardOpen(false);
            setContinueFromJob(null);
          }}
        />
      )}
    </div>
  );
}
