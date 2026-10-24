from pydantic import BaseModel, Field
from typing import List, Dict, Any

class SkillRadarItem(BaseModel):
    skill: str
    proficiency_score: float # 0 to 100

class GrowthRoadmapStep(BaseModel):
    milestone: str
    actionable_advice: str
    resources: List[str]

class StudentReportResponse(BaseModel):
    session_id: str
    strengths: List[str]
    weaknesses: List[str]
    skill_radar: List[SkillRadarItem]
    growth_roadmap: List[GrowthRoadmapStep]


class ExecutiveReportResponse(BaseModel):
    session_id: str
    hiring_recommendation: str
    composite_score: str
    risk_flags: List[str]
    transcript_summary: str


class LoopholesProsperitySchema(BaseModel):
    """Deep structural schema for analyzing code/interview logic loopholes and technical prosperity."""
    loopholes_detected: List[str] = Field(..., description="Logical or architectural edge cases missed by candidate")
    prosperity_score: float = Field(..., description="Overall scalability and code resilience rating")
    suggested_refactors: List[str] = Field(..., description="Concrete code improvements")