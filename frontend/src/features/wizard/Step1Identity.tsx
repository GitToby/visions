import { useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { $api } from "@/lib/api/client";

interface Step1IdentityProps {
  houseName: string;
  onHouseNameChange: (name: string) => void;
  onHouseCreated: (id: string) => void;
  onNext: () => void;
}

export function Step1Identity({
  houseName,
  onHouseNameChange,
  onHouseCreated,
  onNext,
}: Step1IdentityProps) {
  const queryClient = useQueryClient();
  const { mutateAsync: createHouse } = $api.useMutation("post", "/houses");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!houseName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const data = await createHouse({ body: { name: houseName.trim() } });
      if (data) {
        onHouseCreated(data.id);
        queryClient.invalidateQueries({ queryKey: ["get", "/houses"] });
        onNext();
      }
    } catch {
      setError("Failed to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="card-title mb-2 text-2xl">Name your project</h2>
      <p className="mb-6 text-base-content/60">
        Give your house project a memorable name.
      </p>
      <label className="form-control w-full">
        <div className="label">
          <span className="label-text">Project name</span>
        </div>
        <input
          type="text"
          placeholder="e.g. Beach House Renovation"
          className="input input-bordered w-full"
          value={houseName}
          onChange={(e) => onHouseNameChange(e.target.value)}
          required
          maxLength={255}
          autoFocus
        />
      </label>
      {error && (
        <div className="alert alert-error mt-4">
          <span>{error}</span>
        </div>
      )}
      <div className="card-actions mt-6 justify-end">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!houseName.trim() || isSubmitting}
        >
          {isSubmitting ? <span className="loading loading-spinner" /> : "Next"}
        </button>
      </div>
    </form>
  );
}
