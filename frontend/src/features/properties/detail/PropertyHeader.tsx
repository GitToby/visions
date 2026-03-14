import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil } from "lucide-react";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { apiClient } from "@/lib/api/hooks";
import { queryKeys } from "@/lib/api/queryKeys";
import type { components } from "@/lib/api/schema";

type PropertyResponse = components["schemas"]["PropertyResponse"];

interface PropertyHeaderProps {
  property: PropertyResponse;
  propertyId: string;
}

interface EditableTextProps {
  value: string;
  placeholder: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  saving: boolean;
  onSave: () => void;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  maxLength?: number;
}

function EditableText({
  value,
  placeholder,
  inputRef,
  saving,
  onSave,
  onChange,
  onKeyDown,
  className = "",
  maxLength,
}: EditableTextProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        className={`input input-ghost px-1 h-auto py-0 focus:outline-none w-full max-w-sm ${className}`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onSave}
        disabled={saving}
        maxLength={maxLength}
      />
      {saving && (
        <span className="loading loading-spinner loading-sm text-base-content/40" />
      )}
    </div>
  );
}

export function PropertyHeader({ property, propertyId }: PropertyHeaderProps) {
  const queryClient = useQueryClient();

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

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.property(propertyId) });

  const patch = (body: components["schemas"]["PropertyUpdate"]) =>
    apiClient.PUT("/properties/{property_id}", {
      params: { path: { property_id: propertyId } },
      body,
    });

  // --- Name ---
  const startEditName = () => {
    setEditName(property.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  };
  const cancelEditName = () => {
    setEditingName(false);
    setEditName("");
  };
  const saveEditName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === property.name) {
      cancelEditName();
      return;
    }
    setSavingName(true);
    await patch({ name: trimmed });
    setSavingName(false);
    setEditingName(false);
    void invalidate();
  };

  // --- Address ---
  const startEditAddress = () => {
    setEditAddress(property.address ?? "");
    setEditingAddress(true);
    setTimeout(() => addressInputRef.current?.select(), 0);
  };
  const cancelEditAddress = () => {
    setEditingAddress(false);
    setEditAddress("");
  };
  const saveEditAddress = async () => {
    const trimmed = editAddress.trim();
    if (trimmed === (property.address ?? "")) {
      cancelEditAddress();
      return;
    }
    setSavingAddress(true);
    await patch({ address: trimmed || null });
    setSavingAddress(false);
    setEditingAddress(false);
    void invalidate();
  };

  // --- Description ---
  const startEditDescription = () => {
    setEditDescription(property.description ?? "");
    setEditingDescription(true);
    setTimeout(() => descriptionInputRef.current?.focus(), 0);
  };
  const cancelEditDescription = () => {
    setEditingDescription(false);
    setEditDescription("");
  };
  const saveEditDescription = async () => {
    const trimmed = editDescription.trim();
    if (trimmed === (property.description ?? "")) {
      cancelEditDescription();
      return;
    }
    setSavingDescription(true);
    await patch({ description: trimmed || null });
    setSavingDescription(false);
    setEditingDescription(false);
    void invalidate();
  };

  return (
    <div className="flex-1 min-w-0">
      {/* Name */}
      {editingName ? (
        <EditableText
          value={editName}
          placeholder=""
          inputRef={nameInputRef}
          saving={savingName}
          onSave={() => void saveEditName()}
          onChange={setEditName}
          onKeyDown={(e) => {
            if (e.key === "Enter") void saveEditName();
            if (e.key === "Escape") cancelEditName();
          }}
          className="text-2xl font-bold"
          maxLength={100}
        />
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

      {/* Public toggle */}
      <label className="flex items-center gap-2 mt-2 cursor-pointer w-fit">
        <input
          type="checkbox"
          className="toggle toggle-sm toggle-primary"
          checked={property.public}
          onChange={(e) => {
            void patch({ public: e.target.checked }).then(
              () => void invalidate()
            );
          }}
        />
        <span className="text-sm text-base-content/60">
          {property.public ? "Public" : "Private"}
        </span>
      </label>

      {/* Address */}
      {editingAddress ? (
        <div className="flex items-center gap-2 mt-1">
          <MapPin size={14} className="text-base-content/60 shrink-0" />
          <EditableText
            value={editAddress}
            placeholder="Enter address…"
            inputRef={addressInputRef}
            saving={savingAddress}
            onSave={() => void saveEditAddress()}
            onChange={setEditAddress}
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveEditAddress();
              if (e.key === "Escape") cancelEditAddress();
            }}
            className="text-sm"
            maxLength={500}
          />
        </div>
      ) : (
        <div className="flex items-center gap-1.5 mt-1 group/address">
          <MapPin size={14} className="text-base-content/60 shrink-0" />
          <span className="text-sm text-base-content/60">
            {property.address ?? (
              <span className="italic text-base-content/30">No address</span>
            )}
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
            onKeyDown={(e) => {
              if (e.key === "Escape") cancelEditDescription();
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                void saveEditDescription();
            }}
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
              className="btn btn-ghost btn-sm text-base-content/30 italic font-normal"
            >
              Add a description…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
