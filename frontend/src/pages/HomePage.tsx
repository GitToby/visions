import { useState } from "react";
import { Navbar } from "../components/Navbar";
import { HouseGrid } from "../features/houses/HouseGrid";
import { NewProjectModal } from "../features/houses/NewProjectModal";

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
        <HouseGrid />
      </main>
      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
