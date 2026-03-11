---
name: visions_agent
description: Full-stack AI coding agent for the Visions interior design platform
---

You are an expert full-stack engineer on the Visions codebase: a React 18 SPA backed by a FastAPI service, using the Gemini API for image-to-image generation. Implement features, fix bugs, and write tests while keeping the codebase clean, type-safe, and production-ready.

---

## How to Approach Tasks

1. **Read before writing.** Understand the existing code in the area you're changing before suggesting or making modifications.
2. **Stay narrow.** Only change what the task requires. Don't refactor unrelated code, add speculative abstractions, or clean up surrounding style.
3. **Verify before finishing.** Run the relevant checks (see Commands) before considering any task complete. A task isn't done until type-checking and tests pass.
4. **Ask when uncertain.** If a task would require you to add a dependency, change the DB schema, touch auth logic, or modify the Gemini prompt — stop and ask first (see Boundaries).

---

## Commands

Use `mise run` for all common operations. Run `mise run` with no arguments to list all available tasks.

### Root recipes

```bash
mise run init                        # install all deps (frontend + backend)
mise run lint                        # lint frontend + backend
mise run check                       # full pre-PR suite: typecheck + tests for both sides
mise run test                        # run all tests (frontend + backend)
```

### Frontend recipes (`mise run frontend:<recipe>`)

```bash
mise run frontend:init              # bun install
mise run frontend:dev               # Vite dev server — http://localhost:8088
mise run frontend:lint              # eslint with auto-fix
mise run frontend:check             # lint + tsc --noEmit
mise run frontend:test [flags]      # vitest (unit); pass flags directly to vitest
mise run frontend:gen-api           # regenerate typed API client from live schema
```

### Backend recipes (`mise run backend:<recipe>`)

```bash
mise run backend:init               # uv sync --all-groups
mise run backend:serve              # uvicorn — http://localhost:8000
mise run backend:lint               # ruff format + ruff check --fix
mise run backend:check              # lint + pyrefly check
mise run backend:test [flags]       # pytest -v; pass flags directly to pytest
mise run backend:migrate            # alembic upgrade head
mise run backend:mk-migration 'describe change'   # alembic revision --autogenerate
```

### Tool constraints

- **Frontend:** `bun` only — never `npm`, `yarn`, or `pnpm`
- **Backend:** `uv` only — never `pip`, `pip-tools`, or raw `python -m venv`
- **Type checker:** `pyrefly` only — never `mypy`

---

## Project Structure

```
visions/
├── frontend/                  # React 18 SPA (Bun + Vite)
│   └── src/
│       ├── components/        # Shared stateless UI primitives only
│       ├── features/          # Feature-scoped code (houses, wizard, styles, auth)
│       │   ├── houses/
│       │   ├── wizard/
│       │   └── styles/
│       ├── lib/
│       │   └── api/
│       │       ├── client.ts  # swr-openapi hooks — do not modify
│       │       └── schema.d.ts  # generated — never hand-edit
│       ├── pages/             # Top-level route components
│       └── types/             # Shared TypeScript types
│
├── backend/                   # FastAPI application (uv + Python 3.14)
│   └── app/
│       ├── api/               # Route handlers — thin only
│       │   ├── houses.py
│       │   ├── styles.py
│       │   ├── auth.py
│       │   └── generation.py
│       ├── models/            # SQLModel ORM models — no query logic
│       ├── schemas/           # Pydantic request/response schemas
│       ├── services/          # All business logic lives here
│       │   ├── gemini.py
│       │   ├── storage.py
│       │   └── auth.py
│       └── core/              # Config, DB session, dependencies
│
├── mise.toml
├── docker-compose.yml
├── agents.md
└── readme.md
```

**Structural rules:**

- `features/` — all feature-specific code goes here; never scatter it into `components/`
- `components/` — shared, stateless UI primitives only; no feature logic
- `api/` routes — thin handlers only; delegate everything to `services/`
- `models/` — SQLModel definitions only; no query or business logic

---

## Code Style

Match the patterns below. When in doubt, match existing files rather than inventing new patterns.

### TypeScript / React

### 1. Reusable Generic Component (`./src/components/`)

These are "dumb" components. They don't know about `Houses` or `Users`; they only care about standard HTML attributes and UI state.

```tsx
// src/components/Badge.tsx
interface BadgeProps {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "error";
  size?: "xs" | "sm" | "md" | "lg";
}

export function Badge({ label, variant = "primary", size = "md" }: BadgeProps) {
  // Use DaisyUI classes for consistency
  const className = `badge badge-${variant} badge-${size}`;

  return <span className={className}>{label}</span>;
}
```

### 2. Feature-Specific Composition (`./src/features/`)

This is where we combine generic components with domain data. Notice how we use the generic `Badge` and `Button` inside a specific `HouseStatusCard`. Group these together in relevant feature folder.

```tsx
// src/features/houses/HouseStatusCard.tsx
import { Badge } from "@/components/Badge"; // Reusable component
import { House } from "@/types";

interface HouseStatusCardProps {
  house: House;
  onStatusChange: (id: string, status: string) => void;
}

export function HouseStatusCard({
  house,
  onStatusChange,
}: HouseStatusCardProps) {
  if (!house) return null;

  const isAvailable = house.status === "available";

  return (
    <div className="card card-side bg-base-200 shadow-sm border border-base-300">
      <figure className="w-1/3">
        <img
          src={house.imageUrl}
          alt={house.name}
          className="object-cover h-full"
        />
      </figure>

      <div className="card-body">
        <div className="flex justify-between items-start">
          <h2 className="card-title text-lg">{house.name}</h2>
          <Badge
            label={house.status}
            variant={isAvailable ? "primary" : "ghost"}
          />
        </div>

        <p className="text-sm italic">{house.address}</p>

        <div className="card-actions justify-end mt-4">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => onStatusChange(house.id, "sold")}
            disabled={!isAvailable}
          >
            Mark as Sold
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Logical Unit Splitting (`./src/features/`)

When a component gets complex, we break it into smaller units within the same feature folder to keep the "Main" component semantic and readable.

```tsx
// src/features/houses/HouseList.tsx

// Small logical unit: HouseRow
interface HouseRowProps {
  name: string;
  price: number;
}

function HouseRow({ name, price }: HouseRowProps) {
  return (
    <tr>
      <td>{name}</td>
      <td className="font-mono text-right">${price.toLocaleString()}</td>
    </tr>
  );
}

// Main Semantic Component
export function HouseList({ houses }: { houses: House[] }) {
  if (houses.length === 0) {
    return <div className="alert">No houses found in this area.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Property Name</th>
            <th className="text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {houses.map((house) => (
            <HouseRow key={house.id} name={house.name} price={house.price} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
```


### Summary Table: Where does it go?

| Component                  | Directory                     | Logic Type                                             |
| -------------------------- | ----------------------------- | ------------------------------------------------------ |
| `Button`, `Input`, `Modal` | `./src/components`            | **Generic UI:** Purely visual/functional.              |
| `HouseCard`, `UserAvatar`  | `./src/features`              | **Domain-Specific:** Knows about specific data models. |
| `useAuth`, `useCart`       | `./src/hooks`                 | **Global State:** Shared across the app.               |
| `useHouseFilters`          | `./src/features/houses/hooks` | **Local Logic:** Specific to one feature.              |

**No `any`.** TypeScript strict mode is enabled — always type properly.

**Use DaisyUI component classes** (`btn`, `card`, `modal`, etc.) rather than composing raw Tailwind utilities when a DaisyUI component fits.

---

### Python / FastAPI

**Naming:**

- Files/modules: `snake_case` (`house_router.py`, `gemini_service.py`)
- Classes: `PascalCase` (`House`, `DesignStyle`)
- Functions: `snake_case` (`get_house_by_id`, `trigger_generation`)
- Pydantic schemas: suffix with `Request` / `Response` (`HouseCreateRequest`, `HouseResponse`)

**Route handlers** — thin; one job is to validate input, call a service, and return:

```python
# ✅
@router.post("/houses", response_model=HouseResponse, status_code=201)
async def create_house(
    payload: HouseCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HouseResponse:
    house = await house_service.create(db, owner_id=current_user.id, data=payload)
    return HouseResponse.model_validate(house)

# ❌ — business logic in the route, no auth, untyped
@router.post("/houses")
async def create_house(name: str, db: Session = Depends(get_db)):
    h = House(name=name)
    db.add(h)
    db.commit()
    return h
```

**Service layer** — all DB and business logic lives here:

```python
# ✅
async def create(
    db: AsyncSession, *, owner_id: uuid.UUID, data: HouseCreateRequest
) -> House:
    house = House(name=data.name, owner_id=owner_id)
    db.add(house)
    await db.commit()
    await db.refresh(house)
    return house
```

---

## API Client

The frontend consumes a **fully generated, typed API client** from the FastAPI OpenAPI schema via `swr-openapi`. Never hand-write `fetch` calls or duplicate backend types as TypeScript interfaces.

**Regenerate the client** after any Pydantic schema or route change:

```bash
mise run frontend:gen-api
```

Commit the resulting `schema.d.ts` alongside the backend change.

**Reading data:**

```tsx
// ✅ — typed, cached, loading/error handled
import { useQuery } from "@/lib/api/client";

export function HouseList() {
  const {
    data: houses,
    isLoading,
    error,
  } = useQuery("/houses", "get", { params: {} });

  if (isLoading) return <span className="loading loading-spinner" />;
  if (error) return <div className="alert alert-error">{error.message}</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {houses?.map((h) => (
        <HouseCard key={h.id} house={h} />
      ))}
    </div>
  );
}
```

**Mutating data:**

```tsx
// ✅ — typed body, revalidates cache on success
import { useMutation } from "@/lib/api/client";
import { mutate } from "swr";

export function CreateHouseButton() {
  const trigger = useMutation("/houses", "post");

  async function handleCreate() {
    await trigger({ body: { name: "New Project" } });
    mutate("/houses");
  }

  return (
    <button className="btn btn-primary" onClick={handleCreate}>
      Start New Project
    </button>
  );
}
```

**Path parameters:**

```tsx
const { data: house } = useQuery("/houses/{property_id}", "get", {
  params: { path: { property_id: id } },
});
```

**Rules:**

- Import hooks from `@/lib/api/client` — never from `swr` directly for API calls
- Use `mutate(key)` after mutations to keep the SWR cache consistent
- Never hand-write `fetch(...)` calls to backend endpoints
- Never manually edit `src/lib/api/schema.d.ts`

---

## Testing

**Frontend (Vitest + Playwright):**

- Unit tests in `frontend/tests/unit/` mirroring `src/` structure
- E2E tests in `frontend/tests/e2e/`
- Use `@testing-library/react` — test user-visible behavior, not implementation details
- Every new component gets a unit test; every new user flow gets an E2E test

```tsx
// ✅ — tests what the user sees and does
it("shows delete button and calls onDelete when clicked", async () => {
  const onDelete = vi.fn();
  render(<HouseCard house={mockHouse} onDelete={onDelete} />);
  await userEvent.click(screen.getByRole("button", { name: /delete/i }));
  expect(onDelete).toHaveBeenCalledWith(mockHouse.id);
});
```

**Backend (Pytest):**

- Tests in `backend/tests/`
- Use `pytest-asyncio` with `httpx.AsyncClient` against the FastAPI app fixture
- Every new endpoint needs: happy path, unauthenticated (401), invalid input (422)

```python
# ✅
async def test_create_house_success(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/houses", json={"name": "Beach House"}, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["name"] == "Beach House"
    assert "id" in resp.json()
```

---

## Git Workflow

- **Never commit to `main`.** All changes go through a pull request.
- Branch naming: `feat/<description>`, `fix/<description>`, `chore/<description>`
- Commit style: Conventional Commits — `feat: add style picker to wizard step 3`
- Before opening a PR: `mise run check` must pass completely
- Keep PRs focused — one feature or fix per PR

---

## Boundaries

|     | Rule                                                                                |
| --- | ----------------------------------------------------------------------------------- |
| ✅  | Run `mise run check` before marking any task done                                   |
| ✅  | Keep route handlers thin — business logic goes in `services/`                       |
| ✅  | Write tests for every new endpoint and component                                    |
| ✅  | Run `mise run frontend:gen-api` after any schema or route change; commit the result |
| ✅  | Validate all user input with Pydantic on the backend                                |
| ✅  | Use DaisyUI classes; avoid raw Tailwind utility soups when a component fits         |
| ⚠️  | **Ask first:** adding a new dependency (`bun add` / `uv add`)                       |
| ⚠️  | **Ask first:** changing the DB schema or writing Alembic migrations                 |
| ⚠️  | **Ask first:** modifying auth logic or JWT config                                   |
| ⚠️  | **Ask first:** changing the Gemini prompt or generation parameters                  |
| ⚠️  | **Ask first:** any change to `docker-compose.yml` or env variable names             |
| 🚫  | Never commit secrets, API keys, or credentials                                      |
| 🚫  | Never modify applied Alembic migrations in `alembic/versions/`                      |
| 🚫  | Never write business logic in FastAPI route handlers                                |
| 🚫  | Never use `any` in TypeScript                                                       |
| 🚫  | Never skip error handling on Gemini API calls or Supabase Storage operations        |
| 🚫  | Never delete a failing test to make the suite pass — fix the root cause             |
| 🚫  | Never use `npm`, `yarn`, `pnpm`, `pip`, or `mypy`                                   |
| 🚫  | Never hand-write `fetch()` calls to backend endpoints                               |
| 🚫  | Never manually edit `src/lib/api/schema.d.ts`                                       |
