import { ExternalLink, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient, useGenerations } from "../../../lib/api/hooks";
import type { components } from "../../../lib/api/schema";

type RoomResponse = components["schemas"]["RoomResponse"];
type GenerationJobResponse = components["schemas"]["GenerationJobResponse"];

type DerivedStatus = "pending" | "completed" | "failed";

function deriveStatus(job: GenerationJobResponse): DerivedStatus {
  if (job.error_message) return "failed";
  if (job.completed_at) return "completed";
  return "pending";
}

interface RoomImagesModalProps {
  room: RoomResponse | null;
  propertyId: string;
  onClose: () => void;
}

export function RoomImagesModal({ room, propertyId, onClose }: RoomImagesModalProps) {
  const { data: jobs } = useGenerations(propertyId);
  const queryClient = useQueryClient();
  const [refiningStyle, setRefiningStyle] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!room) return null;

  const roomJobs = (jobs ?? []).filter((j) => j.room_id === room.id);

  const byStyle = new Map<string, GenerationJobResponse[]>();
  for (const job of roomJobs) {
    const group = byStyle.get(job.style) ?? [];
    group.push(job);
    byStyle.set(job.style, group);
  }

  const openRefine = (style: string) => {
    setRefiningStyle(style);
    setRefinePrompt("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const closeRefine = () => {
    setRefiningStyle(null);
    setRefinePrompt("");
  };

  const handleRefine = async (style: string) => {
    const prompt = refinePrompt.trim();
    if (!prompt || submitting) return;
    setSubmitting(true);
    await apiClient.POST("/generation", {
      body: { room_id: room.id, style, extra_context: prompt },
    });
    await queryClient.invalidateQueries({
      queryKey: ["get", "/generation/houses/{property_id}", propertyId],
    });
    setSubmitting(false);
    closeRefine();
  };

  return (
    <dialog
      className="modal modal-open"
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div className="modal-box max-w-4xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">{room.label}</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Original photo */}
        {room.image_url && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium">
                Original photo
              </p>
              <a
                href={room.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-xs btn-square btn-ghost"
                title="Open in new window"
              >
                <ExternalLink size={13} />
              </a>
            </div>
            <div className="aspect-square rounded-box overflow-hidden">
              <img
                src={room.image_url}
                alt={room.label}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Generated designs */}
        <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium mb-3">
          Generated designs
        </p>
        {roomJobs.length === 0 ? (
          <p className="text-sm text-base-content/40 italic">
            No designs yet. Use the Generate button to create designs for this room.
          </p>
        ) : (
          <div className="space-y-6">
            {[...byStyle.entries()].map(([style, styleJobs]) => (
              <div key={style}>
                {/* Style heading + refine trigger */}
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{style}</h4>
                  <button
                    type="button"
                    className="btn btn-xs btn-square btn-ghost"
                    title="Generate a variation"
                    onClick={() => refiningStyle === style ? closeRefine() : openRefine(style)}
                  >
                    <Plus size={13} />
                  </button>
                </div>

                {/* Refine input */}
                {refiningStyle === style && (
                  <div className="flex gap-2 mb-3">
                    <input
                      ref={inputRef}
                      type="text"
                      className="input input-sm input-bordered flex-1"
                      placeholder="e.g. more ambient lighting, change the table…"
                      value={refinePrompt}
                      onChange={(e) => setRefinePrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleRefine(style);
                        if (e.key === "Escape") closeRefine();
                      }}
                      disabled={submitting}
                      maxLength={300}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => void handleRefine(style)}
                      disabled={!refinePrompt.trim() || submitting}
                    >
                      {submitting ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        "Generate"
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost btn-square"
                      onClick={closeRefine}
                      disabled={submitting}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {styleJobs.map((job) => {
                    const status = deriveStatus(job);
                    return (
                      <div key={job.id} className="card card-border bg-base-100 overflow-hidden">
                        <div className="relative aspect-square bg-base-200">
                          {status === "pending" && (
                            <div className="w-full h-full skeleton rounded-none" />
                          )}
                          {status === "completed" && (
                            <div className="w-full h-full bg-linear-to-br from-primary/10 to-secondary/10 flex flex-col items-center justify-center gap-2 text-base-content/30">
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
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
