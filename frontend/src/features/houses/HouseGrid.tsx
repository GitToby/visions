import { useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Plus } from "lucide-react";
import { $api } from "@/lib/api/client";
import { HouseCard } from "./HouseCard";

interface HouseGridProps {
  onNewProject?: () => void;
}

export function HouseGrid({ onNewProject }: HouseGridProps) {
  const queryClient = useQueryClient();
  const { data: houses, isLoading, error } = $api.useQuery("get", "/houses");
  const { mutateAsync: deleteHouse } = $api.useMutation(
    "delete",
    "/houses/{house_id}"
  );

  async function handleDelete(id: string) {
    await deleteHouse({ params: { path: { house_id: id } } });
    queryClient.invalidateQueries({ queryKey: ["get", "/houses"] });
  }

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

  if (!houses?.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-base-300 px-4 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-base-200">
          <FolderOpen className="h-8 w-8 text-base-content/30" />
        </div>
        <p className="mb-1 text-lg font-semibold">No projects yet</p>
        <p className="mb-6 max-w-xs text-sm text-base-content/50">
          Create your first project to start redesigning rooms with AI.
        </p>
        {onNewProject && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onNewProject}
          >
            <Plus className="h-5 w-5" />
            Create your first project
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {houses.map((house) => (
        <HouseCard key={house.id} house={house} onDelete={handleDelete} />
      ))}
    </div>
  );
}
