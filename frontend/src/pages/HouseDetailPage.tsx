import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { GenerationGallery } from "@/features/houses/GenerationGallery";
import { $api } from "@/lib/api/client";

export function HouseDetailPage() {
  const { houseId } = useParams<{ houseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: house,
    isLoading,
    error,
  } = $api.useQuery("get", "/houses/{house_id}", {
    params: { path: { house_id: houseId! } },
  });

  const { mutateAsync: deleteHouse } = $api.useMutation(
    "delete",
    "/houses/{house_id}"
  );

  async function handleDelete() {
    if (!confirm(`Delete "${house?.name}"? This cannot be undone.`)) return;
    await deleteHouse({ params: { path: { house_id: houseId! } } });
    queryClient.invalidateQueries({ queryKey: ["get", "/houses"] });
    navigate("/");
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error || !house) {
    return (
      <div className="alert alert-error">
        <span>Project not found.</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="btn btn-ghost btn-sm">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{house.name}</h1>
            <p className="text-base-content/60">
              {house.room_count} {house.room_count === 1 ? "room" : "rooms"}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-error btn-outline btn-sm"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
          Delete Project
        </button>
      </div>
      <GenerationGallery house={house} />
    </div>
  );
}
