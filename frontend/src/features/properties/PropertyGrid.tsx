import { useProperties } from "../../lib/api/hooks";
import { PropertyCard } from "./PropertyCard";

export function PropertyGrid() {
  const { data: properties, isLoading, error } = useProperties();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="card bg-base-100 card-border shadow-sm overflow-hidden"
          >
            <div className="aspect-video skeleton rounded-none" />
            <div className="card-body card-sm py-3 gap-2">
              <div className="skeleton h-5 w-3/4 rounded" />
              <div className="skeleton h-4 w-1/4 rounded" />
            </div>
          </div>
        ))}
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

  if (!properties || properties.length === 0) {
    return (
      <div className="text-center py-16 text-base-content/50">
        <p className="text-lg mb-2">No projects yet</p>
        <p className="text-sm">Create a project to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
