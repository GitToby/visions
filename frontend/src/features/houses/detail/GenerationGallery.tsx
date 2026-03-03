import { useGenerations, useStyles } from "../../../lib/api/hooks";
import type { components } from "../../../lib/api/schema";

type JobStatus = components["schemas"]["JobStatus"];
type GenerationJobResponse = components["schemas"]["GenerationJobResponse"];

interface GenerationGalleryProps {
  houseId: string;
}

const STATUS_BADGE: Record<JobStatus, string> = {
  pending: "badge-warning",
  processing: "badge-info",
  completed: "badge-success",
  failed: "badge-error",
};

function JobCard({
  job,
  styleName,
}: {
  job: GenerationJobResponse;
  styleName: string;
}) {
  return (
    <div className="card bg-base-100 card-border card-sm">
      <div className="card-body">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">{styleName}</h4>
          <span className={`badge badge-sm ${STATUS_BADGE[job.status]}`}>
            {job.status}
          </span>
        </div>
        {job.status === "completed" && job.result_image_key && (
          <p className="text-xs text-base-content/50 font-mono truncate">
            {job.result_image_key}
          </p>
        )}
        {job.status === "failed" && job.error_message && (
          <p className="text-xs text-error">{job.error_message}</p>
        )}
        {(job.status === "pending" || job.status === "processing") && (
          <div className="flex items-center gap-2 text-xs text-base-content/50">
            <span className="loading loading-spinner loading-xs" />
            Generating…
          </div>
        )}
      </div>
    </div>
  );
}

export function GenerationGallery({ houseId }: GenerationGalleryProps) {
  const { data: jobs, isLoading, error } = useGenerations(houseId);
  const { data: styles } = useStyles();

  const hasActive = jobs?.some(
    (j) => j.status === "pending" || j.status === "processing",
  );

  // Re-render with polling when jobs are active — achieved by re-querying
  // The parent can pass a key to force re-mount, or we can use a separate
  // polling hook. For simplicity we rely on manual invalidation from the
  // generate button and let the gallery show static results otherwise.
  void hasActive;

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

  const styleMap = new Map(styles?.map((s) => [s.id, s.name]) ?? []);

  const byStyle = new Map<string, GenerationJobResponse[]>();
  for (const job of jobs) {
    const group = byStyle.get(job.style_id) ?? [];
    group.push(job);
    byStyle.set(job.style_id, group);
  }

  return (
    <div className="space-y-6">
      {[...byStyle.entries()].map(([styleId, styleJobs]) => (
        <div key={styleId}>
          <h3 className="font-semibold mb-3">
            {styleMap.get(styleId) ?? styleId}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {styleJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                styleName={styleMap.get(job.style_id) ?? job.style_id}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
