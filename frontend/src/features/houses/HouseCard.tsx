import { ArrowRight, LayoutGrid, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { components } from "@/lib/api/schema";

type House = components["schemas"]["HouseResponse"];

interface HouseCardProps {
  house: House;
  onDelete: (id: string) => void;
}

export function HouseCard({ house, onDelete }: HouseCardProps) {
  const createdAt = new Date(house.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="card card-border bg-base-100 shadow-sm transition-shadow hover:shadow-md">
      <div className="card-body gap-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="card-title text-base">{house.name}</h2>
          <button
            type="button"
            className="btn btn-ghost btn-xs text-error"
            onClick={() => onDelete(house.id)}
            aria-label="Delete project"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-base-content/50">
          <LayoutGrid className="h-3.5 w-3.5" />
          <span>
            {house.room_count} {house.room_count === 1 ? "room" : "rooms"}
          </span>
          <span className="opacity-40">·</span>
          <span>{createdAt}</span>
        </div>
        <div className="card-actions mt-1">
          <Link
            to={`/home/${house.id}`}
            className="btn btn-primary btn-sm btn-block"
          >
            Open project
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
