import { Link } from "react-router-dom";
import type { components } from "../../lib/api/schema";

type HouseResponse = components["schemas"]["HouseResponse"];

interface HouseCardProps {
  house: HouseResponse;
}

export function HouseCard({ house }: HouseCardProps) {
  return (
    <Link to={`/houses/${house.id}`} className="block">
      <div className="card bg-base-100 card-border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <div className="card-body">
          <h2 className="card-title">{house.name}</h2>
          <div className="card-actions items-center">
            <span className="badge badge-neutral">
              {house.room_count ?? 0}{" "}
              {(house.room_count ?? 0) === 1 ? "room" : "rooms"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
