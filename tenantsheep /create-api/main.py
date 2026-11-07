import os
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import Base, engine, wait_for_db
from routers import auth, projects

# Wait for Postgres to actually be ready before trying to create tables --
# see wait_for_db()'s docstring for why depends_on alone isn't enough.
wait_for_db()
Base.metadata.create_all(bind=engine)

# CHALLENGE 7 -- staging/prod drift, SoW section 4.2. DEBUG defaults to true
# (the "staging" posture: /docs and /redoc exposed, wide-open CORS, stack
# traces in error responses). Set DEBUG=false in docker-compose to see what
# the production posture should look like instead.
DEBUG = os.getenv("DEBUG", "true").lower() == "true"

app = FastAPI(
    title="TenantSheep Create API",
    docs_url="/docs" if DEBUG else None,
    redoc_url="/redoc" if DEBUG else None,
    openapi_url="/openapi.json" if DEBUG else None,
)

if DEBUG:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://app.tenantsheep.example"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT"],
        allow_headers=["Authorization", "Content-Type"],
    )

app.include_router(auth.router)
app.include_router(projects.router)


@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    if DEBUG:
        return JSONResponse(
            status_code=500,
            content={"error": str(exc), "traceback": traceback.format_exc()},
        )
    return JSONResponse(status_code=500, content={"error": "internal server error"})


@app.get("/health")
def health():
    return {"ok": True, "debug_mode": DEBUG}
