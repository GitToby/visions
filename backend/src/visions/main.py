import time
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger
from pydantic import BaseModel

from visions.api import auth, generation, property, styles
from visions.core.config import SETTINGS

app = FastAPI(
    title=SETTINGS.app_name,
    version="0.1.0",
)


app = FastAPI()


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "{method} {path} → {status} ({elapsed:.1f}ms)",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        elapsed=elapsed_ms,
    )
    return response


app.include_router(auth.router)
app.include_router(property.router)
app.include_router(styles.router)
app.include_router(generation.router)

_static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=_static_dir), name="static")


class HealthCheckResponse(BaseModel):
    status: Literal["ok"] = "ok"


@app.get("/health", tags=["meta"])
async def health() -> HealthCheckResponse:
    return HealthCheckResponse()


app.add_middleware(
    CORSMiddleware,
    allow_origins=SETTINGS.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
