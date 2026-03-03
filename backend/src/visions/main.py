from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from visions.api import auth, generation, houses, styles
from visions.core.config import settings

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(houses.router)
app.include_router(styles.router)
app.include_router(generation.router)


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("visions.main:app", host="0.0.0.0", port=8000, reload=True)
