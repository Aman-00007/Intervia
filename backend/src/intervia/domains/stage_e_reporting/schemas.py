from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class SkillRadarItem(BaseModel):
    skill: str
    proficiency_score: Optional[float] = 85.0
    score: Optional[float] = None

class GrowthRoadmapStep(BaseModel):
    milestone: Optional[str] = "Next Milestone"
    actionable_advice: Optional[str] = ""
    resources: Optional[List[str]] = []
    phase: Optional[str] = None
    action: Optional[str] = None

class StudentReportResponse(BaseModel):
    session_id: str
    strengths: List[str]
    weaknesses: List[str]
    skill_radar: List[Dict[str, Any]]
    growth_roadmap: List[Dict[str, Any]]

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
