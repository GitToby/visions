import {
  Bath,
  Bed,
  CheckCircle,
  ChefHat,
  Home,
  type LucideIcon,
  Monitor,
  Sofa,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGenerations } from "@/lib/api/hooks";
import type { components } from "@/lib/api/schema";
import { AddRoomCard } from "./AddRoomCard";
import { RoomSlot, type SlotState } from "./RoomSlot";

type RoomResponse = components["schemas"]["RoomResponse"];

export interface RoomUploaderGridProps {
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

export function RoomUploaderGrid({
  propertyId,
  onRoomAdded,
  onRoomClick,
  initialRooms = [],
}: RoomUploaderGridProps) {
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
    initialRooms.filter((r) => !DEFAULT_LABELS.has(r.label)).map((r) => r.label)
  );

  const [slotStates, setSlotStates] = useState<Record<string, SlotState>>(
    () => {
      const states: Record<string, SlotState> = Object.fromEntries(
        DEFAULT_ROOM_TYPES.map(({ label }) => [
          label,
          { status: "empty" as const },
        ])
      );
      for (const room of initialRooms) {
        states[room.label] = room.image_url
          ? { status: "uploaded", room, preview: room.image_url }
          : { status: "no-image", room };
      }
      return states;
    }
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
    []
  );

  const handleStateChange = useCallback((label: string, state: SlotState) => {
    setSlotStates((prev) => ({ ...prev, [label]: state }));
  }, []);

  const handleAddCustom = (label: string) => {
    if (label in slotStates) return;
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
            const aUploaded = slotStates[a.label]?.status === "uploaded";
            const bUploaded = slotStates[b.label]?.status === "uploaded";
            if (aUploaded !== bUploaded) return aUploaded ? -1 : 1;
            return a.label.localeCompare(b.label);
          })
          .map(({ label, Icon }) => {
            const isCustom = customLabels.includes(label);
            const slotState = slotStates[label];
            const roomId =
              slotState.status === "uploaded" || slotState.status === "no-image"
                ? slotState.room.id
                : null;
            const counts = roomId ? countsByRoomId.get(roomId) : null;
            return (
              <RoomSlot
                key={label}
                label={label}
                Icon={Icon}
                propertyId={propertyId}
                state={slotState}
                onStateChange={(s) => handleStateChange(label, s)}
                onRoomAdded={onRoomAdded}
                onRoomClick={onRoomClick}
                onRemove={
                  isCustom ? () => handleRemoveCustom(label) : undefined
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

// Keep legacy export name for backwards compatibility
export { RoomUploaderGrid as RoomUploader };
export type { RoomUploaderGridProps as RoomUploaderProps };
