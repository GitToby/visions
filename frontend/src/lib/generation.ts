import type { components } from "@/lib/api/schema";

type GenerationJobResponse = components["schemas"]["GenerationJobResponse"];

export type DerivedStatus = "pending" | "completed" | "failed";

export function deriveStatus(job: GenerationJobResponse): DerivedStatus {
  if (job.error_message) return "failed";
  if (job.completed_at) return "completed";
  return "pending";
}
