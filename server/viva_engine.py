import re
import time
import random
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from server.models import (
    VivaSession, QuestionAsked, StudentAnswer, Question, Topic,
    SessionPhase, SessionStatus, QuestionType, AnswerQuality,
    FollowupAction, IntegrityLog
)

# Common prompt injection patterns
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+instructions?",
    r"(give|award|assign)\s+(me\s+)?(full|100|max)\s+(marks?|score|points?)",
    r"system\s*:\s*override",
    r"you\s+are\s+now\s+a\s+friendly\s+assistant",
    r"bypass\s+(rubric|rules|evaluation)",
    r"reveal\s+(prompt|instructions?|answer\s*key)",
    r"say\s+['\"]?passed['\"]?",
    r"forget\s+everything"
]

# Hinglish phrases mapped to technical English concepts
HINGLISH_TRANSLATION_MAP = {
    "array ko sort": "sort the array",
    "element insert": "insert element",
    "mid calculate": "calculate mid index",
    "search space aadha": "half the search space",
    "stack overflow ho": "stack overflow occurs",
    "time lagta hai": "time complexity",
    "memory waste": "memory overhead",
    "rekursion": "recursion",
    "pointer aage badhana": "advance pointer",
    "hash table me collision": "collision in hash table",
    "pehla element": "first element",
    "aakhri element": "last element"
}

class VivaEngine:
    def __init__(self, db: Session):
        self.db = db

    def calculate_phase(self, elapsed_sec: float) -> SessionPhase:
        """Determines the viva phase deterministically based on elapsed time."""
        if elapsed_sec < 60:        # 0:00 - 1:00
            return SessionPhase.WARMUP
        elif elapsed_sec < 300:     # 1:00 - 5:00
            return SessionPhase.FUNDAMENTALS
        elif elapsed_sec < 600:     # 5:00 - 10:00
            return SessionPhase.DEPTH
        elif elapsed_sec < 780:     # 10:00 - 13:00
            return SessionPhase.APPLIED
        elif elapsed_sec < 870:     # 13:00 - 14:30
            return SessionPhase.WRAPUP
        elif elapsed_sec < 900:     # 14:30 - 15:00
            return SessionPhase.SCORING
        else:
            return SessionPhase.COMPLETED

    def detect_prompt_injection(self, text: str) -> bool:
        lowered = text.lower()
        for pat in INJECTION_PATTERNS:
            if re.search(pat, lowered):
                return True
        return False

    def normalize_hinglish(self, text: str) -> str:
        normalized = text.lower()
        for k, v in HINGLISH_TRANSLATION_MAP.items():
            normalized = normalized.replace(k, v)
        return normalized

    def analyze_answer(
        self,
        question: Optional[Question],
        raw_transcript: str,
        is_giveup: bool,
        is_silence: bool,
        is_hint_req: bool
    ) -> Tuple[AnswerQuality, FollowupAction, List[str], List[str]]:
        """
        6-Stage Answer Classification:
        Returns: (quality, followup_action, detected_concepts, missing_concepts)
        """
        if is_silence:
            return AnswerQuality.NO_ANSWER, FollowupAction.HINT, [], []

        if is_giveup or "i don't know" in raw_transcript.lower() or "no idea" in raw_transcript.lower() or "skip this" in raw_transcript.lower():
            return AnswerQuality.NO_ANSWER, FollowupAction.MOVE_ON, [], []

        if is_hint_req or "can you give me a hint" in raw_transcript.lower():
            return AnswerQuality.PARTIAL, FollowupAction.HINT, [], []

        # Prompt injection attempt
        if self.detect_prompt_injection(raw_transcript):
            return AnswerQuality.OFF_TOPIC, FollowupAction.REDIRECT, [], []

        # Concept extraction
        detected = []
        missing = []
        expected = question.expected_concepts if question and question.expected_concepts else []

        normalized = self.normalize_hinglish(raw_transcript)

        for concept in expected:
            # Check concept keyword presence
            c_low = concept.lower()
            if c_low in normalized or any(word in normalized for word in c_low.split() if len(word) > 3):
                detected.append(concept)
            else:
                missing.append(concept)

        words = normalized.split()
        total_words = len(words)

        # Off-topic / Stalling detection
        if total_words > 10 and len(detected) == 0 and not any(kw in normalized for kw in ["time", "data", "algorithm", "complexity", "structure", "function", "node", "tree", "array"]):
            return AnswerQuality.OFF_TOPIC, FollowupAction.REDIRECT, detected, missing

        # Quality scoring based on coverage and length
        if len(expected) > 0:
            coverage = len(detected) / len(expected)
            if coverage >= 0.75 and total_words >= 15:
                return AnswerQuality.STRONG, FollowupAction.DEEPER, detected, missing
            elif coverage >= 0.4:
                return AnswerQuality.CORRECT, FollowupAction.DEEPER, detected, missing
            elif coverage > 0 or total_words >= 10:
                return AnswerQuality.PARTIAL, FollowupAction.HINT, detected, missing
            else:
                return AnswerQuality.SHALLOW, FollowupAction.HINT, detected, missing
        else:
            # Fallback if no expected concepts listed
            if total_words > 25:
                return AnswerQuality.STRONG, FollowupAction.DEEPER, detected, missing
            elif total_words >= 10:
                return AnswerQuality.CORRECT, FollowupAction.DEEPER, detected, missing
            else:
                return AnswerQuality.PARTIAL, FollowupAction.HINT, detected, missing

    def select_next_question(
        self,
        session: VivaSession,
        current_phase: SessionPhase,
        last_quality: Optional[AnswerQuality],
        last_action: Optional[FollowupAction],
        missing_concepts: List[str]
    ) -> Tuple[str, Optional[int], QuestionType]:
        """
        Adaptive Question Selector based on Phase, Question Bank, and Knowledge State.
        """
        # 1. Warm-up Phase
        if current_phase == SessionPhase.WARMUP:
            q_count = len(session.questions_asked)
            if q_count == 0:
                return (
                    f"Hello {session.student_name}! Welcome to your 15-minute MSOT Technical Viva. Please confirm your audio is working clearly, and tell me briefly about a software project or data structures assignment you've built recently.",
                    None,
                    QuestionType.PROJECT
                )
            else:
                return (
                    "Thank you. That's a great project to hear about. Now let's begin the technical core round. Are you ready?",
                    None,
                    QuestionType.CONCEPT
                )

        # 2. Wrap-up Phase
        if current_phase == SessionPhase.WRAPUP:
            return (
                "We are reaching the 15-minute mark. You've done well tackling these questions. Is there any final technical clarification or point you would like to briefly add before we conclude?",
                None,
                QuestionType.CONCEPT
            )

        if current_phase in [SessionPhase.SCORING, SessionPhase.COMPLETED]:
            return (
                "Your 15-minute viva has now concluded. The session audio and timestamped transcript have been saved for faculty audit. Your final rubric evaluation will be processed immediately. You may now disconnect.",
                None,
                QuestionType.CONCEPT
            )

        # Get all asked question IDs in this session
        asked_ids = [qa.question_id for qa in session.questions_asked if qa.question_id is not None]

        # 3. Handle Hint / Missing Concept Follow-up
        if last_action == FollowupAction.HINT and missing_concepts:
            target_concept = missing_concepts[0]
            return (
                f"You're on the right track, but think carefully about {target_concept}. How does {target_concept} factor into this approach? Take a moment to consider.",
                None,
                QuestionType.WHY
            )

        if last_action == FollowupAction.REDIRECT:
            return (
                "Let's refocus strictly on our core technical objective. In the context of this data structure, how does your implementation handle scale and edge cases?",
                None,
                QuestionType.WHY
            )

        # 4. Handle Strong Answer -> Deepen (Bloom's Level 4 / 5)
        if last_quality == AnswerQuality.STRONG:
            # Look for an approved WHY or EDGE_CASE question in the bank
            deep_q = self.db.query(Question).filter(
                Question.viva_id == session.viva_id,
                Question.question_type.in_([QuestionType.WHY, QuestionType.EDGE_CASE, QuestionType.TRADE_OFF]),
                ~Question.id.in_(asked_ids)
            ).first()

            if deep_q:
                return (f"Excellent explanation. Let's go one level deeper: {deep_q.question_text}", deep_q.id, deep_q.question_type)
            else:
                return (
                    "That was very well explained. Now, what trade-offs would you face if the input dataset became 100 times larger than available RAM?",
                    None,
                    QuestionType.TRADE_OFF
                )

        # 5. Phase-Specific Question Selection from Bank
        if current_phase == SessionPhase.FUNDAMENTALS:
            q = self.db.query(Question).filter(
                Question.viva_id == session.viva_id,
                Question.question_type == QuestionType.CONCEPT,
                ~Question.id.in_(asked_ids)
            ).order_by(Question.difficulty.asc()).first()

            if q:
                return (q.question_text, q.id, q.question_type)
            return ("Can you explain how a Hash Map handles collision resolution under high load factor?", None, QuestionType.CONCEPT)

        elif current_phase == SessionPhase.DEPTH:
            q = self.db.query(Question).filter(
                Question.viva_id == session.viva_id,
                Question.question_type.in_([QuestionType.WHY, QuestionType.EDGE_CASE, QuestionType.TRADE_OFF]),
                ~Question.id.in_(asked_ids)
            ).order_by(Question.difficulty.desc()).first()

            if q:
                return (f"Probing deeper on this topic: {q.question_text}", q.id, q.question_type)
            return ("Consider an unbalanced Binary Search Tree that degenerates into a linked list. How would an AVL or Red-Black Tree guarantee logarithmic bounds?", None, QuestionType.EDGE_CASE)

        elif current_phase == SessionPhase.APPLIED:
            q = self.db.query(Question).filter(
                Question.viva_id == session.viva_id,
                Question.question_type.in_([QuestionType.APPLIED, QuestionType.DEBUGGING]),
                ~Question.id.in_(asked_ids)
            ).first()

            if q:
                return (f"Here is an applied engineering scenario: {q.question_text}", q.id, q.question_type)
            return ("Suppose your production caching layer experiences sudden cache stampede when popular keys expire. How would you debug and architect a solution?", None, QuestionType.APPLIED)

        # Fallback
        return ("Could you elaborate on the time and space complexity trade-offs in your design?", None, QuestionType.TRADE_OFF)

    def process_turn(
        self,
        session_id: int,
        elapsed_seconds: float,
        student_transcript: str,
        is_silence: bool = False,
        is_giveup: bool = False,
        is_hint_req: bool = False,
        project_claim: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes an end-to-end viva conversational turn with latency profiling.
        """
        start_time = time.time()
        session = self.db.query(VivaSession).filter(VivaSession.id == session_id).first()
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Update session elapsed time and calculate phase
        session.elapsed_seconds = elapsed_seconds
        new_phase = self.calculate_phase(elapsed_seconds)
        session.current_phase = new_phase

        # Check prompt injection
        if self.detect_prompt_injection(student_transcript):
            integ = IntegrityLog(
                session_id=session.id,
                event_type="PROMPT_INJECTION_ATTEMPT",
                details=f"Candidate uttered injection: '{student_transcript[:120]}...'",
                timestamp_sec=elapsed_seconds
            )
            self.db.add(integ)
            session.flagged_for_review = True
            session.flag_reason = "Prompt injection attempt detected during viva."

        # Fetch last question asked to evaluate the answer against
        last_question_asked = self.db.query(QuestionAsked).filter(
            QuestionAsked.session_id == session.id
        ).order_by(QuestionAsked.id.desc()).first()

        last_bank_q = None
        if last_question_asked and last_question_asked.question_id:
            last_bank_q = self.db.query(Question).filter(Question.id == last_question_asked.question_id).first()

        # Analyze student answer
        quality, action, detected, missing = self.analyze_answer(
            question=last_bank_q,
            raw_transcript=student_transcript,
            is_giveup=is_giveup,
            is_silence=is_silence,
            is_hint_req=is_hint_req
        )

        # Record answer if there was a preceding question asked
        if last_question_asked:
            answer = StudentAnswer(
                session_id=session.id,
                question_asked_id=last_question_asked.id,
                transcript=student_transcript,
                start_time_sec=last_question_asked.timestamp_sec,
                end_time_sec=elapsed_seconds,
                answer_quality=quality,
                followup_action=action,
                detected_concepts=detected,
                missing_concepts=missing,
                latency_ms=(time.time() - start_time) * 1000
            )
            self.db.add(answer)

        # Select next question
        next_text, next_qid, next_qtype = self.select_next_question(
            session=session,
            current_phase=new_phase,
            last_quality=quality,
            last_action=action,
            missing_concepts=missing
        )

        # Record new question asked
        new_qa = QuestionAsked(
            session_id=session.id,
            question_id=next_qid,
            question_text=next_text,
            timestamp_sec=elapsed_seconds,
            phase=new_phase,
            question_type=next_qtype,
            parent_question_id=last_bank_q.id if last_bank_q else None
        )
        self.db.add(new_qa)
        self.db.commit()

        latency_ms = round((time.time() - start_time) * 1000, 1)

        return {
            "session_id": session.id,
            "current_phase": new_phase.value,
            "elapsed_seconds": elapsed_seconds,
            "remaining_seconds": max(0, 900 - elapsed_seconds),
            "ai_response_text": next_text,
            "question_type": next_qtype.value,
            "answer_quality": quality.value,
            "followup_action": action.value,
            "detected_concepts": detected,
            "missing_concepts": missing,
            "latency_ms": latency_ms,
            "is_viva_completed": (new_phase in [SessionPhase.SCORING, SessionPhase.COMPLETED])
        }
