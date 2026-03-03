import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import type { components } from "../../../lib/api/schema";
import { apiClient } from "../../../lib/api/hooks";

type RoomResponse = components["schemas"]["RoomResponse"];

interface RoomUploaderProps {
  houseId: string;
  onRoomAdded: (room: RoomResponse) => void;
}

interface PendingFile {
  file: File;
  label: string;
  uploading: boolean;
  error: string | null;
}

export function RoomUploader({ houseId, onRoomAdded }: RoomUploaderProps) {
  const [pending, setPending] = useState<PendingFile[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles = accepted.map((file) => ({
      file,
      label: file.name.replace(/\.[^/.]+$/, ""),
      uploading: false,
      error: null,
    }));
    setPending((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
  });

  const updateLabel = (index: number, label: string) => {
    setPending((prev) =>
      prev.map((p, i) => (i === index ? { ...p, label } : p)),
    );
  };

  const upload = async (index: number) => {
    const item = pending[index];
    if (!item || item.uploading) return;

    setPending((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, uploading: true, error: null } : p,
      ),
    );

    const formData = new FormData();
    formData.append("image", item.file);
    formData.append("label", item.label || "Room");

    const { data, error } = await apiClient.POST(
      "/houses/{house_id}/rooms",
      {
        params: { path: { house_id: houseId } },
        body: { image: item.file as unknown as string, label: item.label || "Room" },
        bodySerializer: () => formData,
      },
    );

    if (error || !data) {
      setPending((prev) =>
        prev.map((p, i) =>
          i === index
            ? { ...p, uploading: false, error: "Upload failed. Try again." }
            : p,
        ),
      );
      return;
    }

    setPending((prev) => prev.filter((_, i) => i !== index));
    onRoomAdded(data);
  };

  const remove = (index: number) => {
    setPending((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-box p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-base-300 hover:border-base-content/30"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-base-content/60 text-sm">
          {isDragActive
            ? "Drop photos here…"
            : "Drag & drop room photos here, or click to select"}
        </p>
        <p className="text-xs text-base-content/40 mt-1">
          JPG, PNG, WebP supported
        </p>
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((item, index) => (
            <div
              key={item.file.name}
              className="flex items-center gap-3 bg-base-200 rounded-box px-4 py-3"
            >
              <input
                type="text"
                className="input input-sm flex-1"
                value={item.label}
                onChange={(e) => updateLabel(index, e.target.value)}
                placeholder="Room label"
                disabled={item.uploading}
              />
              {item.error && (
                <span className="text-xs text-error">{item.error}</span>
              )}
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => upload(index)}
                disabled={item.uploading}
              >
                {item.uploading ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  "Upload"
                )}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost btn-square"
                onClick={() => remove(index)}
                disabled={item.uploading}
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
