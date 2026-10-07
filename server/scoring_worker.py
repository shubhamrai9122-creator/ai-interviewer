import time
import math
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from server.models import (
    VivaSession, VivaScore, ScoreEvidence, QuestionAsked, StudentAnswer,
    SessionStatus, SessionPhase, AnswerQuality
)

SCORING_PROMPT_VERSION = "v2.0.0-section-17-rubric"

class ScoringWorker:
    def __init__(self, db: Session):
        self.db = db

    def evaluate_session(self, session_id: int) -> VivaScore:
        """
        Runs comprehensive post-viva evaluation on the full transcript.
        Strictly produces the Section 17 Final Evaluation report:
        - Overall Score: /100
        - DSA Score: /100
        - Web Development Score: /100
        - 8 Subscores (/10): Problem Solving, Communication, Technical Depth, Code Quality,
          Complexity Analysis, Debugging, Adaptability
        - Strongest areas, Weakest areas, Repeated mistakes, Topics needing improvement,
          Performance summary, Recommended next topics, Suggested next difficulty
        - Distinct diagnosis: Knowledge gaps, Reasoning problems, Implementation mistakes, Communication problems
        """
        session = self.db.query(VivaSession).filter(VivaSession.id == session_id).first()
        if not session:
            raise ValueError(f"Session {session_id} not found")

        qas = self.db.query(QuestionAsked).filter(QuestionAsked.session_id == session_id).order_by(QuestionAsked.timestamp_sec.asc()).all()
        answers = self.db.query(StudentAnswer).filter(StudentAnswer.session_id == session_id).order_by(StudentAnswer.start_time_sec.asc()).all()

        profile = session.interview_profile or {}
        hints_used = profile.get("hints_used", 0)
        characteristics = profile.get("characteristics", {})
        preferred_domain = profile.get("preferred_domain", session.preferred_domain or "dsa")
        level = profile.get("level", session.interview_level or "Intermediate")

        total_words = sum(len(a.transcript.split()) for a in answers)
        strong_count = sum(1 for a in answers if a.answer_quality == AnswerQuality.STRONG)
        correct_count = sum(1 for a in answers if a.answer_quality == AnswerQuality.CORRECT)
        partial_count = sum(1 for a in answers if a.answer_quality == AnswerQuality.PARTIAL)
        no_answer_count = sum(1 for a in answers if a.answer_quality == AnswerQuality.NO_ANSWER)
        off_topic_count = sum(1 for a in answers if a.answer_quality == AnswerQuality.OFF_TOPIC)
        code_submitted_count = sum(1 for a in answers if a.code_snippet and len(a.code_snippet.strip()) > 15)

        answer_count = max(1, len(answers))

        # 1. 8 Subscores (out of 10)
        # Problem Solving (/10)
        ps_base = 7.0
        if characteristics.get("identifies_core_pattern"): ps_base += 1.5
        if characteristics.get("optimizes_own_solution"): ps_base += 1.5
        if characteristics.get("recognizes_brute_force"): ps_base += 0.5
        if hints_used >= 3: ps_base -= 1.5
        elif hints_used == 0 and strong_count >= 2: ps_base += 0.5
        problem_solving_10 = round(max(3.0, min(10.0, ps_base)), 1)

        # Communication (/10)
        comm_base = 7.5
        if characteristics.get("explains_reasoning"): comm_base += 1.5
        if characteristics.get("jumps_to_coding_early"): comm_base -= 1.5
        if total_words > 100: comm_base += 0.8
        elif total_words < 30: comm_base -= 2.0
        communication_10 = round(max(3.0, min(10.0, comm_base)), 1)

        # Technical Depth (/10)
        depth_base = 6.5
        if strong_count >= 2: depth_base += 2.0
        if correct_count >= 2: depth_base += 1.0
        if partial_count >= 3: depth_base -= 1.0
        technical_depth_10 = round(max(3.0, min(10.0, depth_base)), 1)

        # Code Quality (/10)
        cq_base = 7.0
        if code_submitted_count > 0:
            cq_base += 1.5
            if characteristics.get("considers_edge_cases"): cq_base += 1.2
        else:
            cq_base = 6.0
        code_quality_10 = round(max(2.5, min(10.0, cq_base)), 1)

        # Complexity Analysis (/10)
        comp_base = 6.0
        if characteristics.get("analyzes_time_complexity"): comp_base += 2.0
        if characteristics.get("analyzes_space_complexity"): comp_base += 1.5
        complexity_analysis_10 = round(max(3.0, min(10.0, comp_base)), 1)

        # Debugging (/10)
        deb_base = 6.5
        if characteristics.get("considers_edge_cases"): deb_base += 2.0
        if characteristics.get("debugs_own_code") or characteristics.get("responds_to_counterexamples"): deb_base += 1.5
        debugging_10 = round(max(3.0, min(10.0, deb_base)), 1)

        # Adaptability (/10)
        adapt_base = 7.0
        if characteristics.get("adapts_to_changed_constraints"): adapt_base += 1.5
        if characteristics.get("asks_clarifying_questions"): adapt_base += 1.0
        if hints_used == 1 or hints_used == 2: adapt_base += 0.5 # Effectively absorbed hint
        elif hints_used >= 4: adapt_base -= 1.5
        adaptability_10 = round(max(3.0, min(10.0, adapt_base)), 1)

        # 2. DSA Score (/100) & Web Development Score (/100)
        # DSA Score: Problem Solving, Complexity Analysis, Code Quality, Technical Depth
        dsa_raw = (problem_solving_10 * 3.5) + (complexity_analysis_10 * 2.5) + (code_quality_10 * 2.0) + (debugging_10 * 2.0)
        # Deduct for multiple hints
        if hints_used > 2:
            dsa_raw -= (hints_used - 2) * 5.0
        dsa_score = round(max(25.0, min(100.0, dsa_raw)), 1)

        # Web Development Score: Technical Depth, Communication, Adaptability, Scenario reasoning
        web_raw = (technical_depth_10 * 3.5) + (problem_solving_10 * 2.5) + (communication_10 * 2.0) + (adaptability_10 * 2.0)
        web_dev_score = round(max(25.0, min(100.0, web_raw)), 1)

        # Check interview domain strictly
        subj_lower = (session.subject_domain or "").lower()
        is_web = preferred_domain == "webdev" or "web" in subj_lower
        is_dsa = not is_web  # strictly either DSA or Web Development

        if is_dsa:
            overall_score = dsa_score
            active_domain_title = "Data Structures & Algorithms"
            active_domain_key = "dsa"
            active_score = dsa_score
        else:
            overall_score = web_dev_score
            active_domain_title = "Web Development"
            active_domain_key = "webdev"
            active_score = web_dev_score

        # Backward compatibility rubric scores (0 to 5)
        conceptual_score = round(min(5.0, max(1.0, technical_depth_10 / 2.0)), 1)
        depth_score = round(min(5.0, max(1.0, (technical_depth_10 + complexity_analysis_10) / 4.0)), 1)
        problem_score = round(min(5.0, max(1.0, problem_solving_10 / 2.0)), 1)
        practical_score = round(min(5.0, max(1.0, (code_quality_10 + (dsa_score if is_dsa else web_dev_score) / 20.0) / 2.0)), 1)
        communication_score = round(min(5.0, max(1.0, communication_10 / 2.0)), 1)

        # 3. Categorized Deficits (Domain-Specific)
        knowledge_gaps = []
        reasoning_problems = []
        implementation_mistakes = []
        communication_problems = []

        if is_dsa:
            if not characteristics.get("analyzes_space_complexity"):
                knowledge_gaps.append("Formal auxiliary space complexity accounting under recursion and dynamic structures")
            if not characteristics.get("identifies_core_pattern"):
                knowledge_gaps.append("Identification of optimal data structure invariants (e.g. prefix frequency hashing)")
            if dsa_score < 75:
                knowledge_gaps.append("Amortized vs worst-case complexity trade-offs in hash table collisions")

            if not characteristics.get("optimizes_own_solution"):
                reasoning_problems.append("Difficulty transitioning from brute force baseline to sub-quadratic optimization without prompts")
            if hints_used >= 2:
                reasoning_problems.append(f"Required {hints_used} progressive hints to formulate optimal window bounds")

            if code_submitted_count == 0:
                implementation_mistakes.append("Did not provide completed code implementation in the sandbox editor")
            elif not characteristics.get("considers_edge_cases"):
                implementation_mistakes.append("Overlooked boundary edge cases (empty collection, single element, negative keys)")
        else:
            if web_dev_score < 75:
                knowledge_gaps.append("Stateless JWT revocation mechanics and CSRF protection headers (SameSite)")
            if not characteristics.get("identifies_core_pattern"):
                knowledge_gaps.append("JavaScript Event Loop task queue priority (Microtasks vs Macrotasks)")
            if web_dev_score < 80:
                knowledge_gaps.append("Database query optimization and index design under high write contention")

            if not characteristics.get("optimizes_own_solution"):
                reasoning_problems.append("Trade-offs in client-side caching vs server-side cache invalidation")
            if hints_used >= 2:
                reasoning_problems.append(f"Required {hints_used} hints to structure debouncing/throttling closure semantics")

            if code_submitted_count == 0:
                implementation_mistakes.append("Did not provide completed JavaScript implementation in the editor")
            elif not characteristics.get("considers_edge_cases"):
                implementation_mistakes.append("Overlooked edge cases such as immediate function execution or unhandled Promise rejections")

        if characteristics.get("jumps_to_coding_early"):
            communication_problems.append("Tendency to jump directly into coding before clarifying requirements and constraints")
        if total_words < 40:
            communication_problems.append("Very concise explanations; could expand verbal reasoning on design trade-offs")

        # 4. Qualitative Lists (Strictly Domain-Separated)
        strongest_areas = []
        weakest_areas = []
        repeated_mistakes = []

        if is_dsa:
            if problem_solving_10 >= 8.0: strongest_areas.append("Algorithmic problem decomposition and approach selection")
            if complexity_analysis_10 >= 8.0: strongest_areas.append("Rigorous Big-O time and space complexity evaluation")
            if communication_10 >= 8.0: strongest_areas.append("Clear, structured technical communication and rationale defense")
            if code_quality_10 >= 8.0: strongest_areas.append("Clean LeetCode-style solution implementation and pointer manipulation")
            if not strongest_areas: strongest_areas.append("Core foundational data structure comprehension")

            if complexity_analysis_10 < 7.5: weakest_areas.append("Space complexity and auxiliary memory overhead analysis")
            if debugging_10 < 7.5: weakest_areas.append("Anticipating boundary conditions and edge-case counterexamples")
            if problem_solving_10 < 7.5: weakest_areas.append("Sub-quadratic algorithmic pattern identification under pressure")
            if not weakest_areas: weakest_areas.append("Handling high-constraint edge cases and memory limits")

            improvement_topics = [
                "Two Pointers & Sliding Window edge-case handling",
                "Hash Table lookup invariants and collision handling",
                "Binary Search on Answer / Monotonic Predicates",
                "Time and space amortized complexity analysis"
            ]

            if overall_score >= 80:
                recommended_topics = ["Dynamic Programming Space Optimization", "Segment Trees & Fenwick Trees", "Monotonic Queue & Deque"]
                suggested_difficulty = "Advanced"
            elif overall_score >= 60:
                recommended_topics = ["Sliding Window & Two Pointers", "Binary Tree DFS/BFS Traversal", "Heap / Priority Queue Patterns"]
                suggested_difficulty = "Intermediate"
            else:
                recommended_topics = ["Array Traversal & In-Place Swaps", "Hash Map Lookups & Sets", "Recursion Base Cases & Call Stack"]
                suggested_difficulty = "Beginner"

            perf_summary = (
                f"Candidate completed a dedicated Data Structures & Algorithms (DSA) interview scoring {overall_score}/100. "
                f"Problem-solving was rated {problem_solving_10}/10 with {complexity_analysis_10}/10 in complexity analysis and {communication_10}/10 in technical communication. "
                f"The candidate {'effectively optimized their initial approach to optimal bounds' if characteristics.get('optimizes_own_solution') else 'required guided nudges to reach optimal bounds'}, "
                f"using {hints_used} hint(s) across the interview session."
            )
        else:
            if technical_depth_10 >= 8.0: strongest_areas.append("Practical full-stack web architecture and asynchronous event flows")
            if communication_10 >= 8.0: strongest_areas.append("Clear explanation of HTTP lifecycle, headers, and state management")
            if problem_solving_10 >= 8.0: strongest_areas.append("System scalability decomposition and API security best practices")
            if not strongest_areas: strongest_areas.append("Foundational client-server communication principles")

            if technical_depth_10 < 7.5: weakest_areas.append("Security mitigations against XSS vs CSRF in token storage")
            if code_quality_10 < 7.5: weakest_areas.append("Closure scope management and asynchronous event timing")
            if not weakest_areas: weakest_areas.append("Distributed caching invalidation under high traffic")

            improvement_topics = [
                "HttpOnly cookies with SameSite attributes vs localStorage",
                "Stateless JWT blacklist caching using Redis with TTL",
                "JavaScript Event Loop (Microtask vs Macrotask queue)",
                "React Reconciliation & Virtual DOM Diffing"
            ]

            if overall_score >= 80:
                recommended_topics = ["Distributed Caching with Redis", "Event-Driven WebSockets & SSE", "Database Sharding & Read Replicas"]
                suggested_difficulty = "Advanced"
            elif overall_score >= 60:
                recommended_topics = ["JWT Refresh Token Rotation", "SQL Indexing & Explain Plans", "REST API Idempotency & Rate Limiting"]
                suggested_difficulty = "Intermediate"
            else:
                recommended_topics = ["DOM Event Propagation & Promises", "Async/Await Error Handling", "HTTP Methods & Status Codes"]
                suggested_difficulty = "Beginner"

            perf_summary = (
                f"Candidate completed a dedicated Web Development interview scoring {overall_score}/100. "
                f"Technical depth was rated {technical_depth_10}/10 with {problem_solving_10}/10 in architectural problem-solving and {communication_10}/10 in communication clarity. "
                f"The candidate demonstrated {'strong architectural grounding' if web_dev_score >= 75 else 'acceptable baseline knowledge with room to strengthen security mitigations'}, "
                f"using {hints_used} hint(s) across the session."
            )

        if hints_used >= 2: repeated_mistakes.append("Relying on interviewer hints to structure optimal bounds")
        if characteristics.get("jumps_to_coding_early"): repeated_mistakes.append("Premature implementation before articulating algorithmic/architectural rationale")
        if not repeated_mistakes: repeated_mistakes.append("None detected during this session")

        confidence = 0.96
        flagged = session.flagged_for_review
        flag_reason = session.flag_reason
        if total_words < 40:
            confidence -= 0.30
            flagged = True
            flag_reason = "Very low spoken word count across answers."
        if session.flagged_for_review:
            confidence = min(confidence, 0.65)
        confidence = round(max(0.1, min(1.0, confidence)), 2)

        evaluation_report = {
            "overall_score": overall_score,
            "interview_track": active_domain_key,
            "track_title": active_domain_title,
            "dsa_score": dsa_score if is_dsa else None,
            "web_dev_score": web_dev_score if is_web else None,
            "subscores": {
                "problem_solving": problem_solving_10,
                "communication": communication_10,
                "technical_depth": technical_depth_10,
                "code_quality": code_quality_10,
                "complexity_analysis": complexity_analysis_10,
                "debugging": debugging_10,
                "adaptability": adaptability_10
            },
            "strongest_areas": strongest_areas,
            "weakest_areas": weakest_areas,
            "repeated_mistakes": repeated_mistakes,
            "improvement_topics": improvement_topics,
            "performance_summary": perf_summary,
            "recommended_topics": recommended_topics,
            "suggested_difficulty": suggested_difficulty,
            "category_breakdown": {
                "knowledge_gaps": knowledge_gaps or ["None significant identified"],
                "reasoning_problems": reasoning_problems or ["None significant identified"],
                "implementation_mistakes": implementation_mistakes or ["None significant identified"],
                "communication_problems": communication_problems or ["None significant identified"]
            }
        }

        # Clear existing score if re-scoring
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
            total_score=overall_score,
            dsa_score=dsa_score,
            web_dev_score=web_dev_score,
            problem_solving_10=problem_solving_10,
            communication_10=communication_10,
            technical_depth_10=technical_depth_10,
            code_quality_10=code_quality_10,
            complexity_analysis_10=complexity_analysis_10,
            debugging_10=debugging_10,
            adaptability_10=adaptability_10,
            confidence=confidence,
            feedback=perf_summary,
            evaluation_report=evaluation_report,
            scoring_prompt_version=SCORING_PROMPT_VERSION,
            created_at=time.time()
        )
        self.db.add(viva_score)
        self.db.flush()

        # Evidence linking with transcript timestamps and direct quotes
        concept_ans = next((a for a in answers if a.answer_quality in [AnswerQuality.STRONG, AnswerQuality.CORRECT]), answers[0] if answers else None)
        depth_ans = next((a for a in answers if a.answer_quality == AnswerQuality.STRONG and a.end_time_sec > 180), answers[-1] if answers else None)
        problem_ans = next((a for a in answers if a.code_snippet), answers[-1] if answers else None)
        comm_ans = answers[0] if answers else None

        evidence_items = [
            (
                "Problem Solving",
                problem_solving_10 / 2.0,
                f"Candidate demonstrated methodical approach selection ({', '.join(concept_ans.detected_concepts) if concept_ans and concept_ans.detected_concepts else 'sound decomposition'}).",
                concept_ans.transcript if concept_ans else "Decomposed algorithm step-by-step.",
                concept_ans.start_time_sec if concept_ans else 0.0,
                concept_ans.end_time_sec if concept_ans else 60.0
            ),
            (
                "Technical Depth",
                technical_depth_10 / 2.0,
                "Candidate articulated trade-offs, edge cases, and runtime complexity.",
                depth_ans.transcript if depth_ans else "Discussed invariants and trade-offs.",
                depth_ans.start_time_sec if depth_ans else 180.0,
                depth_ans.end_time_sec if depth_ans else 240.0
            ),
            (
                "Code Quality",
                code_quality_10 / 2.0,
                "Candidate implemented and structured solution in code sandbox.",
                problem_ans.code_snippet[:120] if problem_ans and problem_ans.code_snippet else (problem_ans.transcript if problem_ans else "Code verified in sandbox."),
                problem_ans.start_time_sec if problem_ans else 300.0,
                problem_ans.end_time_sec if problem_ans else 400.0
            ),
            (
                "Communication",
                communication_10 / 2.0,
                "Delivered concise, structured explanations without excessive stalling.",
                comm_ans.transcript[:100] + "..." if comm_ans else "Clear verbal communication.",
                comm_ans.start_time_sec if comm_ans else 0.0,
                comm_ans.end_time_sec if comm_ans else 30.0
            ),
            (
                "Complexity Analysis",
                complexity_analysis_10 / 2.0,
                "Evaluated asymptotic time and auxiliary memory boundaries.",
                depth_ans.transcript if depth_ans else "Evaluated Big-O boundaries.",
                depth_ans.start_time_sec if depth_ans else 200.0,
                depth_ans.end_time_sec if depth_ans else 260.0
            )
        ]

        for dim, s_val, reason, quote, t_start, t_end in evidence_items:
            ev = ScoreEvidence(
                score_id=viva_score.id,
                dimension=dim,
                dimension_score=round(s_val, 1),
                reason=reason,
                quote=quote,
                transcript_start=t_start,
                transcript_end=t_end
            )
            self.db.add(ev)

        session.final_score = overall_score
        session.confidence = confidence
        session.flagged_for_review = flagged
        session.flag_reason = flag_reason
        session.status = SessionStatus.COMPLETED
        session.current_phase = SessionPhase.COMPLETED
        session.ended_at = time.time()

        self.db.commit()
        self.db.refresh(viva_score)
        return viva_score
