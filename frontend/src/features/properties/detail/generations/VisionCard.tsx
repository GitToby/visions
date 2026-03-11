import { ImageCard } from "@/components/ImageCard";
import type { components } from "@/lib/api/schema";
import { deriveStatus } from "@/lib/generation";

type GenerationJobResponse = components["schemas"]["GenerationJobResponse"];

export interface VisionCardProps {
  job: GenerationJobResponse;
  isSelected: boolean;
  onSelect: () => void;
}

export function VisionCard({ job, isSelected, onSelect }: VisionCardProps) {
  const status = deriveStatus(job);
  const isSelectable = status === "completed";

  return (
    <ImageCard
      onClick={isSelectable ? onSelect : undefined}
      className={`transition-all text-left ${
        isSelectable ? "cursor-pointer" : "cursor-default"
      } ${
        isSelected
          ? "ring-2 ring-primary shadow-md border-transparent"
          : "hover:shadow-md hover:border-primary/40"
      }`}
      image={{
        src: status === "completed" ? job.image_url : null,
        externalLink: job.image_url !== null,
        alt: job.style,
        aspect: "square",
        skeleton: status === "pending",
        error: status === "failed" ? (job.error_message ?? "Failed") : null,
        topRight: isSelected ? (
          <span className="badge badge-xs badge-primary">Viewing</span>
        ) : status === "pending" ? (
          <span className="badge badge-xs badge-warning gap-1">
            <span className="loading loading-dots loading-xs" />
          </span>
        ) : status === "failed" ? (
          <span className="badge badge-xs badge-error">Failed</span>
        ) : undefined,
      }}
      title={job.style}
    />
  );
}
