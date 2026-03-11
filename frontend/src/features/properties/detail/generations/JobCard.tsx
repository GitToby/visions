import { ImageCard } from "@/components/ImageCard";
import type { components } from "@/lib/api/schema";
import { deriveStatus } from "@/lib/generation";

type GenerationJobResponse = components["schemas"]["GenerationJobResponse"];

interface JobCardProps {
  job: GenerationJobResponse;
}

export function JobCard({ job }: JobCardProps) {
  const status = deriveStatus(job);

  return (
    <ImageCard
      image={{
        src: status === "completed" ? job.image_url : null,
        alt: job.style,
        aspect: "video",
        skeleton: status === "pending",
        error: job.error_message ?? null,
        fallback: (
          <div className="absolute inset-0 bg-linear-to-br from-primary/10 to-secondary/10 flex flex-col items-center justify-center gap-2 text-base-content/30">
            <span className="text-4xl">✦</span>
            <span className="text-xs">Ready</span>
          </div>
        ),
        topRight:
          status === "pending" ? (
            <span className="badge badge-sm badge-warning shadow gap-1">
              <span className="loading loading-dots loading-xs" />
              Generating
            </span>
          ) : status === "completed" ? (
            <span className="badge badge-sm badge-success shadow">Done</span>
          ) : (
            <span className="badge badge-sm badge-error shadow">Failed</span>
          ),
      }}
      title={job.style}
    />
  );
}
