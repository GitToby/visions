import { Link } from "react-router-dom";
import type { components } from "../../lib/api/schema";

type HouseResponse = components["schemas"]["HouseResponse"];

interface HouseCardProps {
  house: HouseResponse;
}

export function HouseCard({ house }: HouseCardProps) {
  const images = house.rooms
    .map((r) => r.image_url)
    .filter((url): url is string => !!url)
    .slice(0, 4);

  return (
    <Link to={`/houses/${house.id}`} className="block group">
      <div className="card bg-base-100 card-border shadow-sm group-hover:shadow-md transition-all overflow-hidden">
        {/* Cover */}
        <div className="aspect-video bg-base-200 overflow-hidden">
          {images.length === 0 ? (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <span className="text-5xl font-bold text-primary/25 select-none">
                {house.name.charAt(0).toUpperCase()}
              </span>
            </div>
          ) : images.length === 1 ? (
            <img
              src={images[0]}
              alt={house.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div
              className={`w-full h-full grid gap-px ${
                images.length >= 4 ? "grid-cols-2 grid-rows-2" : "grid-cols-2"
              }`}
            >
              {images.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <div className="card-body card-sm py-3">
          <h2 className="card-title text-base">{house.name}</h2>
          <span className="badge badge-neutral badge-sm">
            {house.room_count ?? 0}{" "}
            {(house.room_count ?? 0) === 1 ? "room" : "rooms"}
          </span>
        </div>
      </div>
    </Link>
  );
}
