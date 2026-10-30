import importlib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Intervia API",
    description="Privacy-First, Offline-Resilient Technical Interview Platform powered by Nebius & Nemotron 3",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dynamic Router Loader: safely mounts routers as Aman and Devangee build them on separate branches
DOMAIN_ROUTERS = [
    # NEW MODULES ADDED HERE
    ("intervia.domains.auth.router", "/v1/auth", ["Authentication"]),
    ("intervia.domains.invitations.router", "/v1/invitations", ["Invitations"]),
    ("intervia.domains.dashboard.router", "/v1/dashboard", ["Dashboard"]),
    
    # EXISTING MODULES
    ("intervia.domains.stage_a_onboarding.router", "/v1/onboarding", ["Stage A: Onboarding"]),
    ("intervia.domains.stage_b_workspace.router", "/v1/workspace", ["Stage B: Live Workspace"]),
    ("intervia.domains.stage_c_offline.router", "/v1/offline", ["Stage C: Offline Buffer"]),
    ("intervia.domains.stage_d_reconciliation.router", "/v1/reconnect", ["Stage D: Reconciliation"]),
    ("intervia.domains.stage_e_reporting.router", "/v1/reports", ["Stage E: Reporting"]),
]

for module_path, prefix, tags in DOMAIN_ROUTERS:
    try:
        mod = importlib.import_module(module_path)
        if hasattr(mod, "router"):
            app.include_router(mod.router, prefix=prefix, tags=tags)
    except ImportError as e:
        print(f"🚨 FAILED TO LOAD {module_path}: {e}") # <-- Changed this to print the error


@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "ok",
        "service": "intervia-backend",
        "version": "1.0.0",
    }