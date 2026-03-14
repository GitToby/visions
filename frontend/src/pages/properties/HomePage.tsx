import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { NewProjectModal } from "@/features/properties/NewProjectModal";
import { PropertyCard } from "@/features/properties/PropertyCard";
import { PropertyGrid } from "@/features/properties/PropertyGrid";
import { useFeaturedProperties } from "@/lib/api/hooks";

function FeaturedSection() {
  const { data: featured, isLoading } = useFeaturedProperties();

  if (!isLoading && (!featured || featured.length === 0)) return null;

  return (
    <section className="mt-14">
      <h2 className="text-2xl font-bold mb-8">Featured</h2>
      {isLoading ? (
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured!.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </section>
  );
}

export function HomePage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">My Projects</h1>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setModalOpen(true)}
          >
            New Project
          </button>
        </div>
        <PropertyGrid />
        <FeaturedSection />
      </main>
      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
