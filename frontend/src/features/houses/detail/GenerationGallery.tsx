import { useGenerations } from "../../../lib/api/hooks";
import type { components } from "../../../lib/api/schema";

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
      {/* Image area */}
      <div className="relative aspect-video bg-base-200">
        {status === "pending" && (
          <div className="w-full h-full skeleton rounded-none" />
        )}
        {status === "completed" && (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex flex-col items-center justify-center gap-2 text-base-content/30">
            <span className="text-4xl">✦</span>
            <span className="text-xs">Ready</span>
          </div>
        )}
        {status === "failed" && (
          <div className="w-full h-full bg-error/10 flex items-center justify-center p-4">
            <span className="text-error text-xs text-center">
              {job.error_message}
            </span>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          {status === "pending" && (
            <span className="badge badge-sm badge-warning gap-1">
              <span className="loading loading-dots loading-xs" />
              Generating
            </span>
          )}
          {status === "completed" && (
            <span className="badge badge-sm badge-success">Done</span>
          )}
          {status === "failed" && (
            <span className="badge badge-sm badge-error">Failed</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2">
        <p className="text-sm font-medium truncate">{job.style}</p>
      </div>
    </div>
  );
}

interface GenerationGalleryProps {
  houseId: string;
}

export function GenerationGallery({ houseId }: GenerationGalleryProps) {
  const { data: jobs, isLoading, error } = useGenerations(houseId);

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
