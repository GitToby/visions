# Visions

AI-powered interior design ideation. Upload photos of your rooms, pick a design aesthetic, and get back AI-generated reimaginings of the space.

---

## Concept

Most people struggle to visualise what a room could look like in a different style before committing to it. Visions bridges that gap: give it a photo and a style direction, and it produces a realistic rendering of the space redesigned in that aesthetic — all without touching a single piece of furniture.

The core loop is:

1. Create a **House** — a named project grouping your rooms together
2. Upload **Room** photos into that project
3. Pick one or more **Styles** to apply
4. Visions generates a redesigned version of every room × style combination

---

## Parts

### Properties

A property is the top-level unit of organisation. It represents a single property or project — "Beach Cottage Reno", "New Apartment", etc. Everything else (rooms and generated designs) belongs to a property.

The dashboard shows all your properties as a grid of cards. From there you can open an existing project or start a new one through the wizard.

### Rooms

Rooms are the source material. Inside a property you upload photos of the actual spaces you want to redesign — living room, kitchen, bedroom, and so on. Each uploaded photo becomes a Room.

The AI uses the room photo as its structural foundation: it preserves the layout, proportions, windows, and architectural features while replacing the surface treatments and furnishings.

### Styles

Styles are the design direction applied to rooms. Visions ships with a curated library of movements — Japandi, Industrial, Mid-Century Modern, Coastal, and others — each with a written description that guides the AI.

You can also create **Custom Styles**: give a style a name, write a description of the aesthetic you have in mind, and optionally attach a reference image. Custom styles work identically to built-in ones once created.

### Generations

When you trigger a generation, Visions creates one output for every Room × Style combination in the project. A project with 3 rooms and 2 styles produces 6 generated images.

The generation pipeline sends each room photo and the style description to the Gemini image-to-image API. Results appear in the project's gallery view alongside the original photos, grouped by style.

### Authentication

Users sign in with Google. The frontend authenticates through Supabase Auth and receives a JWT. The backend validates that token on every request — no passwords, no session state on the server.

---

## Architecture

```
Browser (React SPA)
    │  Google OAuth → Supabase Auth → JWT
    │  REST API calls (typed swr-openapi hooks)
    ▼
FastAPI (Python)
    │  Validates JWT (PyJWT / Supabase secret)
    │  Stores data in PostgreSQL (SQLModel + Alembic)
    │  Stores files in Supabase Storage
    │  Calls Gemini API for image generation
    ▼
External Services
    ├── Supabase (Auth + Storage + Postgres)
    └── Google Gemini API
```

The frontend is a pure client-side SPA — no server-side rendering. The Vite build output is a static bundle that can be served from any CDN. All data fetching happens via typed hooks generated from the FastAPI OpenAPI schema.

---

## Tech

| Layer         | Choice                                              |
| ------------- | --------------------------------------------------- |
| Frontend      | React 18, TypeScript strict, Vite, Bun              |
| UI            | DaisyUI on Tailwind CSS, Lucide icons               |
| Data fetching | swr-openapi (generated from FastAPI schema)         |
| Backend       | FastAPI, Python 3.14, uv                            |
| ORM / DB      | SQLModel, PostgreSQL, Alembic                       |
| Auth          | Supabase Auth (Google OAuth), PyJWT                 |
| Storage       | Supabase Storage                                    |
| AI            | Google Gemini API (image-to-image)                  |
| Dev tooling   | mise (task runner), Docker Compose (local postgres) |

---

## Getting Started

```bash
# Install all dependencies
mise run install

# Start the database (Docker required for local dev)
mise run docker:up
mise run docker:migrate

# Run dev servers
mise run backend:dev   # http://localhost:8000
mise run frontend:dev  # http://localhost:5173
```

Copy `.env.example` to `.env` and fill in your Supabase project URL, keys, and Gemini API key before starting.

See `agents.md` for the full development guide: commands, code conventions, testing requirements, and contribution rules.
