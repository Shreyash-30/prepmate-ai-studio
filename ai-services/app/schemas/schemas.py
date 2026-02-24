"""
Pydantic schemas for structured LLM responses
All LLM endpoints must return validated JSON matching these schemas
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict

# ============================================================================
# HINT GENERATION SCHEMA
# ============================================================================

class HintResponse(BaseModel):
    """Structured hint response"""
    level: int = Field(..., ge=1, le=4, description="Hint level (1-4)")
    hintText: str = Field(..., min_length=10, description="Hint content")
    dependencyWeight: float = Field(..., ge=0, le=1, description="Dependency impact (0-1)")
    approachDirection: Optional[str] = None
    keyInsight: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "level": 1,
                "hintText": "Think about what data structure would help you look up values quickly",
                "dependencyWeight": 0.3,
                "approachDirection": "Consider using a hash-based approach",
                "keyInsight": "The key is to track previously seen elements"
            }
        }


# ============================================================================
# CODE REVIEW SCHEMA
# ============================================================================

class CodeQualityScores(BaseModel):
    """Code quality assessment scores"""
    readability: float = Field(..., ge=0, le=1, description="Readability score")
    structure: float = Field(..., ge=0, le=1, description="Code structure")
    naming: float = Field(..., ge=0, le=1, description="Variable/function naming")
    errorHandling: float = Field(..., ge=0, le=1, description="Error handling quality")
    optimization: float = Field(..., ge=0, le=1, description="Algorithm optimization")
    
    class Config:
        json_schema_extra = {
            "example": {
                "readability": 0.8,
                "structure": 0.75,
                "naming": 0.85,
                "errorHandling": 0.7,
                "optimization": 0.6
            }
        }


class CodeReviewResponse(BaseModel):
    """Structured code review response"""
    reviewSummary: str = Field(..., description="High-level review summary")
    codeQualityScores: CodeQualityScores
    interviewInsights: str = Field(..., description="Insights for interview preparation")
    improvements: List[str] = Field(default=[], description="Specific improvements")
    strengths: List[str] = Field(default=[], description="Code strengths")
    redFlags: Optional[List[str]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "reviewSummary": "Good approach with room for optimization",
                "codeQualityScores": {
                    "readability": 0.8,
                    "structure": 0.75,
                    "naming": 0.85,
                    "errorHandling": 0.7,
                    "optimization": 0.6
                },
                "interviewInsights": "You demonstrated solid problem-solving. Consider discussing trade-offs between space and time complexity.",
                "improvements": ["Add input validation", "Consider edge cases with empty arrays"],
                "strengths": ["Clear variable names", "Proper use of helper functions"]
            }
        }


# ============================================================================
# EXPLANATION SCORING SCHEMA
# ============================================================================

class ExplanationScoreResponse(BaseModel):
    """Structured explanation scoring"""
    clarity: float = Field(..., ge=0, le=1, description="Explanation clarity")
    correctness: float = Field(..., ge=0, le=1, description="Technical correctness")
    structure: float = Field(..., ge=0, le=1, description="Logical structure")
    interview_readiness: float = Field(..., ge=0, le=1, description="Interview readiness")
    explanation_quality_score: float = Field(..., ge=0, le=1, description="Overall quality")
    feedback: Optional[str] = None
    suggestions: List[str] = Field(default=[], description="Improvement suggestions")
    
    class Config:
        json_schema_extra = {
            "example": {
                "clarity": 0.85,
                "correctness": 0.9,
                "structure": 0.8,
                "interview_readiness": 0.75,
                "explanation_quality_score": 0.825,
                "feedback": "Strong explanation with clear step-by-step walkthrough",
                "suggestions": ["Add complexity analysis", "Mention handling edge cases"]
            }
        }


# ============================================================================
# INLINE ASSIST SCHEMA
# ============================================================================

class InlineSuggestion(BaseModel):
    """Real-time inline code suggestion"""
    suggestionText: str = Field(..., max_length=500, description="Suggested code or text")
    confidence: float = Field(..., ge=0, le=1, description="Confidence in suggestion")
    type: str = Field(default="hint", description="Type: hint, refactoring, idiom, bug_fix")
    codeSnippet: Optional[str] = None
    explanation: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "suggestionText": "Consider using a hash set for O(1) lookups",
                "confidence": 0.85,
                "type": "optimization",
                "codeSnippet": "seen = set()",
                "explanation": "Hash sets provide constant-time lookups"
            }
        }


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class HintGenerationRequest(BaseModel):
    """Request to generate a hint"""
    sessionId: str
    problemStatement: str
    currentCode: Optional[str] = None
    hintLevel: int = Field(default=1, ge=1, le=4)
    language: str = Field(default="javascript")
    topicId: Optional[str] = None


class CodeReviewRequest(BaseModel):
    """Request for code review"""
    sessionId: str
    code: str
    language: str = Field(default="javascript")
    problemStatement: str
    testCasesPassed: Optional[int] = None
    totalTestCases: Optional[int] = None


class ExplanationScoringRequest(BaseModel):
    """Request to score explanation"""
    sessionId: str
    explanation: str
    code: str
    correctSolution: bool = False
    interviewContext: Optional[str] = None


class InlineAssistRequest(BaseModel):
    """Request for inline assistance"""
    sessionId: str
    codeChunk: str = Field(..., max_length=1500)
    cursorPosition: Optional[int] = None
    context: Optional[str] = None
    language: str = Field(default="javascript")


# ============================================================================
# STREAMING RESPONSE SCHEMAS
# ============================================================================

class StreamingToken(BaseModel):
    """Single token in streaming response"""
    token: str
    type: str = Field(default="text")  # text, code, metadata


class StreamingComplete(BaseModel):
    """Marks end of stream"""
    complete: bool = True
    totalTokens: Optional[int] = None


# ============================================================================
# HEALTH CHECK SCHEMAS
# ============================================================================

class ProviderStatus(BaseModel):
    """Status of a single LLM provider"""
    name: str
    available: bool
    latency: Optional[float] = None
    lastError: Optional[str] = None


class HealthResponse(BaseModel):
    """AI service health check"""
    status: str = Field(default="healthy")  # healthy, degraded, unhealthy
    providers: Dict[str, ProviderStatus]
    timestamp: str


# ============================================================================
# METRICS SCHEMAS
# ============================================================================

class MetricsResponse(BaseModel):
    """System metrics"""
    llmCalls: int
    totalTokens: int
    totalCost: float
    avgLatency: float
    successRate: float
    failedCalls: int
    providersUsed: List[str]
