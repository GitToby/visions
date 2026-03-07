import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { GenerateWizardModal } from "../features/properties/detail/GenerateWizardModal";
import { RoomImagesModal } from "../features/properties/detail/RoomImagesModal";
import { RoomUploader } from "../features/properties/detail/RoomUploader";
import { apiClient, useProperty } from "../lib/api/hooks";
import type { components } from "../lib/api/schema";

type RoomResponse = components["schemas"]["RoomResponse"];

export function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { data: property, isLoading, error } = useProperty(propertyId ?? "");
  const queryClient = useQueryClient();
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomResponse | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [editingAddress, setEditingAddress] = useState(false);
  const [editAddress, setEditAddress] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);

  const [editingDescription, setEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (property?.rooms) setRooms(property.rooms);
  }, [property?.rooms]);

  const invalidateProperty = () =>
    queryClient.invalidateQueries({
      queryKey: ["get", "/houses/{property_id}", propertyId],
    });

  // Name
  const startEditName = () => {
    setEditName(property?.name ?? "");
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  };
  const cancelEditName = () => { setEditingName(false); setEditName(""); };
  const saveEditName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || !propertyId || trimmed === property?.name) { cancelEditName(); return; }
    setSavingName(true);
    await apiClient.PUT("/houses/{property_id}", {
      params: { path: { property_id: propertyId } },
      body: { name: trimmed },
    });
    setSavingName(false);
    setEditingName(false);
    void invalidateProperty();
  };
  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void saveEditName();
    if (e.key === "Escape") cancelEditName();
  };

  // Address
  const startEditAddress = () => {
    setEditAddress(property?.address ?? "");
    setEditingAddress(true);
    setTimeout(() => addressInputRef.current?.select(), 0);
  };
  const cancelEditAddress = () => { setEditingAddress(false); setEditAddress(""); };
  const saveEditAddress = async () => {
    const trimmed = editAddress.trim();
    if (!propertyId || trimmed === (property?.address ?? "")) { cancelEditAddress(); return; }
    setSavingAddress(true);
    await apiClient.PUT("/houses/{property_id}", {
      params: { path: { property_id: propertyId } },
      body: { address: trimmed || null },
    });
    setSavingAddress(false);
    setEditingAddress(false);
    void invalidateProperty();
  };
  const handleAddressKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void saveEditAddress();
    if (e.key === "Escape") cancelEditAddress();
  };

  // Description
  const startEditDescription = () => {
    setEditDescription(property?.description ?? "");
    setEditingDescription(true);
    setTimeout(() => descriptionInputRef.current?.focus(), 0);
  };
  const cancelEditDescription = () => { setEditingDescription(false); setEditDescription(""); };
  const saveEditDescription = async () => {
    const trimmed = editDescription.trim();
    if (!propertyId || trimmed === (property?.description ?? "")) { cancelEditDescription(); return; }
    setSavingDescription(true);
    await apiClient.PUT("/houses/{property_id}", {
      params: { path: { property_id: propertyId } },
      body: { description: trimmed || null },
    });
    setSavingDescription(false);
    setEditingDescription(false);
    void invalidateProperty();
  };
  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") cancelEditDescription();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void saveEditDescription();
  };

  const handleRoomAdded = (room: RoomResponse) => {
    setRooms((prev) => [...prev.filter((r) => r.label !== room.label), room]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
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
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="breadcrumbs text-sm mb-1">
              <ul>
                <li>
                  <Link to="/properties">My Projects</Link>
                </li>
                <li>{property.name}</li>
              </ul>
            </div>

            {/* Name */}
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  ref={nameInputRef}
                  type="text"
                  className="input input-ghost text-2xl font-bold px-1 h-auto py-0 focus:outline-none w-full max-w-sm"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  onBlur={() => void saveEditName()}
                  disabled={savingName}
                  maxLength={100}
                />
                {savingName && (
                  <span className="loading loading-spinner loading-sm text-base-content/40" />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title">
                <h1 className="text-2xl font-bold">{property.name}</h1>
                <button
                  type="button"
                  onClick={startEditName}
                  className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover/title:opacity-100 transition-opacity"
                  title="Rename project"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}

            {/* Address */}
            {editingAddress ? (
              <div className="flex items-center gap-2 mt-1">
                <MapPin size={14} className="text-base-content/60 shrink-0" />
                <input
                  ref={addressInputRef}
                  type="text"
                  className="input input-ghost text-sm px-1 h-auto py-0 focus:outline-none w-full max-w-sm"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  onKeyDown={handleAddressKeyDown}
                  onBlur={() => void saveEditAddress()}
                  disabled={savingAddress}
                  maxLength={500}
                  placeholder="Enter address…"
                />
                {savingAddress && (
                  <span className="loading loading-spinner loading-xs text-base-content/40" />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-1 group/address">
                <MapPin size={14} className="text-base-content/60 shrink-0" />
                <span className="text-sm text-base-content/60">
                  {property.address ?? <span className="italic text-base-content/30">No address</span>}
                </span>
                <button
                  type="button"
                  onClick={startEditAddress}
                  className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover/address:opacity-100 transition-opacity"
                  title="Edit address"
                >
                  <Pencil size={11} />
                </button>
              </div>
            )}

            {/* Description */}
            {editingDescription ? (
              <div className="mt-3 max-w-2xl">
                <textarea
                  ref={descriptionInputRef}
                  className="textarea textarea-bordered w-full text-sm min-h-24 resize-y"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onKeyDown={handleDescriptionKeyDown}
                  onBlur={() => void saveEditDescription()}
                  disabled={savingDescription}
                  placeholder="Add a description… (markdown supported, ⌘↵ to save)"
                />
                {savingDescription && (
                  <span className="loading loading-spinner loading-xs text-base-content/40 mt-1" />
                )}
              </div>
            ) : (
              <div className="mt-3 group/description">
                {property.description ? (
                  <div className="flex items-start gap-2">
                    <div className="text-sm text-base-content/70 max-w-2xl [&_p]:mb-2 [&_h1]:font-bold [&_h2]:font-semibold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline [&_strong]:font-semibold [&_em]:italic">
                      <ReactMarkdown>{property.description}</ReactMarkdown>
                    </div>
                    <button
                      type="button"
                      onClick={startEditDescription}
                      className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover/description:opacity-100 transition-opacity shrink-0 mt-0.5"
                      title="Edit description"
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startEditDescription}
                    className="text-sm text-base-content/30 italic hover:text-base-content/50 transition-colors"
                  >
                    Add a description…
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Generate button */}
          <button
            type="button"
            className="btn btn-primary shrink-0"
            onClick={() => setWizardOpen(true)}
            disabled={uploadedRooms.length === 0}
            title={uploadedRooms.length === 0 ? "Upload at least one room to generate" : undefined}
          >
            <Sparkles size={16} />
            Generate
          </button>
        </div>

        {/* Rooms */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Rooms</h2>
          <RoomUploader
            propertyId={property.id}
            onRoomAdded={handleRoomAdded}
            onRoomClick={setSelectedRoom}
            initialRooms={property.rooms}
          />
        </section>
      </main>

      {/* Room images modal */}
      <RoomImagesModal
        room={selectedRoom}
        propertyId={property.id}
        onClose={() => setSelectedRoom(null)}
      />

      {/* Generate wizard modal */}
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
