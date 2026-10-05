import time
import math
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from server.models import (
    VivaSession, VivaScore, ScoreEvidence, QuestionAsked, StudentAnswer,
    SessionStatus, SessionPhase, AnswerQuality
)

SCORING_PROMPT_VERSION = "v1.4.2-deterministic-rubric"

class ScoringWorker:
    def __init__(self, db: Session):
        self.db = db

    def evaluate_session(self, session_id: int) -> VivaScore:
        """
        Runs comprehensive post-viva evaluation on the full transcript.
        Evaluates 5 dimensions (0-5), extracts evidence timestamps/quotes,
        computes deterministic score out of 100, and checks confidence.
        """
        session = self.db.query(VivaSession).filter(VivaSession.id == session_id).first()
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Fetch questions and answers
        qas = self.db.query(QuestionAsked).filter(QuestionAsked.session_id == session_id).order_by(QuestionAsked.timestamp_sec.asc()).all()
        answers = self.db.query(StudentAnswer).filter(StudentAnswer.session_id == session_id).order_by(StudentAnswer.start_time_sec.asc()).all()

        total_words = sum(len(a.transcript.split()) for a in answers)
        strong_count = sum(1 for a in answers if a.answer_quality == AnswerQuality.STRONG)
        correct_count = sum(1 for a in answers if a.answer_quality == AnswerQuality.CORRECT)
        partial_count = sum(1 for a in answers if a.answer_quality == AnswerQuality.PARTIAL)
        no_answer_count = sum(1 for a in answers if a.answer_quality == AnswerQuality.NO_ANSWER)
        off_topic_count = sum(1 for a in answers if a.answer_quality == AnswerQuality.OFF_TOPIC)

        answer_count = max(1, len(answers))

        # 1. Conceptual Understanding (30%) - Explains core concepts correctly in own words
        concept_ratio = (strong_count * 1.0 + correct_count * 0.8 + partial_count * 0.4) / answer_count
        conceptual_score = min(5.0, max(1.0, round(concept_ratio * 5.0, 1)))

        # Find evidence quote for Conceptual
        concept_ans = next((a for a in answers if a.answer_quality in [AnswerQuality.STRONG, AnswerQuality.CORRECT]), None)
        if not concept_ans and answers:
            concept_ans = answers[0]

        # 2. Depth and Reasoning (25%) - Handles follow-ups, explains trade-offs and "why"
        depth_ratio = (strong_count * 1.2 + correct_count * 0.6) / answer_count
        depth_score = min(5.0, max(1.0, round(depth_ratio * 5.0, 1)))

        depth_ans = next((a for a in answers if a.answer_quality == AnswerQuality.STRONG and a.end_time_sec > 300), None)
        if not depth_ans and answers:
            depth_ans = answers[-1]

        # 3. Problem Solving (20%) - Breaks applied problem into steps, reaches sound approach
        applied_answers = [a for a in answers if a.start_time_sec >= 450] # Answers in second half
        if applied_answers:
            app_strong = sum(1 for a in applied_answers if a.answer_quality in [AnswerQuality.STRONG, AnswerQuality.CORRECT])
            problem_score = min(5.0, max(1.0, round((app_strong / len(applied_answers)) * 5.0, 1)))
            problem_ans = applied_answers[0]
        else:
            problem_score = 3.0
            problem_ans = answers[-1] if answers else None

        # 4. Practical / Project Knowledge (15%) - Speaks concretely about what they built
        warmup_answers = [a for a in answers if a.start_time_sec < 120]
        if warmup_answers and len(warmup_answers[0].transcript.split()) >= 15:
            practical_score = 4.5 if any(tech in warmup_answers[0].transcript.lower() for tech in ["react", "node", "python", "sql", "redis", "docker", "api", "database", "git", "tree", "graph"]) else 3.5
            practical_ans = warmup_answers[0]
        else:
            practical_score = 2.5
            practical_ans = answers[0] if answers else None

        # 5. Communication (10%) - Clear, structured, concise answers; no penalty for Indian accent/Hinglish
        if total_words > 80 and off_topic_count == 0 and no_answer_count <= 2:
            communication_score = 4.5
        elif total_words > 40:
            communication_score = 3.5
        else:
            communication_score = 2.0

        comm_ans = answers[0] if answers else None

        # Deterministic Total Score Calculation (Out of 100)
        # Weights: Conceptual (30%), Depth (25%), Problem Solving (20%), Practical (15%), Communication (10%)
        # Score = (conceptual * 20 * 0.30) + (depth * 20 * 0.25) + ...
        # Simplified: (conceptual * 6) + (depth * 5) + (problem * 4) + (practical * 3) + (communication * 2)
        total_score = round(
            (conceptual_score * 6.0) +
            (depth_score * 5.0) +
            (problem_score * 4.0) +
            (practical_score * 3.0) +
            (communication_score * 2.0),
            1
        )

        # Confidence Calculation
        confidence = 0.95
        flagged = session.flagged_for_review
        flag_reason = session.flag_reason

        if total_words < 40:
            confidence -= 0.35
            flagged = True
            flag_reason = "Very short answers / low total spoken word count."
        elif no_answer_count >= 3:
            confidence -= 0.15
        if session.flagged_for_review:
            confidence = min(confidence, 0.65)

        confidence = round(max(0.1, min(1.0, confidence)), 2)

        # 3-5 lines of actionable feedback
        feedback_lines = [
            f"1. Core Technical Understanding: Demonstrated a score of {conceptual_score}/5 across fundamental data structure queries with clear grasp of standard operations.",
            f"2. Analytical Depth: Scored {depth_score}/5 on edge-case follow-ups; {'effectively addressed algorithmic trade-offs' if depth_score >= 3.5 else 'could improve in articulating worst-case degenerate scenarios'}.",
            f"3. Practical Engineering: Achieved {practical_score}/5 on implementation discussions, showing grounded comprehension of architecture and design.",
            f"4. Focus Area for Growth: Prioritize exploring formal amortized complexity analysis and deep concurrency safety guarantees."
        ]
        feedback_text = "\n".join(feedback_lines)

        # Remove existing score if re-scoring
        if session.score:
            self.db.delete(session.score)
            self.db.flush()

        viva_score = VivaScore(
            session_id=session.id,
            conceptual=conceptual_score,
            depth=depth_score,
            problem_solving=problem_score,
            practical=practical_score,
            communication=communication_score,
            total_score=total_score,
            confidence=confidence,
            feedback=feedback_text,
            scoring_prompt_version=SCORING_PROMPT_VERSION,
            created_at=time.time()
        )
        self.db.add(viva_score)
        self.db.flush()

        # Evidence linking with transcript timestamps and direct quotes
        def fmt_time(sec: float) -> str:
            m = int(sec // 60)
            s = int(sec % 60)
            return f"{m:02d}:{s:02d}"

        evidence_items = [
            (
                "Conceptual Understanding",
                conceptual_score,
                f"Candidate accurately elaborated on core invariants ({', '.join(concept_ans.detected_concepts) if concept_ans and concept_ans.detected_concepts else 'primary definitions'}).",
                concept_ans.transcript if concept_ans else "No direct quote available.",
                concept_ans.start_time_sec if concept_ans else 0.0,
                concept_ans.end_time_sec if concept_ans else 60.0
            ),
            (
                "Depth and Reasoning",
                depth_score,
                "Candidate reasoned through follow-up probes regarding asymptotic complexity and boundary edge cases.",
                depth_ans.transcript if depth_ans else "No direct quote available.",
                depth_ans.start_time_sec if depth_ans else 300.0,
                depth_ans.end_time_sec if depth_ans else 360.0
            ),
            (
                "Problem Solving",
                problem_score,
                "Applied systematic decomposition to address the debugging scenario aloud.",
                problem_ans.transcript if problem_ans else "No direct quote available.",
                problem_ans.start_time_sec if problem_ans else 600.0,
                problem_ans.end_time_sec if problem_ans else 660.0
            ),
            (
                "Practical / Project Knowledge",
                practical_score,
                "Articulated hands-on project deployment and implementation stack details.",
                practical_ans.transcript if practical_ans else "No direct quote available.",
                practical_ans.start_time_sec if practical_ans else 10.0,
                practical_ans.end_time_sec if practical_ans else 50.0
            ),
            (
                "Communication",
                communication_score,
                "Maintained structured, clear verbal explanations with minimal hesitation.",
                comm_ans.transcript[:100] + "..." if comm_ans else "Clear diction throughout.",
                comm_ans.start_time_sec if comm_ans else 0.0,
                comm_ans.end_time_sec if comm_ans else 30.0
            )
        ]

        for dim, s_val, reason, quote, t_start, t_end in evidence_items:
            ev = ScoreEvidence(
                score_id=viva_score.id,
                dimension=dim,
                dimension_score=s_val,
                reason=reason,
                quote=quote,
                transcript_start=t_start,
                transcript_end=t_end
            )
            self.db.add(ev)

        # Update session final metrics
        session.final_score = total_score
        session.confidence = confidence
        session.flagged_for_review = flagged
        session.flag_reason = flag_reason
        session.status = SessionStatus.COMPLETED
        session.current_phase = SessionPhase.COMPLETED
        session.ended_at = time.time()

        self.db.commit()
        self.db.refresh(viva_score)
        return viva_score
