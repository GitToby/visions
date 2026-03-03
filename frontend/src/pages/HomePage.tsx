import { Plus } from "lucide-react";
import { useState } from "react";
import { HouseGrid } from "@/features/houses/HouseGrid";
import { NewProjectModal } from "@/features/houses/NewProjectModal";

export function HomePage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">My Projects</h1>
          <p className="mt-1 text-base-content/60">
            Your interior design projects
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary w-full sm:w-auto"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="h-5 w-5" />
          New Project
        </button>
      </div>

      <HouseGrid onNewProject={() => setModalOpen(true)} />

      <NewProjectModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
