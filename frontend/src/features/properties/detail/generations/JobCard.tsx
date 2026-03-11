import { ImageTile } from "@/components/ImageTile";
import type { components } from "@/lib/api/schema";
import { deriveStatus } from "@/lib/generation";

type GenerationJobResponse = components["schemas"]["GenerationJobResponse"];

interface JobCardProps {
  job: GenerationJobResponse;
}

export function JobCard({ job }: JobCardProps) {
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
      <div className="card-body card-sm py-2">
        <p className="text-sm font-medium truncate">{job.style}</p>
      </div>
    </div>
  );
}
