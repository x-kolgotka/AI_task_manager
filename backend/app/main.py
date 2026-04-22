from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, tasks, subtasks, ai


def create_app() -> FastAPI:
    app = FastAPI(title="AI Task Manager")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router)
    app.include_router(tasks.router)
    app.include_router(subtasks.router)
    app.include_router(ai.router)

    @app.get("/api/health")
    def health():
        return {"ok": True}

    return app


app = create_app()
