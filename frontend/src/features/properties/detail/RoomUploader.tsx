import {
    AlertTriangle,
    Bath,
    Bed,
    CheckCircle,
    ChefHat,
    Home,
    Images,
    type LucideIcon,
    Monitor,
    Plus,
    Sofa,
    Trash2,
    Upload,
    UtensilsCrossed,
    Wrench,
    X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient, useGenerations } from "../../../lib/api/hooks";
import type { components } from "../../../lib/api/schema";

type RoomResponse = components["schemas"]["RoomResponse"];

interface RoomUploaderProps {
    propertyId: string;
    onRoomAdded: (room: RoomResponse) => void;
    onRoomClick?: (room: RoomResponse) => void;
    initialRooms?: RoomResponse[];
}

const DEFAULT_ROOM_TYPES: Array<{ label: string; Icon: LucideIcon }> = [
    { label: "Bathroom", Icon: Bath },
    { label: "Bedroom", Icon: Bed },
    { label: "Dining Room", Icon: UtensilsCrossed },
    { label: "Kitchen", Icon: ChefHat },
    { label: "Living Room", Icon: Sofa },
    { label: "Office", Icon: Monitor },
    { label: "Utility Room", Icon: Wrench },
];

const DEFAULT_LABELS = new Set(DEFAULT_ROOM_TYPES.map((r) => r.label));

type SlotState =
    | { status: "empty" }
    | { status: "no-image"; room: RoomResponse }
    | { status: "uploading"; preview: string }
    | { status: "uploaded"; room: RoomResponse; preview: string }
    | { status: "error"; preview: string; message: string };

interface RoomSlotProps {
    label: string;
    Icon: LucideIcon;
    propertyId: string;
    state: SlotState;
    onStateChange: (state: SlotState) => void;
    onRoomAdded: (room: RoomResponse) => void;
    onRoomClick?: (room: RoomResponse) => void;
    onRemove?: () => void;
    onDelete?: (label: string) => void;
    completedCount?: number;
    pendingCount?: number;
}

function RoomSlot({
    label,
    Icon,
    propertyId,
    state,
    onStateChange,
    onRoomAdded,
    onRoomClick,
    onRemove,
    onDelete,
    completedCount = 0,
    pendingCount = 0,
}: RoomSlotProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = useCallback(
        async (e: React.MouseEvent) => {
            e.stopPropagation();
            const roomId =
                state.status === "uploaded" || state.status === "no-image"
                    ? state.room.id
                    : null;
            if (!roomId) return;
            setIsDeleting(true);
            await apiClient.DELETE(
                "/properties/{property_id}/rooms/{room_id}",
                {
                    params: {
                        path: { property_id: propertyId, room_id: roomId },
                    },
                },
            );
            setIsDeleting(false);
            onStateChange({ status: "empty" });
            onDelete?.(label);
        },
        [state, propertyId, label, onStateChange, onDelete],
    );

    const handleFile = useCallback(
        async (file: File) => {
            const preview = URL.createObjectURL(file);
            onStateChange({ status: "uploading", preview });

            const formData = new FormData();
            formData.append("image", file);
            formData.append("label", label);

            const existingRoomId =
                state.status === "uploaded" || state.status === "no-image"
                    ? state.room.id
                    : null;

            const { data, error } = existingRoomId
                ? await apiClient.PUT(
                      "/properties/{property_id}/rooms/{room_id}",
                      {
                          params: {
                              path: {
                                  property_id: propertyId,
                                  room_id: existingRoomId,
                              },
                          },
                          body: { image: file as unknown as string, label },
                          bodySerializer: () => formData,
                      },
                  )
                : await apiClient.POST("/properties/{property_id}/rooms", {
                      params: { path: { property_id: propertyId } },
                      body: { image: file as unknown as string, label },
                      bodySerializer: () => formData,
                  });

            if (error || !data) {
                onStateChange({
                    status: "error",
                    preview,
                    message: "Upload failed. Try again.",
                });
                return;
            }

            onStateChange({ status: "uploaded", room: data, preview });
            onRoomAdded(data);
        },
        [label, propertyId, state, onStateChange, onRoomAdded],
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) void handleFile(file);
        e.target.value = "";
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file?.type.startsWith("image/")) void handleFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const openPicker = () => {
        if (!isBusy) inputRef.current?.click();
    };

    const handleCardClick = () => {
        if (state.status === "uploaded" && onRoomClick) {
            onRoomClick(state.room);
        } else {
            openPicker();
        }
    };

    const isUploading = state.status === "uploading";
    const isBusy = isUploading || isDeleting;
    const hasImage =
        state.status === "uploading" ||
        state.status === "uploaded" ||
        state.status === "error";
    const preview = hasImage ? (state as { preview: string }).preview : null;

    return (
        <div className="relative group">
            {onRemove && state.status === "empty" && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="absolute top-1.5 right-1.5 z-10 btn btn-circle btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove room"
                >
                    <X size={12} />
                </button>
            )}
            <button
                type="button"
                tabIndex={isBusy ? -1 : 0}
                className={`card card-border bg-base-100 overflow-hidden select-none transition-all text-left w-full ${
                    isBusy
                        ? "cursor-wait"
                        : "cursor-pointer hover:shadow-md hover:border-primary/40"
                } ${isDragOver ? "border-primary ring-2 ring-primary/30" : ""}`}
                onClick={handleCardClick}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleCardClick();
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={() => setIsDragOver(false)}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleInputChange}
                />

                {/* Image / placeholder area */}
                <div className="relative aspect-video bg-base-200">
                    {state.status === "no-image" ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-warning">
                            <AlertTriangle size={36} strokeWidth={1.5} />
                            <span className="text-xs">No image uploaded</span>
                        </div>
                    ) : hasImage && preview ? (
                        <>
                            <img
                                src={preview}
                                alt={label}
                                className="w-full h-full object-cover"
                            />
                            {isUploading && (
                                <div className="absolute inset-0 bg-base-100/50 flex items-center justify-center">
                                    <span className="loading loading-spinner loading-lg text-primary" />
                                </div>
                            )}
                            {state.status === "uploaded" && (
                                <>
                                    <div className="absolute top-2 right-2">
                                        <span className="badge badge-success badge-sm gap-1 shadow">
                                            <CheckCircle size={10} />
                                            Uploaded
                                        </span>
                                    </div>
                                    {(completedCount > 0 ||
                                        pendingCount > 0) && (
                                        <div className="absolute bottom-2 left-2 flex gap-1">
                                            {completedCount > 0 && (
                                                <span className="badge badge-sm badge-neutral gap-1 shadow">
                                                    <Images size={9} />
                                                    {completedCount}
                                                </span>
                                            )}
                                            {pendingCount > 0 && (
                                                <span className="badge badge-sm badge-warning gap-1 shadow">
                                                    <span className="loading loading-dots loading-xs" />
                                                    {pendingCount}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                            {state.status === "error" && (
                                <div className="absolute inset-0 bg-error/30 flex items-center justify-center p-2">
                                    <span className="text-error text-xs font-semibold text-center">
                                        {(state as { message: string }).message}
                                    </span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div
                            className={`w-full h-full flex flex-col items-center justify-center gap-2 transition-colors ${
                                isDragOver
                                    ? "text-primary"
                                    : "text-base-content/30"
                            }`}
                        >
                            <Icon size={36} strokeWidth={1.5} />
                            <span className="text-xs">Drop photo here</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-3 py-2 flex items-center justify-between min-h-9">
                    <span className="text-sm font-medium">{label}</span>
                    {!isBusy && (
                        <span className="text-xs text-base-content/40 flex items-center gap-0.5">
                            {state.status === "uploaded" ||
                            state.status === "no-image" ? (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="btn btn-xs btn-ghost hover:text-error"
                                    title="Delete room"
                                >
                                    <Trash2 size={11} />
                                </button>
                            ) : (
                                <>
                                    <Upload size={11} />
                                    Upload
                                </>
                            )}
                        </span>
                    )}
                    {isDeleting && (
                        <span className="loading loading-spinner loading-xs text-base-content/40" />
                    )}
                </div>
            </button>
        </div>
    );
}

function toTitleCase(str: string) {
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function AddRoomCard({ onAdd }: { onAdd: (label: string) => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const handleOpen = () => {
        setIsEditing(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleConfirm = () => {
        const trimmed = toTitleCase(label.trim());
        if (!trimmed) return;
        onAdd(trimmed);
        setLabel("");
        setIsEditing(false);
    };

    const handleCancel = () => {
        setLabel("");
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleConfirm();
        if (e.key === "Escape") handleCancel();
    };

    if (isEditing) {
        return (
            <div className="card card-border bg-base-100 overflow-hidden">
                <div className="aspect-video bg-base-200 flex flex-col items-center justify-center gap-3 px-4">
                    <Home
                        size={28}
                        strokeWidth={1.5}
                        className="text-base-content/30"
                    />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Room name"
                        value={label}
                        onChange={(e) => setLabel(toTitleCase(e.target.value))}
                        onKeyDown={handleKeyDown}
                        className="input input-sm w-full text-center"
                        maxLength={100}
                    />
                </div>
                <div className="px-3 py-2 flex items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-primary btn-sm flex-1"
                        onClick={handleConfirm}
                        disabled={!label.trim()}
                    >
                        Add room
                    </button>
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleCancel}
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={handleOpen}
            className="card card-border bg-base-100 overflow-hidden select-none cursor-pointer hover:shadow-md hover:border-primary/40 transition-all text-left w-full border-dashed"
        >
            <div className="aspect-video flex flex-col items-center justify-center gap-2 text-base-content/30 hover:text-primary transition-colors">
                <Plus size={36} strokeWidth={1.5} />
                <span className="text-xs">Add room</span>
            </div>
        </button>
    );
}

export function RoomUploader({
    propertyId,
    onRoomAdded,
    onRoomClick,
    initialRooms = [],
}: RoomUploaderProps) {
    const { data: generations } = useGenerations(propertyId);

    const countsByRoomId = useMemo(() => {
        const map = new Map<string, { completed: number; pending: number }>();
        for (const job of generations ?? []) {
            const c = map.get(job.room_id) ?? { completed: 0, pending: 0 };
            if (job.completed_at && !job.error_message) c.completed++;
            else if (!job.completed_at && !job.error_message) c.pending++;
            map.set(job.room_id, c);
        }
        return map;
    }, [generations]);
    const [customLabels, setCustomLabels] = useState<string[]>(() =>
        initialRooms
            .filter((r) => !DEFAULT_LABELS.has(r.label))
            .map((r) => r.label),
    );

    const [slotStates, setSlotStates] = useState<Record<string, SlotState>>(
        () => {
            const states: Record<string, SlotState> = Object.fromEntries(
                DEFAULT_ROOM_TYPES.map(({ label }) => [
                    label,
                    { status: "empty" as const },
                ]),
            );
            for (const room of initialRooms) {
                states[room.label] = room.image_url
                    ? { status: "uploaded", room, preview: room.image_url }
                    : { status: "no-image", room };
            }
            return states;
        },
    );

    const [toast, setToast] = useState<string | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((message: string) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast(message);
        toastTimer.current = setTimeout(() => setToast(null), 3000);
    }, []);

    useEffect(
        () => () => {
            if (toastTimer.current) clearTimeout(toastTimer.current);
        },
        [],
    );

    const handleStateChange = useCallback((label: string, state: SlotState) => {
        setSlotStates((prev) => ({ ...prev, [label]: state }));
    }, []);

    const handleAddCustom = (label: string) => {
        if (label in slotStates) return; // already exists
        setCustomLabels((prev) => [...prev, label]);
        setSlotStates((prev) => ({ ...prev, [label]: { status: "empty" } }));
    };

    const handleRemoveCustom = (label: string) => {
        setCustomLabels((prev) => prev.filter((l) => l !== label));
        setSlotStates((prev) => {
            const next = { ...prev };
            delete next[label];
            return next;
        });
    };

    return (
        <div className="relative">
            {toast && (
                <div className="toast toast-end z-50 pointer-events-none">
                    <div className="alert alert-success text-sm gap-2 py-2">
                        <CheckCircle size={14} />
                        <span>{toast}</span>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                    ...DEFAULT_ROOM_TYPES,
                    ...customLabels.map((label) => ({ label, Icon: Home })),
                ]
                    .sort((a, b) => {
                        const aUploaded =
                            slotStates[a.label]?.status === "uploaded";
                        const bUploaded =
                            slotStates[b.label]?.status === "uploaded";
                        if (aUploaded !== bUploaded) return aUploaded ? -1 : 1;
                        return a.label.localeCompare(b.label);
                    })
                    .map(({ label, Icon }) => {
                        const isCustom = customLabels.includes(label);
                        const slotState = slotStates[label];
                        const roomId =
                            slotState.status === "uploaded" ||
                            slotState.status === "no-image"
                                ? slotState.room.id
                                : null;
                        const counts = roomId
                            ? countsByRoomId.get(roomId)
                            : null;
                        return (
                            <RoomSlot
                                key={label}
                                label={label}
                                Icon={Icon}
                                propertyId={propertyId}
                                state={slotState}
                                onStateChange={(s) =>
                                    handleStateChange(label, s)
                                }
                                onRoomAdded={onRoomAdded}
                                onRoomClick={onRoomClick}
                                onRemove={
                                    isCustom
                                        ? () => handleRemoveCustom(label)
                                        : undefined
                                }
                                onDelete={(l) => {
                                    if (isCustom) handleRemoveCustom(label);
                                    showToast(`${l} deleted`);
                                }}
                                completedCount={counts?.completed}
                                pendingCount={counts?.pending}
                            />
                        );
                    })}
                <AddRoomCard onAdd={handleAddCustom} />
            </div>
        </div>
    );
}
