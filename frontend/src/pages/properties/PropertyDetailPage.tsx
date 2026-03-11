import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { GenerateWizardModal } from "@/features/properties/detail/generations/GenerateWizardModal";
import { PropertyHeader } from "@/features/properties/detail/PropertyHeader";
import { RoomUploader } from "@/features/properties/detail/rooms/RoomUploader";
import { useProperty } from "@/lib/api/hooks";
import type { components } from "@/lib/api/schema";

type RoomResponse = components["schemas"]["RoomResponse"];

export function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { data: property, isLoading, error } = useProperty(propertyId ?? "");
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    if (property?.rooms) setRooms(property.rooms);
  }, [property?.rooms]);

  const handleRoomAdded = (room: RoomResponse) => {
    setRooms((prev) => [...prev.filter((r) => r.label !== room.label), room]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-32 rounded" />
              <div className="skeleton h-8 w-56 rounded" />
              <div className="skeleton h-4 w-40 rounded" />
            </div>
            <div className="skeleton h-10 w-40 rounded" />
          </div>
          <section>
            <div className="skeleton h-5 w-16 rounded mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="card card-border bg-base-100 overflow-hidden"
                >
                  <div className="aspect-video skeleton rounded-none" />
                  <div className="px-3 py-2">
                    <div className="skeleton h-4 w-24 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
          <div className="alert alert-error">
            <span>Failed to load project.</span>
          </div>
        </div>
      </div>
    );
  }

  const uploadedRooms = rooms.filter((r) => r.image_url);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-10">
        <div className="flex items-start justify-between gap-4">
          <div className="breadcrumbs text-sm mb-1">
            <ul>
              <li>
                <Link to="/properties">My Projects</Link>
              </li>
              <li>{property.name}</li>
            </ul>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4">
          <PropertyHeader property={property} propertyId={property.id} />

          <button
            type="button"
            className="btn btn-primary shrink-0"
            onClick={() => setWizardOpen(true)}
            disabled={uploadedRooms.length === 0}
            title={
              uploadedRooms.length === 0
                ? "Upload at least one room to generate"
                : undefined
            }
          >
            <Sparkles size={16} />
            Reimagine Property
          </button>
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-4">Rooms</h2>
          <RoomUploader
            propertyId={property.id}
            onRoomAdded={handleRoomAdded}
            onRoomClick={(room) =>
              navigate(`/properties/${property.id}/room/${room.id}`)
            }
            initialRooms={property.rooms}
          />
        </section>
      </main>

      {wizardOpen && (
        <GenerateWizardModal
          propertyId={property.id}
          rooms={rooms}
          onClose={() => setWizardOpen(false)}
        />
      )}
    </div>
  );
}
