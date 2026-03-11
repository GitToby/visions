import { useGenerations } from "@/lib/api/hooks";
import type { components } from "@/lib/api/schema";
import { JobCard } from "./JobCard";

type GenerationJobResponse = components["schemas"]["GenerationJobResponse"];

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
