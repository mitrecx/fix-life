from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.mcp.server import mcp_app


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with mcp_app.lifespan(app):
        yield


app = FastAPI(
    title="Fix Life API",
    description="生活计划管理系统 API - 帮助你追踪年度、月度、每日目标",
    version="1.0.0",
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
app.mount("/mcp", mcp_app)


@app.get("/")
async def root():
    return {
        "message": "Welcome to Fix Life API",
        "docs": "/docs",
        "redoc": "/redoc",
        "mcp": "/mcp",
        "version": "1.0.0",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "fix-life-api"}
