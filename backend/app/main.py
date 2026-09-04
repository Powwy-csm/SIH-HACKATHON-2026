from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ai_processing import router as ai_processing_router
from app.api.resume import router as resume_router
from app.api.student_ai import router as student_ai_router
from app.api.institution import router as institution_router
from app.api.industry import router as industry_router
from app.config import get_settings

app = FastAPI(
    title="SIH26044 Student AI Service",
    description="Backend AI service for the Student portal — profile analysis, "
    "opportunity matching, skill gap analysis, and improvement simulation, "
    "backed by Supabase.",
    version="0.1.0",
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(student_ai_router)
app.include_router(resume_router)
app.include_router(ai_processing_router)
app.include_router(institution_router)
app.include_router(industry_router)


@app.get("/health")
async def health():
    return {"status": "ok"}