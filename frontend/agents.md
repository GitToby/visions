---
name: visions_frontend_agent
description: Frontend coding agent for the Visions interior design platform (Next.js 15 App Router, React 19, TypeScript strict, DaisyUI 5)
---

You are an expert frontend engineer on the Visions codebase. Implement UI features, fix bugs, and write tests while keeping the codebase clean, type-safe, and production-ready.

---

## How to Approach Tasks

1. **Read before writing.** Understand the existing component, hook, or page before modifying it.
2. **Stay narrow.** Only change what the task requires. Don't refactor unrelated components or clean up surrounding style.
3. **Verify before finishing.** Run `just frontend:check` before marking any task done. A task isn't done until type-checking and linting pass.
4. **Ask when uncertain.** Stop and ask before adding a new dependency, modifying auth logic, or hand-writing a fetch call that should come from the generated client.

---

## Commands

```bash
just frontend:init              # bun install
just frontend:dev               # Next.js dev server — http://localhost:3000
just frontend:lint              # eslint with auto-fix
just frontend:check             # lint + tsc --noEmit  ← run before every PR
just frontend:test [flags]      # vitest (unit); pass flags directly to vitest
just frontend:gen-api           # regenerate typed API client from live backend schema
```

**Tooling constraints:**
- `bun` only — never `npm`, `yarn`, or `pnpm`

---

## Project Structure

```
frontend/
└── src/
    ├── app/                       # Next.js App Router pages
    │   ├── layout.tsx             # Root server layout — wraps with Providers
    │   ├── page.tsx               # Landing page (client, redirects to /properties if authed)
    │   ├── providers.tsx          # QueryClient + AuthProvider (client component)
    │   ├── globals.css            # Tailwind 4 + DaisyUI config + "visions" theme
    │   ├── auth/callback/         # Supabase OTP callback
    │   └── (app)/                 # Authenticated route group
    │       ├── layout.tsx         # Redirects to / if no session
    │       ├── properties/
    │       │   ├── page.tsx       # Dashboard: property grid + "New Project" modal
    │       │   └── [propertyId]/
    │       │       ├── page.tsx   # Property detail: rooms + wizard
    │       │       └── room/[roomId]/page.tsx  # Room view: before/after + gallery
    │       └── profile/page.tsx   # User profile + credits
    │
    ├── components/                # Shared, stateless UI primitives only
    ├── features/                  # Feature-scoped code (properties, styles, auth)
    │   ├── auth/
    │   │   └── AuthContext.tsx    # React context + Supabase client
    │   ├── properties/
    │   │   ├── PropertyCard.tsx
    │   │   ├── NewProjectModal.tsx
    │   │   └── detail/
    │   │       ├── RoomUploader.tsx
    │   │       └── GenerateWizardModal.tsx
    │   └── styles/
    │       └── StylePicker.tsx
    └── lib/
        ├── config.ts              # API base URL from NEXT_PUBLIC_API_BASE_URL
        ├── supabase.ts            # Supabase browser client
        └── api/
            ├── schema.d.ts        # Auto-generated — NEVER hand-edit
            └── hooks.ts           # openapi-fetch client + React Query hooks
```

**Structural rules:**
- `features/` — all feature-specific code goes here; never scatter into `components/`
- `components/` — shared, stateless UI primitives only (no domain knowledge)
- Add `"use client"` to every interactive component
- Server components are the default in `app/`; opt in to client only where needed

---

## Styling

- **DaisyUI 5** component classes (`btn`, `card`, `modal`, `badge`, etc.) over raw Tailwind
- **Tailwind 4** via `@tailwindcss/postcss`; no `tailwind.config.js`
- Custom **"visions" light theme** defined in `src/app/globals.css`
- Use DaisyUI semantic color names (`primary`, `base-100`, `base-content`, etc.)

---

## Code Patterns

### 1. Shared Primitive (`./src/components/`)

No domain knowledge. Props are plain HTML-compatible types.

✅ **Do this** — generic, reusable, no domain imports:

```tsx
// src/components/Badge.tsx
interface BadgeProps {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "error";
  size?: "xs" | "sm" | "md" | "lg";
}

export function Badge({ label, variant = "primary", size = "md" }: BadgeProps) {
  return <span className={`badge badge-${variant} badge-${size}`}>{label}</span>;
}
```

❌ **Not this** — domain-aware component in `components/`, uses `any`, raw Tailwind color soup:

```tsx
// ❌ components/ should not know about Property or make API calls
import type { Property } from "@/features/properties/types"; // domain import in shared component

export function PropertyBadge({ property }: { property: any }) { // any — forbidden
  const color = property.status === "active" ? "bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold" : "bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs";
  return <span className={color}>{property.status}</span>; // raw Tailwind soup instead of badge class
}
```

### 2. Feature Component (`./src/features/`)

Combines primitives with domain data. Knows about `Property`, `Room`, etc.

✅ **Do this** — typed from generated schema, `"use client"`, DaisyUI classes:

```tsx
// src/features/properties/PropertyCard.tsx
"use client";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import type { components } from "@/lib/api/schema.d.ts";

type Property = components["schemas"]["PropertyResponse"];

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Link href={`/properties/${property.id}`} className="card bg-base-100 shadow hover:shadow-md transition-shadow border border-base-200">
      <figure className="aspect-video overflow-hidden">
        <img
          src={property.cover_image_url ?? "/placeholder.webp"}
          alt={property.name}
          className="object-cover w-full h-full"
        />
      </figure>
      <div className="card-body gap-1">
        <div className="flex justify-between items-start">
          <h2 className="card-title text-base">{property.name}</h2>
          <Badge label={`${property.room_count} rooms`} variant="ghost" size="sm" />
        </div>
        <p className="text-sm text-base-content/60">{property.address}</p>
      </div>
    </Link>
  );
}
```

❌ **Not this** — hand-written interface duplicating backend types, raw fetch, missing `"use client"`, no loading/error state:

```tsx
// ❌ manually duplicated type (diverges from backend), raw fetch, no error handling
interface Property {            // hand-written — will drift from backend
  id: string;
  name: string;
}

export function PropertyCard({ id }: { id: string }) {  // missing "use client"
  const [property, setProperty] = useState<Property | null>(null);

  useEffect(() => {
    fetch(`/api/properties/${id}`)   // raw fetch — use client from @/lib/api/hooks
      .then((r) => r.json())
      .then(setProperty);            // no error handling, no loading state
  }, [id]);

  if (!property) return null;        // silently blank instead of a spinner
  return <div>{property.name}</div>;
}
```

### 3. Modal Pattern

Use DaisyUI's `<dialog>` approach; expose `open` + `onClose` props.

✅ **Do this** — controlled via props, invalidates query cache on success, shows pending state:

```tsx
// src/features/properties/NewProjectModal.tsx
"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api/hooks";

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewProjectModal({ open, onClose }: NewProjectModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const nameRef = useRef<HTMLInputElement>(null);

  const create = useMutation({
    mutationFn: (name: string) =>
      client.POST("/properties", { body: { name } }),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      onClose();
      router.push(`/properties/${data!.id}`);
    },
  });

  return (
    <dialog className={`modal ${open ? "modal-open" : ""}`}>
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">New Project</h3>
        <input
          ref={nameRef}
          type="text"
          placeholder="Property name"
          className="input input-bordered w-full"
        />
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={create.isPending}
            onClick={() => nameRef.current && create.mutate(nameRef.current.value)}
          >
            {create.isPending ? <span className="loading loading-spinner loading-sm" /> : "Create"}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
```

❌ **Not this** — manages open state internally (can't be controlled by parent), no pending state, no cache invalidation:

```tsx
// ❌ self-controlled open state leaks modal lifecycle out of parent's hands;
//    no isPending feedback; no cache invalidation after mutation
export function NewProjectModal() {
  const [open, setOpen] = useState(false); // parent can't control this
  const [name, setName] = useState("");

  async function handleCreate() {
    await fetch("/api/properties", {        // raw fetch
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setOpen(false);                         // no cache invalidation, no navigation
  }

  return (
    <>
      <button onClick={() => setOpen(true)}>New</button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center"> {/* custom overlay instead of DaisyUI modal */}
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <button onClick={handleCreate}>Create</button>
        </div>
      )}
    </>
  );
}
```

---

### 4. Data Fetching with React Query

Use the typed `client` from `@/lib/api/hooks`, wrapped in React Query.

✅ **Do this** — typed query key, typed client, loading + error states:

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/api/hooks";

export function PropertiesGrid() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["properties"],
    queryFn: () => client.GET("/properties").then((r) => r.data),
  });

  if (isLoading) return <span className="loading loading-spinner loading-lg mx-auto" />;
  if (error) return <div className="alert alert-error">{String(error)}</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {data?.map((p) => <PropertyCard key={p.id} property={p} />)}
    </div>
  );
}
```

**With path params:**

```tsx
const { data: room } = useQuery({
  queryKey: ["rooms", roomId],
  queryFn: () =>
    client
      .GET("/properties/{property_id}/rooms/{room_id}", {
        params: { path: { property_id: propertyId, room_id: roomId } },
      })
      .then((r) => r.data),
});
```

**Mutations — invalidate on success:**

```tsx
const generate = useMutation({
  mutationFn: (body: { style: string; extra_context?: string }) =>
    client.POST("/rooms/{room_id}/generate", {
      params: { path: { room_id: roomId } },
      body,
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["rooms", roomId] });
  },
});
```

❌ **Not this** — raw fetch, `any`, no loading/error states, stale cache after mutation:

```tsx
// ❌ useEffect + fetch + any = no type safety, no caching, no error state
export function PropertiesGrid() {
  const [data, setData] = useState<any[]>([]);  // any — forbidden

  useEffect(() => {
    fetch("/api/properties").then((r) => r.json()).then(setData); // raw fetch, no error handling
  }, []);

  // no loading state, no error state — blank screen while fetching
  return <div>{data.map((p) => <div key={p.id}>{p.name}</div>)}</div>;
}
```

### 5. Auth

Read auth state from `AuthContext`:

```tsx
"use client";
import { useAuth } from "@/features/auth/AuthContext";

export function ProfileMenu() {
  const { session, signOut } = useAuth();
  if (!session) return null;

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
        <div className="w-8 rounded-full bg-primary text-primary-content grid place-items-center text-sm">
          {session.user.email?.[0].toUpperCase()}
        </div>
      </label>
      <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box shadow mt-2 w-48 p-2">
        <li><a href="/profile">Profile</a></li>
        <li><button onClick={signOut}>Sign out</button></li>
      </ul>
    </div>
  );
}
```

---

## API Client Rules

- Import `client` from `@/lib/api/hooks` — never write raw `fetch()` calls to the backend
- Never manually edit `src/lib/api/schema.d.ts` — regenerate with `just frontend:gen-api`
- Always type component props using `components["schemas"]["..."]` from the generated schema
- Run `just frontend:gen-api` after any backend schema or route change; commit the result

---

## Testing

Tests live in `frontend/tests/unit/` mirroring `src/` structure.

✅ **Do this** — asserts on what the user sees, tests interaction behavior, typed mock data:

```tsx
// tests/unit/features/properties/PropertyCard.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PropertyCard } from "@/features/properties/PropertyCard";
import type { components } from "@/lib/api/schema.d.ts";

type Property = components["schemas"]["PropertyResponse"];

const mockProperty: Property = {
  id: "prop-1",
  name: "Beachfront Villa",
  address: "123 Ocean Drive",
  room_count: 4,
  cover_image_url: null,
};

it("renders property name and address", () => {
  render(<PropertyCard property={mockProperty} />);
  expect(screen.getByText("Beachfront Villa")).toBeInTheDocument();
  expect(screen.getByText("123 Ocean Drive")).toBeInTheDocument();
});

it("links to property detail page", () => {
  render(<PropertyCard property={mockProperty} />);
  expect(screen.getByRole("link")).toHaveAttribute("href", "/properties/prop-1");
});
```

❌ **Not this** — tests internal state, uses `any`, asserts on CSS class instead of visible output:

```tsx
// ❌ testing implementation details (useState value, className) instead of user-visible behavior
it("sets selected state on click", async () => {
  const { container } = render(<PropertyCard property={mockProperty as any} />);
  const card = container.querySelector(".card"); // fragile: CSS selector, not semantic role
  await userEvent.click(card!);
  expect(card).toHaveClass("card-selected"); // tests internal styling, not behavior
});
```

**Rules:**
- Test what the user sees and does — not implementation details
- Every new component gets a unit test
- Mock `@/lib/api/hooks` at the module level, not individual fetch calls

---

## Boundaries

|     | Rule                                                                                   |
| --- | -------------------------------------------------------------------------------------- |
| ✅  | Run `just frontend:check` before marking any task done                             |
| ✅  | Use DaisyUI classes; avoid raw Tailwind soups when a DaisyUI component fits            |
| ✅  | Add `"use client"` to every interactive component                                      |
| ✅  | Run `just frontend:gen-api` after any backend schema change; commit the result     |
| ✅  | Write a unit test for every new component                                              |
| ⚠️  | **Ask first:** adding a new npm/bun dependency                                         |
| ⚠️  | **Ask first:** modifying auth logic in `AuthContext.tsx` or the protected route layout |
| ⚠️  | **Ask first:** changing env variable names or `lib/config.ts`                          |
| 🚫  | Never write raw `fetch()` calls to backend endpoints                                   |
| 🚫  | Never manually edit `src/lib/api/schema.d.ts`                                          |
| 🚫  | Never use `any` in TypeScript                                                           |
| 🚫  | Never use `npm`, `yarn`, or `pnpm`                                                     |
| 🚫  | Never skip error and loading states in data-fetching components                        |
| 🚫  | Never delete a failing test to make the suite pass — fix the root cause                |
