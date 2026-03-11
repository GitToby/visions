import { ImageTile } from "@/components/ImageTile";
import { useGenerations } from "@/lib/api/hooks";
import type { components } from "@/lib/api/schema";

type GenerationJobResponse = components["schemas"]["GenerationJobResponse"];

type DerivedStatus = "pending" | "completed" | "failed";

function deriveStatus(job: GenerationJobResponse): DerivedStatus {
  if (job.error_message) return "failed";
  if (job.completed_at) return "completed";
  return "pending";
}

function JobCard({ job }: { job: GenerationJobResponse }) {
  const status = deriveStatus(job);

  return (
    <div className="card bg-base-100 card-border overflow-hidden">
      <ImageTile
        src={status === "completed" ? job.image_url : null}
        alt={job.style}
        aspect="video"
        skeleton={status === "pending"}
        error={job.error_message ?? null}
        fallback={
          <div className="absolute inset-0 bg-linear-to-br from-primary/10 to-secondary/10 flex flex-col items-center justify-center gap-2 text-base-content/30">
            <span className="text-4xl">✦</span>
            <span className="text-xs">Ready</span>
          </div>
        }
        badges={[
          status === "pending"
            ? {
                content: (
                  <>
                    <span className="loading loading-dots loading-xs" />
                    Generating
                  </>
                ),
                variant: "warning",
              }
            : status === "completed"
              ? { content: "Done", variant: "success" }
              : { content: "Failed", variant: "error" },
        ]}
      />

      {/* Footer */}
      <div className="card-body card-sm py-2">
        <p className="text-sm font-medium truncate">{job.style}</p>
      </div>
    </div>
  );
}

interface GenerationGalleryProps {
  propertyId: string;
}

export function GenerationGallery({ propertyId }: GenerationGalleryProps) {
  const { data: jobs, isLoading, error } = useGenerations(propertyId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>Failed to load generation results.</span>
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <p className="text-sm text-base-content/50">
        No generations yet. Upload rooms, pick styles, and hit Generate.
      </p>
    );
  }

  const byStyle = new Map<string, GenerationJobResponse[]>();
  for (const job of jobs) {
    const group = byStyle.get(job.style) ?? [];
    group.push(job);
    byStyle.set(job.style, group);
  }

  return (
    <div className="space-y-8">
      {[...byStyle.entries()].map(([style, styleJobs]) => (
        <div key={style}>
          <h3 className="font-semibold mb-3">{style}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {styleJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
