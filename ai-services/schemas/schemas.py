"""
Pydantic schemas for FastAPI AI services
Matches MongoDB collections for direct access and data interchange
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# Enums for type safety
class UserRole(str, Enum):
    STUDENT = "student"
    ADMIN = "admin"
    MENTOR = "mentor"

class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class PlatformType(str, Enum):
    LEETCODE = "leetcode"
    CODEFORCES = "codeforces"
    HACKERRANK = "hackerrank"
    INTERVIEWBIT = "interviewbit"
    CODECHEF = "codechef"
    GEEKSFORGEEKS = "geeksforgeeks"

class TaskType(str, Enum):
    PRACTICE = "practice"
    REVISION = "revision"
    LEARNING = "learning"
    MOCK_INTERVIEW = "mock-interview"
    CONCEPT_REVIEW = "concept-review"
    WEAK_TOPIC = "weak-topic"

# Base User Schema
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = UserRole.STUDENT
    targetCompanies: Optional[List[str]] = []
    preparationStartDate: Optional[datetime] = None
    preparationTargetDate: Optional[datetime] = None
    onboardingCompleted: bool = False

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str = Field(alias="_id")
    isEmailVerified: bool = False
    lastLogin: Optional[datetime] = None
    isActive: bool = True
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

# Platform Integration Schema
class PlatformProfileSchema(BaseModel):
    solvedProblems: Optional[int] = None
    totalSubmissions: Optional[int] = None
    acceptanceRate: Optional[float] = None
    ranking: Optional[int] = None
    badge: Optional[str] = None

class PlatformIntegrationBase(BaseModel):
    platformName: PlatformType
    username: str
    syncStatus: str = "pending"

class PlatformIntegrationResponse(PlatformIntegrationBase):
    id: str = Field(alias="_id")
    userId: str
    lastSyncTime: Optional[datetime] = None
    syncErrorMessage: Optional[str] = None
    profile: Optional[PlatformProfileSchema] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

# Problem Schema
class ProblemExample(BaseModel):
    input: str
    output: str
    explanation: Optional[str] = None

class ProblemBase(BaseModel):
    title: str
    difficulty: DifficultyLevel
    topics: List[str] = []
    platform: str
    url: Optional[str] = None
    description: Optional[str] = None

class ProblemResponse(ProblemBase):
    id: str = Field(alias="_id")
    externalId: Optional[str] = None
    constraints: Optional[List[str]] = []
    examples: Optional[List[ProblemExample]] = []
    acceptanceRate: Optional[float] = None
    submissionCount: int = 0
    isActive: bool = True
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

# Submission Schema
class SubmissionBase(BaseModel):
    problemId: str
    solved: bool = False
    attempts: int = 1
    timeTaken: int = 0
    hintUsed: bool = False

class SubmissionResponse(SubmissionBase):
    id: str = Field(alias="_id")
    userId: str
    hintCount: int = 0
    difficulty: Optional[DifficultyLevel] = None
    language: Optional[str] = None
    code: Optional[str] = None
    output: Optional[str] = None
    submissionTime: datetime
    score: Optional[int] = None
    memory: Optional[float] = None
    runtime: Optional[float] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

# Roadmap Schema
class TopicSchema(BaseModel):
    topicId: Optional[str] = None
    topicName: str
    priority: Optional[int] = None
    estimatedHours: Optional[int] = None
    resourceLinks: Optional[List[str]] = []

class RoadmapLayer(BaseModel):
    layerName: str
    topics: List[TopicSchema] = []

class RoadmapBase(BaseModel):
    roadmapName: str
    subject: str
    description: Optional[str] = None
    difficultyLevel: str = "beginner"

class RoadmapResponse(RoadmapBase):
    id: str = Field(alias="_id")
    estimatedDurationDays: Optional[int] = None
    layers: List[RoadmapLayer] = []
    isPublished: bool = False
    usageCount: int = 0
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

# Mastery Metrics Schema
class RecentPerformance(BaseModel):
    submissionId: Optional[str] = None
    correct: bool
    timestamp: datetime
    timeTaken: Optional[int] = None

class MasteryMetricResponse(BaseModel):
    id: str = Field(alias="_id")
    userId: str
    topicId: Optional[str] = None
    topicName: str
    masteryProbability: float = 0.0
    confidenceScore: int = 0
    retentionProbability: float = 0.0
    improvementTrend: str = "insufficient-data"
    problemsAttempted: int = 0
    problemsSolved: int = 0
    totalTimeSpent: int = 0
    recentPerformance: List[RecentPerformance] = []
    estimatedReadyDate: Optional[datetime] = None
    lastUpdated: datetime
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

# Weak Topic Signal Schema
class WeakTopicProblem(BaseModel):
    problemId: Optional[str] = None
    mistakeType: Optional[str] = None
    attemptCount: Optional[int] = None

class WeakTopicSignalResponse(BaseModel):
    id: str = Field(alias="_id")
    userId: str
    topicId: Optional[str] = None
    topicName: str
    mistakeRate: float = 0.0
    riskScore: int
    riskLevel: str
    signalType: List[str] = []
    problemsWithMistakes: List[WeakTopicProblem] = []
    lastDetectedAt: Optional[datetime] = None
    interventionRequired: bool = False
    suggestedActions: List[str] = []
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

# Preparation Task Schema
class PreparationTaskResponse(BaseModel):
    id: str = Field(alias="_id")
    userId: str
    taskType: TaskType
    topicId: Optional[str] = None
    topicName: Optional[str] = None
    difficultyLevel: Optional[DifficultyLevel] = None
    problemId: Optional[str] = None
    title: str
    description: Optional[str] = None
    estimatedDurationMinutes: Optional[int] = None
    priority: int = 3
    scheduledDate: Optional[datetime] = None
    dueDate: Optional[datetime] = None
    completed: bool = False
    completedAt: Optional[datetime] = None
    score: Optional[int] = None
    feedback: Optional[str] = None
    status: str = "pending"
    generatedBy: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

# Readiness Score Schema
class CompanyReadinessMetrics(BaseModel):
    readinessScore: int
    strongAreas: List[str]
    weakAreas: List[str]
    estimatedInterviewSuccess: float

class ReadinessScoreResponse(BaseModel):
    id: str = Field(alias="_id")
    userId: str
    overallReadinessScore: int = 0
    readinessLevel: Optional[str] = None
    companyReadiness: Optional[Dict[str, CompanyReadinessMetrics]] = {}
    subjectWiseReadiness: Optional[Dict[str, Dict]] = {}
    readinessTrend: Optional[str] = None
    estimatedReadyDate: Optional[datetime] = None
    topStrengths: List[str] = []
    topWeaknesses: List[str] = []
    recommendedFocus: List[str] = []
    calculatedAt: datetime
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

# Analytics Snapshot Schema
class MasteryDistribution(BaseModel):
    easy: Optional[Dict] = {}
    medium: Optional[Dict] = {}
    hard: Optional[Dict] = {}

class PreparationVelocity(BaseModel):
    problemsSolvedThisWeek: int = 0
    problemsSolvedThisMonth: int = 0
    problemsSolvedTotal: int = 0
    averageProblemsPerDay: float = 0.0

class WeakTopicItem(BaseModel):
    topicId: Optional[str] = None
    topicName: str
    riskScore: int

class AnalyticsSnapshotResponse(BaseModel):
    id: str = Field(alias="_id")
    userId: str
    snapshotDate: datetime
    masteryDistribution: MasteryDistribution
    consistencyScore: Optional[int] = None
    consistencyTrend: Optional[str] = None
    preparationVelocity: PreparationVelocity
    weakTopicCount: int = 0
    weakTopics: List[WeakTopicItem] = []
    readinessSnapshot: Optional[Dict] = {}
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

# Practice Session Schema
class ProblemPerformance(BaseModel):
    problemId: Optional[str] = None
    solved: bool
    timeTaken: int
    attempts: int
    score: Optional[int] = None

class AIInsights(BaseModel):
    strengths: List[str] = []
    areasForImprovement: List[str] = []
    recommendations: List[str] = []

class PracticeSessionResponse(BaseModel):
    id: str = Field(alias="_id")
    userId: str
    sessionType: str
    sessionName: Optional[str] = None
    problemIds: List[str] = []
    startTime: datetime
    endTime: Optional[datetime] = None
    durationMinutes: Optional[int] = None
    problemsSolved: int = 0
    problemsAttempted: int = 0
    successRate: Optional[float] = None
    score: Optional[int] = None
    topicsCovered: List[str] = []
    problemPerformance: List[ProblemPerformance] = []
    aiGeneratedInsights: Optional[AIInsights] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

# AI Mentor Conversation Schema
class ConversationMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime
    tokens: Optional[int] = None
    model: Optional[str] = None

class AIMentorConversationResponse(BaseModel):
    id: str = Field(alias="_id")
    userId: str
    conversationId: str
    conversationType: str = "general"
    contextTopic: Optional[str] = None
    contextProblemId: Optional[str] = None
    messageHistory: List[ConversationMessage] = []
    conversationSummary: Optional[str] = None
    keyConceptsCovered: List[str] = []
    userLearningLevel: Optional[int] = None
    helpfulnessRating: Optional[int] = None
    suggestedTopicsForFollowUp: List[str] = []
    totalMessages: int = 0
    totalTokens: int = 0
    isActive: bool = True
    lastMessageTime: datetime
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
