import { useQueryClient } from "@tanstack/react-query";
import { $api } from "@/lib/api/client";
import { HouseCard } from "./HouseCard";

export function HouseGrid() {
  const queryClient = useQueryClient();
  const {
    data: houses,
    isLoading,
    error,
  } = $api.useQuery("get", "/houses");
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
      <div className="flex justify-center py-12">
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
      <div className="py-20 text-center">
        <p className="text-lg text-base-content/50">No projects yet.</p>
        <p className="text-sm text-base-content/40">
          Start a new project to get going.
        </p>
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
