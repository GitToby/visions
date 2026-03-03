import { Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { apiClient } from "@/lib/api/client";

type UploadStatus = "pending" | "uploading" | "done" | "error";

interface PendingFile {
  file: File;
  preview: string;
  label: string;
  status: UploadStatus;
}

interface Step2RoomsProps {
  houseId: string;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Rooms({ houseId, onNext, onBack }: Step2RoomsProps) {
  const [files, setFiles] = useState<PendingFile[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        label: "Room",
        status: "pending" as const,
      })),
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
  });

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLabel(index: number, label: string) {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, label } : f)));
  }

  async function handleContinue() {
    const pending = files.filter((f) => f.status === "pending");

    if (pending.length === 0) {
      const doneCount = files.filter((f) => f.status === "done").length;
      if (doneCount > 0) onNext();
      return;
    }

    let successCount = files.filter((f) => f.status === "done").length;

    for (const item of pending) {
      const idx = files.indexOf(item);
      setFiles((prev) =>
        prev.map((f, i) => (i === idx ? { ...f, status: "uploading" } : f))
      );

      try {
        await apiClient.POST("/houses/{house_id}/rooms", {
          params: { path: { house_id: houseId } },
          body: { image: item.file as unknown as string, label: item.label },
          bodySerializer(body) {
            const fd = new FormData();
            fd.append("image", body.image);
            fd.append("label", body.label ?? "Room");
            return fd;
          },
        });
        setFiles((prev) =>
          prev.map((f, i) => (i === idx ? { ...f, status: "done" } : f))
        );
        successCount++;
      } catch {
        setFiles((prev) =>
          prev.map((f, i) => (i === idx ? { ...f, status: "error" } : f))
        );
      }
    }

    if (successCount > 0) onNext();
  }

  const hasPending = files.some((f) => f.status === "pending");
  const hasDone = files.some((f) => f.status === "done");
  const isUploading = files.some((f) => f.status === "uploading");

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold">Upload your rooms</h2>
      <p className="mb-6 text-base-content/60">
        Drag and drop photos of each room you want to redesign. Add at least one
        room.
      </p>

      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-base-300 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-3 h-8 w-8 text-base-content/40" />
        <p className="font-medium">
          {isDragActive
            ? "Drop photos here"
            : "Drag photos here or click to browse"}
        </p>
        <p className="mt-1 text-sm text-base-content/40">
          PNG, JPG, WEBP accepted
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((item, idx) => (
            <div
              key={`${item.file.name}-${idx}`}
              className="flex items-center gap-3 rounded-xl bg-base-200 p-3"
            >
              <img
                src={item.preview}
                alt={item.label}
                className="h-12 w-12 rounded-lg object-cover"
              />
              <input
                type="text"
                className="input input-sm flex-1"
                value={item.label}
                onChange={(e) => updateLabel(idx, e.target.value)}
                placeholder="Room label"
                disabled={item.status !== "pending"}
              />
              <div className="w-20 text-center text-sm">
                {item.status === "pending" && (
                  <span className="text-base-content/40">Pending</span>
                )}
                {item.status === "uploading" && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                {item.status === "done" && (
                  <span className="font-medium text-success">Done</span>
                )}
                {item.status === "error" && (
                  <span className="font-medium text-error">Error</span>
                )}
              </div>
              {item.status === "pending" && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={() => removeFile(idx)}
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleContinue}
          disabled={(!hasPending && !hasDone) || isUploading}
        >
          {isUploading ? (
            <span className="loading loading-spinner" />
          ) : hasPending ? (
            "Upload & Continue"
          ) : (
            "Continue"
          )}
        </button>
      </div>
    </div>
  );
}
