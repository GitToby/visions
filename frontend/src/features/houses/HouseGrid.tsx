import { useHouses } from "../../lib/api/hooks";
import { HouseCard } from "./HouseCard";

export function HouseGrid() {
  const { data: houses, isLoading, error } = useHouses();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>Failed to load projects. Please try again.</span>
      </div>
    );
  }

  if (!houses || houses.length === 0) {
    return (
      <div className="text-center py-16 text-base-content/50">
        <p className="text-lg mb-2">No projects yet</p>
        <p className="text-sm">Create a project to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {houses.map((house) => (
        <HouseCard key={house.id} house={house} />
      ))}
    </div>
  );
}
