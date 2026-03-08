import { ArrowRight, ExternalLink, Sparkles, X } from "lucide-react";
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

function ImageWithExternalLink({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className="relative group">
      <img src={src} alt={alt} className={className ?? "w-full h-full object-cover"} />
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-2 right-2 btn btn-xs btn-square btn-ghost bg-base-100/70 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Open in new tab"
      >
        <ExternalLink size={12} />
      </a>
    </div>
  );
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
      queryKey: ["get", "/generation/property/{property_id}", propertyId],
    });
    setSubmitting(false);
    closeRefine();
  };

  return (
    <dialog
      className="modal modal-open"
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div className="modal-box max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-base-100 flex items-center justify-between px-6 py-4 border-b border-base-200">
          <h3 className="text-base font-semibold">{room.label}</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Original photo — compact */}
          {room.image_url && (
            <div>
              <p className="text-xs text-base-content/40 uppercase tracking-wide font-medium mb-2">
                Original
              </p>
              <div className="w-72 rounded-xl overflow-hidden border border-base-200 shadow-sm">
                <ImageWithExternalLink
                  src={room.image_url}
                  alt={room.label}
                  className="w-full aspect-square object-cover"
                />
              </div>
            </div>
          )}

          {/* Generated designs */}
          <div>
            <p className="text-xs text-base-content/40 uppercase tracking-wide font-medium mb-4">
              Generated designs
            </p>

            {roomJobs.length === 0 ? (
              <p className="text-sm text-base-content/40 italic">
                No designs yet. Use the Generate button to create designs for this room.
              </p>
            ) : (
              <div className="space-y-8">
                {[...byStyle.entries()].map(([style, styleJobs]) => (
                  <div key={style}>
                    {/* Style row header */}
                    <div className="flex items-center gap-3 mb-3">
                      {/* Flow breadcrumb */}
                      <div className="flex items-center gap-1.5 text-xs text-base-content/40 font-medium">
                        <span className="text-base-content/60">Room</span>
                        <ArrowRight size={12} />
                        <span className="text-primary font-semibold">{style}</span>
                        <ArrowRight size={12} />
                        <span className="text-base-content/60">Generated</span>
                      </div>
                      <div className="flex-1 h-px bg-base-200" />
                    </div>

                    {/* Generated image grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                      {styleJobs.map((job) => {
                        const status = deriveStatus(job);
                        return (
                          <div
                            key={job.id}
                            className="rounded-xl overflow-hidden border border-base-200 shadow-sm"
                          >
                            <div className="relative aspect-square bg-base-200">
                              {status === "pending" && (
                                <div className="w-full h-full skeleton rounded-none" />
                              )}
                              {status === "completed" && job.image_url && (
                                <ImageWithExternalLink
                                  src={job.image_url}
                                  alt={`${style} generation`}
                                  className="w-full h-full object-cover"
                                />
                              )}
                              {status === "completed" && !job.image_url && (
                                <div className="w-full h-full bg-linear-to-br from-primary/10 to-secondary/10 flex flex-col items-center justify-center gap-2 text-base-content/30">
                                  <span className="text-3xl">✦</span>
                                  <span className="text-xs">Ready</span>
                                </div>
                              )}
                              {status === "failed" && (
                                <div className="w-full h-full bg-error/10 flex items-center justify-center p-3">
                                  <span className="text-error text-xs text-center">
                                    {job.error_message}
                                  </span>
                                </div>
                              )}

                              {/* Status badge */}
                              <div className="absolute top-2 right-2">
                                {status === "pending" && (
                                  <span className="badge badge-xs badge-warning gap-1">
                                    <span className="loading loading-dots loading-xs" />
                                    Generating
                                  </span>
                                )}
                                {status === "failed" && (
                                  <span className="badge badge-xs badge-error">Failed</span>
                                )}
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>

                    {/* Continue from here */}
                    {refiningStyle === style ? (
                      <div className="flex gap-2 items-center">
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
                            <>
                              <Sparkles size={13} />
                              Generate
                            </>
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
                    ) : (
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost text-base-content/50 gap-1 pl-0"
                        onClick={() => openRefine(style)}
                      >
                        <Sparkles size={12} />
                        Continue from here
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
