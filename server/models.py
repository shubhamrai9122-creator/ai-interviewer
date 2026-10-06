import enum
import time
from typing import List, Optional, Dict, Any
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, Text, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from pydantic import BaseModel, Field

Base = declarative_base()

class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    FACULTY = "FACULTY"
    ADMIN = "ADMIN"

class VivaStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"

class SessionPhase(str, enum.Enum):
    WARMUP = "WARMUP"              # 0:00 - 1:00
    FUNDAMENTALS = "FUNDAMENTALS"  # 1:00 - 5:00
    DEPTH = "DEPTH"                # 5:00 - 10:00
    APPLIED = "APPLIED"            # 10:00 - 13:00
    WRAPUP = "WRAPUP"              # 13:00 - 14:30
    SCORING = "SCORING"            # 14:30 - 15:00
    COMPLETED = "COMPLETED"

class SessionStatus(str, enum.Enum):
    SETUP = "SETUP"
    IN_PROGRESS = "IN_PROGRESS"
    SCORING = "SCORING"
    COMPLETED = "COMPLETED"
    ABORTED = "ABORTED"

class QuestionType(str, enum.Enum):
    CONCEPT = "CONCEPT"
    WHY = "WHY"
    EDGE_CASE = "EDGE_CASE"
    TRADE_OFF = "TRADE_OFF"
    APPLIED = "APPLIED"
    DEBUGGING = "DEBUGGING"
    PROJECT = "PROJECT"

class AnswerQuality(str, enum.Enum):
    STRONG = "STRONG"
    CORRECT = "CORRECT"
    PARTIAL = "PARTIAL"
    SHALLOW = "SHALLOW"
    INCORRECT = "INCORRECT"
    NO_ANSWER = "NO_ANSWER"
    OFF_TOPIC = "OFF_TOPIC"

class FollowupAction(str, enum.Enum):
    DEEPER = "DEEPER"
    HINT = "HINT"
    MOVE_ON = "MOVE_ON"
    REDIRECT = "REDIRECT"

# --- Database Tables ---

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.STUDENT, nullable=False)
    created_at = Column(Float, default=time.time)

class Viva(Base):
    __tablename__ = "vivas"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    subject = Column(String(100), nullable=False)
    difficulty = Column(String(50), default="Medium")
    duration_minutes = Column(Integer, default=15)
    status = Column(SQLEnum(VivaStatus), default=VivaStatus.ACTIVE)
    created_by = Column(String(100), default="Faculty Coordinator")
    created_at = Column(Float, default=time.time)
    rubric_config = Column(JSON, default=dict)

    topics = relationship("Topic", back_populates="viva", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="viva", cascade="all, delete-orphan")
    sessions = relationship("VivaSession", back_populates="viva", cascade="all, delete-orphan")

class Topic(Base):
    __tablename__ = "topics"
    id = Column(Integer, primary_key=True, index=True)
    viva_id = Column(Integer, ForeignKey("vivas.id"), nullable=False)
    name = Column(String(100), nullable=False)
    weight = Column(Float, default=1.0)

    viva = relationship("Viva", back_populates="topics")
    questions = relationship("Question", back_populates="topic")

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    viva_id = Column(Integer, ForeignKey("vivas.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(SQLEnum(QuestionType), default=QuestionType.CONCEPT)
    difficulty = Column(Integer, default=2) # 1 to 5
    expected_concepts = Column(JSON, default=list) # List of keywords/concepts student must mention
    answer_key = Column(Text, nullable=True)
    parent_question_id = Column(Integer, nullable=True)
    branch_condition = Column(String(50), default="ROOT") # ROOT, CORRECT, STRONG, PARTIAL
    tree_depth = Column(Integer, default=1)
    is_terminal = Column(Boolean, default=False)
    source = Column(String(50), default="APPROVED_BANK") # APPROVED_BANK, AI_GENERATED_APPROVED
    status = Column(String(50), default="APPROVED") # APPROVED, PENDING

    viva = relationship("Viva", back_populates="questions")
    topic = relationship("Topic", back_populates="questions")

class VivaSession(Base):
    __tablename__ = "viva_sessions"
    id = Column(Integer, primary_key=True, index=True)
    viva_id = Column(Integer, ForeignKey("vivas.id"), nullable=False)
    student_id = Column(String(50), nullable=False, index=True)
    student_name = Column(String(100), nullable=False)
    started_at = Column(Float, default=time.time)
    ended_at = Column(Float, nullable=True)
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.SETUP)
    current_phase = Column(SQLEnum(SessionPhase), default=SessionPhase.WARMUP)
    elapsed_seconds = Column(Float, default=0.0)
    duration_minutes = Column(Integer, default=15) # 0 = unlimited, or faculty configured
    current_topic_id = Column(Integer, nullable=True)
    audio_url = Column(String(255), nullable=True)
    transcript_url = Column(String(255), nullable=True)
    final_score = Column(Float, nullable=True)
    confidence = Column(Float, default=1.0)
    flagged_for_review = Column(Boolean, default=False)
    flag_reason = Column(Text, nullable=True)
    scoring_prompt_version = Column(String(50), default="v1.0.0")
    examiner_persona = Column(String(50), default="aria")
    subject_domain = Column(String(100), default="Data Structures & Algorithms")
    interview_profile = Column(JSON, default=dict)
    interview_level = Column(String(50), default="Intermediate")
    preferred_domain = Column(String(50), default="dsa")

    viva = relationship("Viva", back_populates="sessions")
    questions_asked = relationship("QuestionAsked", back_populates="session", cascade="all, delete-orphan")
    answers = relationship("StudentAnswer", back_populates="session", cascade="all, delete-orphan")
    score = relationship("VivaScore", back_populates="session", uselist=False, cascade="all, delete-orphan")
    overrides = relationship("FacultyOverride", back_populates="session", cascade="all, delete-orphan")
    integrity_logs = relationship("IntegrityLog", back_populates="session", cascade="all, delete-orphan")

class QuestionAsked(Base):
    __tablename__ = "questions_asked"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("viva_sessions.id"), nullable=False)
    question_id = Column(Integer, nullable=True)
    question_text = Column(Text, nullable=False)
    timestamp_sec = Column(Float, nullable=False)
    phase = Column(SQLEnum(SessionPhase), nullable=False)
    question_type = Column(SQLEnum(QuestionType), default=QuestionType.CONCEPT)
    parent_question_id = Column(Integer, nullable=True)

    session = relationship("VivaSession", back_populates="questions_asked")
    answers = relationship("StudentAnswer", back_populates="question_asked")

class StudentAnswer(Base):
    __tablename__ = "answers"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("viva_sessions.id"), nullable=False)
    question_asked_id = Column(Integer, ForeignKey("questions_asked.id"), nullable=False)
    transcript = Column(Text, nullable=False)
    start_time_sec = Column(Float, nullable=False)
    end_time_sec = Column(Float, nullable=False)
    answer_quality = Column(SQLEnum(AnswerQuality), default=AnswerQuality.CORRECT)
    followup_action = Column(SQLEnum(FollowupAction), default=FollowupAction.DEEPER)
    detected_concepts = Column(JSON, default=list)
    missing_concepts = Column(JSON, default=list)
    latency_ms = Column(Float, default=0.0)
    audio_chunk_url = Column(String(255), nullable=True)
    wpm = Column(Float, nullable=True)
    filler_words = Column(JSON, default=dict)
    fluency_score = Column(Float, nullable=True)
    code_snippet = Column(Text, nullable=True)

    session = relationship("VivaSession", back_populates="answers")
    question_asked = relationship("QuestionAsked", back_populates="answers")

class VivaScore(Base):
    __tablename__ = "scores"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("viva_sessions.id"), nullable=False, unique=True)
    conceptual = Column(Float, nullable=False)      # 0 to 5, Weight: 30%
    depth = Column(Float, nullable=False)            # 0 to 5, Weight: 25%
    problem_solving = Column(Float, nullable=False)  # 0 to 5, Weight: 20%
    practical = Column(Float, nullable=False)        # 0 to 5, Weight: 15%
    communication = Column(Float, nullable=False)    # 0 to 5, Weight: 10%
    total_score = Column(Float, nullable=False)      # Out of 100
    dsa_score = Column(Float, default=0.0)           # Out of 100
    web_dev_score = Column(Float, default=0.0)       # Out of 100
    problem_solving_10 = Column(Float, default=0.0)  # /10
    communication_10 = Column(Float, default=0.0)    # /10
    technical_depth_10 = Column(Float, default=0.0)  # /10
    code_quality_10 = Column(Float, default=0.0)     # /10
    complexity_analysis_10 = Column(Float, default=0.0) # /10
    debugging_10 = Column(Float, default=0.0)        # /10
    adaptability_10 = Column(Float, default=0.0)     # /10
    confidence = Column(Float, default=0.95)
    feedback = Column(Text, nullable=True)           # Detailed evaluation summary
    evaluation_report = Column(JSON, default=dict)   # Full Section 17 report
    scoring_prompt_version = Column(String(50), default="v1.0.0")
    created_at = Column(Float, default=time.time)

    session = relationship("VivaSession", back_populates="score")
    evidences = relationship("ScoreEvidence", back_populates="score", cascade="all, delete-orphan")

class ScoreEvidence(Base):
    __tablename__ = "score_evidence"
    id = Column(Integer, primary_key=True, index=True)
    score_id = Column(Integer, ForeignKey("scores.id"), nullable=False)
    dimension = Column(String(50), nullable=False)
    dimension_score = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    quote = Column(Text, nullable=True)
    transcript_start = Column(Float, nullable=False)
    transcript_end = Column(Float, nullable=False)

    score = relationship("VivaScore", back_populates="evidences")

class FacultyOverride(Base):
    __tablename__ = "faculty_overrides"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("viva_sessions.id"), nullable=False)
    faculty_id = Column(String(50), nullable=False)
    faculty_name = Column(String(100), nullable=False)
    old_score = Column(Float, nullable=False)
    new_score = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    timestamp = Column(Float, default=time.time)

    session = relationship("VivaSession", back_populates="overrides")

class IntegrityLog(Base):
    __tablename__ = "integrity_logs"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("viva_sessions.id"), nullable=False)
    event_type = Column(String(50), nullable=False) # TAB_SWITCH, PROMPT_INJECTION, LONG_SILENCE
    details = Column(Text, nullable=True)
    timestamp_sec = Column(Float, nullable=False)

    session = relationship("VivaSession", back_populates="integrity_logs")

# --- Pydantic Schemas ---

class QuestionCreate(BaseModel):
    viva_id: int
    topic_id: Optional[int] = None
    question_text: str
    question_type: QuestionType = QuestionType.CONCEPT
    difficulty: int = 2
    expected_concepts: List[str] = Field(default_factory=list)
    answer_key: Optional[str] = None
    source: str = "APPROVED_BANK"

class StudentStartRequest(BaseModel):
    student_id: str
    student_name: str
    viva_id: int = 1
    consent_given: bool = True
    examiner_persona: str = "aria"
    subject_domain: str = "Data Structures & Algorithms"
    duration_minutes: Optional[int] = 15

class VivaDurationUpdateRequest(BaseModel):
    duration_minutes: int # 0 for unlimited, or e.g. 5, 10, 15, 30

class QuestionTreeNodeCreate(BaseModel):
    viva_id: int
    topic_id: int
    question_text: str
    question_type: QuestionType = QuestionType.CONCEPT
    difficulty: int = 2
    expected_concepts: List[str] = Field(default_factory=list)
    answer_key: Optional[str] = None
    parent_question_id: Optional[int] = None
    branch_condition: str = "CORRECT" # ROOT, CORRECT, STRONG, PARTIAL
    tree_depth: int = 1
    is_terminal: bool = False

class StudentTurnRequest(BaseModel):
    session_id: int
    elapsed_seconds: float
    transcript: str
    is_silence: bool = False
    is_giveup: bool = False
    is_hint_request: bool = False
    project_claim: Optional[str] = None
    code_snippet: Optional[str] = None
    audio_chunk_url: Optional[str] = None
    wpm: Optional[float] = None
    filler_words: Optional[Dict[str, int]] = None
    fluency_score: Optional[float] = None

class ContextQuestionGenRequest(BaseModel):
    context_text: str
    role_title: str = "Full-Stack Engineer"
    viva_id: int = 42

class VoiceAcousticsRequest(BaseModel):
    transcript: str
    duration_sec: float

class OverrideRequest(BaseModel):
    session_id: int
    faculty_id: str
    faculty_name: str
    new_score: float
    reason: str

class IntegrityEventRequest(BaseModel):
    session_id: int
    event_type: str
    details: str
    timestamp_sec: float

class ProjectIngestRequest(BaseModel):
    repo_url: Optional[str] = None
    project_name: Optional[str] = "My AI Portfolio Project"
    project_description: Optional[str] = None
    target_role: str = "Staff Backend Engineer"
    interview_mode: str = "standard" # quick, standard, deep
    code_snippets: Optional[str] = None

class ProjectVerdictRequest(BaseModel):
    question_text: str
    answer_transcript: str
    expected_concepts: List[str] = Field(default_factory=list)
    target_role: str = "Staff Backend Engineer"

class SyllabusTreeUploadRequest(BaseModel):
    viva_id: Optional[int] = 42
    subject: str = "Data Structures & Algorithms"
    difficulty: str = "Medium"
    duration_minutes: int = 15
    syllabus_text: str

class CodeExecutionRequest(BaseModel):
    code: str
    language: str = "javascript" # javascript, python, cpp, java
    custom_input: Optional[str] = None
    test_cases: Optional[List[dict]] = Field(default_factory=list)

