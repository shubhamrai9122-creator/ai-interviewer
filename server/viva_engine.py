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

    def calculate_phase(self, elapsed_sec: float, duration_minutes: int = 15, questions_asked_count: int = 0) -> SessionPhase:
        """Determines the viva phase based on configured duration or question count (unlimited)."""
        if duration_minutes <= 0:
            # Unlimited / Open-ended mode: phase tracks progression across question tree
            if questions_asked_count <= 1:
                return SessionPhase.WARMUP
            elif questions_asked_count <= 4:
                return SessionPhase.FUNDAMENTALS
            elif questions_asked_count <= 8:
                return SessionPhase.DEPTH
            else:
                return SessionPhase.APPLIED

        total_sec = duration_minutes * 60.0
        frac = elapsed_sec / max(1.0, total_sec)

        if frac < (60.0 / 900.0):
            return SessionPhase.WARMUP
        elif frac < (300.0 / 900.0):
            return SessionPhase.FUNDAMENTALS
        elif frac < (600.0 / 900.0):
            return SessionPhase.DEPTH
        elif frac < (780.0 / 900.0):
            return SessionPhase.APPLIED
        elif frac < (880.0 / 900.0):
            return SessionPhase.WRAPUP
        elif frac < 1.00:
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
            return AnswerQuality.NO_ANSWER, FollowupAction.MOVE_ON, [], []

        if is_giveup or "i don't know" in raw_transcript.lower() or "no idea" in raw_transcript.lower() or "skip this" in raw_transcript.lower() or "move on" in raw_transcript.lower():
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
        Adaptive Topic Question Tree Traversal Engine:
        - Starts at the Topic Root question
        - Explores child branches (Correct/Strong vs Socratic Hint)
        - Stops when branch hits terminal leaf, and smoothly transitions to next topic tree
        """
        # 1. Warm-up & Step-by-Step Discovery Phase
        q_count = len(session.questions_asked)
        if q_count == 0:
            # Step 1: Introduction
            return (
                f"Hello {session.student_name}! Welcome to your technical viva examination. To get started warmly, please introduce yourself briefly and share a project or area of technology you have recently worked with.",
                None,
                QuestionType.PROJECT
            )
        elif q_count == 1:
            # Step 2: Ask candidate which topic they feel strongest in
            is_web = "web" in (session.subject_domain or "").lower()
            topic_options = "React Architecture, Node.js Event Loop, or Databases & Storage" if is_web else "Arrays & Hashing, Trees & BSTs, Graph Algorithms, or Dynamic Programming"
            return (
                f"Thank you for sharing your background! Before we jump into technical problems, which topic do you feel strongest in? (For example: {topic_options}). I'll start with your forte!",
                None,
                QuestionType.CONCEPT
            )
        elif q_count == 2:
            # Step 3: Prioritize candidate's chosen strong topic
            last_ans = session.student_answers[-1].transcript.lower() if session.student_answers else ""
            topics = self.db.query(Topic).filter(Topic.viva_id == session.viva_id).all()
            matched_topic = None

            # Detect chosen topic from transcript
            for t in topics:
                t_words = t.name.lower().split()
                if any(w in last_ans for w in t_words if len(w) > 3) or t.name.lower() in last_ans:
                    matched_topic = t
                    break
                # Special abbreviations
                if "dp" in last_ans and "dynamic" in t.name.lower():
                    matched_topic = t
                    break
                if ("react" in last_ans or "dom" in last_ans) and "frontend" in t.name.lower():
                    matched_topic = t
                    break
                if ("node" in last_ans or "api" in last_ans) and "backend" in t.name.lower():
                    matched_topic = t
                    break

            if not matched_topic and topics:
                matched_topic = topics[0]

            if matched_topic:
                session.current_topic_id = matched_topic.id
                root_q = self.db.query(Question).filter(
                    Question.topic_id == matched_topic.id,
                    Question.tree_depth == 1,
                    ~Question.id.in_(asked_ids)
                ).first()
                if root_q:
                    return (
                        f"Great! Let's start with your strong topic: {matched_topic.name}. Here is your first question: {root_q.question_text}",
                        root_q.id,
                        root_q.question_type
                    )

        # 2. Wrap-up Phase
        if current_phase == SessionPhase.WRAPUP:
            return (
                "You've done wonderfully tackling these questions! We have covered all our main technical areas today. Is there any final clarification, detail, or insight you would like to share before we conclude?",
                None,
                QuestionType.CONCEPT
            )

        if current_phase in [SessionPhase.SCORING, SessionPhase.COMPLETED]:
            return (
                "Our viva examination has now concluded! All your spoken explanations and code have been saved for faculty review. Your evaluation report is being generated right now. Thank you so much for your effort!",
                None,
                QuestionType.CONCEPT
            )

        # Get all asked question IDs in this session
        asked_ids = [qa.question_id for qa in session.questions_asked if qa.question_id is not None]
        last_qa = session.questions_asked[-1] if session.questions_asked else None
        last_q_id = last_qa.question_id if last_qa else None

        # 3. Handle Hint / Missing Concept Follow-up
        if last_action == FollowupAction.HINT and missing_concepts:
            target_concept = missing_concepts[0]
            # Check if there is an explicit hint branch question in the tree
            if last_q_id:
                hint_child = self.db.query(Question).filter(
                    Question.parent_question_id == last_q_id,
                    Question.branch_condition == "PARTIAL",
                    ~Question.id.in_(asked_ids)
                ).first()
                if hint_child:
                    return (hint_child.question_text, hint_child.id, hint_child.question_type)

            return (
                f"You're very close! Think a little more about {target_concept}. How would that play a role here? Take your time.",
                None,
                QuestionType.WHY
            )

        if last_action == FollowupAction.REDIRECT:
            return (
                "Let's refocus gently on our core technical objective. In the context of this data structure, how does your implementation handle scale and edge cases?",
                None,
                QuestionType.WHY
            )

        if last_action == FollowupAction.MOVE_ON:
            # Move on gracefully to the next topic or unasked question
            topics = self.db.query(Topic).filter(Topic.viva_id == session.viva_id).order_by(Topic.id.asc()).all()
            for t in topics:
                root_q = self.db.query(Question).filter(
                    Question.topic_id == t.id,
                    Question.tree_depth == 1,
                    ~Question.id.in_(asked_ids)
                ).first()
                if root_q:
                    session.current_topic_id = t.id
                    return (
                        f"No worries at all! Let's move on to our next question on {t.name}: {root_q.question_text}",
                        root_q.id,
                        root_q.question_type
                    )

            # Check unasked approved questions
            rem_q = self.db.query(Question).filter(
                Question.viva_id == session.viva_id,
                Question.status == "APPROVED",
                ~Question.id.in_(asked_ids)
            ).first()
            if rem_q:
                return (
                    f"No problem! Let's move forward to this question: {rem_q.question_text}",
                    rem_q.id,
                    rem_q.question_type
                )

        # 4. Tree Traversal: Check if last question has child branch nodes in the tree
        if last_q_id and last_action != FollowupAction.MOVE_ON:
            last_q = self.db.query(Question).filter(Question.id == last_q_id).first()
            if last_q and not last_q.is_terminal:
                branch_filter = ["STRONG", "CORRECT"] if last_quality == AnswerQuality.STRONG else ["CORRECT", "STRONG"]
                child_q = self.db.query(Question).filter(
                    Question.parent_question_id == last_q_id,
                    Question.branch_condition.in_(branch_filter),
                    ~Question.id.in_(asked_ids)
                ).order_by(Question.tree_depth.asc()).first()

                if child_q:
                    prefix = "That was a wonderfully clear explanation! Let's branch deeper into this topic: " if last_quality == AnswerQuality.STRONG else "Good. Following up on this branch: "
                    return (f"{prefix}{child_q.question_text}", child_q.id, child_q.question_type)

        # 5. If branch ended (terminal leaf reached) or no child: Transition to NEXT Topic Tree!
        topics = self.db.query(Topic).filter(Topic.viva_id == session.viva_id).order_by(Topic.id.asc()).all()
        for t in topics:
            root_q = self.db.query(Question).filter(
                Question.topic_id == t.id,
                Question.tree_depth == 1,
                ~Question.id.in_(asked_ids)
            ).first()

            if root_q:
                session.current_topic_id = t.id
                return (
                    f"Great job! That successfully completes our exploration of that topic tree. Let's now branch into our next topic: {t.name}. {root_q.question_text}",
                    root_q.id,
                    root_q.question_type
                )

        # 6. If all trees exhausted, check any remaining unasked approved questions
        remaining_q = self.db.query(Question).filter(
            Question.viva_id == session.viva_id,
            Question.status == "APPROVED",
            ~Question.id.in_(asked_ids)
        ).first()

        if remaining_q:
            return (remaining_q.question_text, remaining_q.id, remaining_q.question_type)

        # All question trees completed!
        return (
            "You have covered all the topic question trees prepared for this examination! Is there any final technical clarification or insight you'd like to share before we conclude?",
            None,
            QuestionType.CONCEPT
        )

    def process_turn(
        self,
        session_id: int,
        elapsed_seconds: float,
        student_transcript: str,
        is_silence: bool = False,
        is_giveup: bool = False,
        is_hint_req: bool = False,
        project_claim: Optional[str] = None,
        code_snippet: Optional[str] = None,
        audio_chunk_url: Optional[str] = None,
        wpm: Optional[float] = None,
        filler_words: Optional[Dict[str, int]] = None,
        fluency_score: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Executes an end-to-end viva conversational turn with latency profiling,
        recording acoustic telemetry, code submissions, and audio clips.
        """
        start_time = time.time()
        session = self.db.query(VivaSession).filter(VivaSession.id == session_id).first()
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Update session elapsed time and calculate phase
        duration_mins = session.duration_minutes if session.duration_minutes is not None else 15
        questions_count = len(session.questions_asked)
        new_phase = self.calculate_phase(elapsed_seconds, duration_minutes=duration_mins, questions_asked_count=questions_count)
        session.current_phase = new_phase

        # Combine student transcript and code for analysis if code was submitted
        combined_text = student_transcript
        if code_snippet and code_snippet.strip():
            combined_text += f"\n[Code Implementation]: {code_snippet}"

        # Check prompt injection
        if self.detect_prompt_injection(combined_text):
            integ = IntegrityLog(
                session_id=session.id,
                event_type="PROMPT_INJECTION_ATTEMPT",
                details=f"Candidate uttered injection: '{combined_text[:120]}...'",
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
            raw_transcript=combined_text,
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
                latency_ms=(time.time() - start_time) * 1000,
                audio_chunk_url=audio_chunk_url,
                wpm=wpm,
                filler_words=filler_words or {},
                fluency_score=fluency_score,
                code_snippet=code_snippet
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

        total_sec = duration_mins * 60 if duration_mins > 0 else 0
        rem_sec = max(0, total_sec - elapsed_seconds) if duration_mins > 0 else 0

        return {
            "session_id": session.id,
            "current_phase": new_phase.value,
            "elapsed_seconds": elapsed_seconds,
            "duration_minutes": duration_mins,
            "remaining_seconds": rem_sec,
            "ai_response_text": next_text,
            "question_type": next_qtype.value,
            "answer_quality": quality.value,
            "followup_action": action.value,
            "detected_concepts": detected,
            "missing_concepts": missing,
            "latency_ms": latency_ms,
            "is_viva_completed": (new_phase in [SessionPhase.SCORING, SessionPhase.COMPLETED])
        }
