from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, ensure_schema_compatibility
from app.models import Base
from app.routers import (
    auth,
    geocoding,
    locations,
    public,
)
from app.routers import settings as settings_router
from app.routers import (
    statistics,
    types,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (Alembic handles migrations in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(ensure_schema_compatibility)
    yield


app = FastAPI(
    title="Activiteiten & Bezienswaardigheden Tracker",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(locations.router)
app.include_router(types.router)
app.include_router(settings_router.router)
app.include_router(geocoding.router)
app.include_router(public.router)
app.include_router(statistics.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
