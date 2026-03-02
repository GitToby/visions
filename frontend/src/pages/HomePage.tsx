import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { HouseGrid } from "@/features/houses/HouseGrid";

export function HomePage() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Projects</h1>
          <p className="text-base-content/60">Your interior design projects</p>
        </div>
        <Link to="/wizard" className="btn btn-primary">
          <Plus className="h-5 w-5" />
          Start New Project
        </Link>
      </div>
      <HouseGrid />
    </div>
  );
}
