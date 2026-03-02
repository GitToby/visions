import { Image, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { components } from "@/lib/api/schema";

type House = components["schemas"]["HouseResponse"];

interface HouseCardProps {
  house: House;
  onDelete: (id: string) => void;
}

export function HouseCard({ house, onDelete }: HouseCardProps) {
  const createdAt = new Date(house.created_at).toLocaleDateString();

  return (
    <div className="card bg-base-100 shadow-md transition-shadow hover:shadow-lg">
      <div className="card-body">
        <h2 className="card-title">{house.name}</h2>
        <div className="flex items-center gap-1 text-sm text-base-content/60">
          <Image className="h-4 w-4" />
          <span>
            {house.room_count} {house.room_count === 1 ? "room" : "rooms"}
          </span>
        </div>
        <p className="text-xs text-base-content/40">{createdAt}</p>
        <div className="card-actions mt-2 justify-between">
          <Link to={`/houses/${house.id}`} className="btn btn-primary btn-sm">
            View
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-sm text-error"
            onClick={() => onDelete(house.id)}
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
