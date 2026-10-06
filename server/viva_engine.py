import os
import re
import time
import json
import random
from typing import Dict, Any, List, Optional, Tuple
import requests
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from server.models import (
    VivaSession, QuestionAsked, StudentAnswer, Question, Topic,
    SessionPhase, SessionStatus, QuestionType, AnswerQuality,
    FollowupAction, IntegrityLog
)
from server.prompts import AI_TECHNICAL_INTERVIEWER_SYSTEM_PROMPT

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

# Structured DSA Problems with explicit sections (Section 3 & 4)
DSA_PROBLEMS = {
    "two_sum": {
        "id": "two_sum",
        "title": "Two Sum",
        "level": "Beginner",
        "statement": "Given an array of integers nums and an integer target, return the indices of the two numbers such that they add up to target.",
        "input_desc": "nums: List[int], target: int",
        "output_desc": "List[int] containing the 0-based indices of the two elements.",
        "constraints": "- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9\n- -10^9 <= target <= 10^9\n- Exactly one valid answer exists.\n- You may not use the same element twice.",
        "examples": "Example 1:\nInput: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1] (Explanation: nums[0] + nums[1] == 9)\n\nExample 2:\nInput: nums = [3, 2, 4], target = 6\nOutput: [1, 2]",
        "expected_concepts": ["hash map", "hash table", "complement", "O(N) time", "O(N) space", "two pointers"],
        "hints": [
            "Think about what information you need to look up for each number as you iterate through the array.",
            "Consider whether a hash table or dictionary can help you look up the required complement (target - current_num) in average O(1) time.",
            "As you traverse each element at index i, check if (target - nums[i]) is already stored in your hash map. If so, return [map[target - nums[i]], i]. If not, insert nums[i] -> i.",
            "Initialize an empty map seen = {}. Loop index i, value n in nums: if (target - n) in seen, return [seen[target - n], i]. Otherwise set seen[n] = i."
        ],
        "follow_up_sorted": "What if the input array is already sorted in ascending order? How would you solve this without using extra memory (in O(1) auxiliary space)?"
    },
    "longest_substring": {
        "id": "longest_substring",
        "title": "Longest Substring Without Repeating Characters",
        "level": "Intermediate",
        "statement": "Given a string s, find the length of the longest substring without repeating characters.",
        "input_desc": "s: str",
        "output_desc": "int representing the length of the longest substring.",
        "constraints": "- 0 <= s.length <= 5 * 10^4\n- s consists of English letters, digits, symbols and spaces.",
        "examples": "Example 1:\nInput: s = \"abcabcbb\"\nOutput: 3 (Explanation: The answer is \"abc\", with length 3)\n\nExample 2:\nInput: s = \"bbbbb\"\nOutput: 1 (Explanation: The answer is \"b\", length 1)\n\nExample 3:\nInput: s = \"pwwkew\"\nOutput: 3 (Explanation: The answer is \"wke\", length 3)",
        "expected_concepts": ["sliding window", "two pointers", "hash set", "hash map", "O(N) time", "frequency map"],
        "hints": [
            "Think about maintaining a contiguous window of characters as you scan through the string from left to right.",
            "Can you use the Two Pointers or Sliding Window pattern with a hash set or dictionary to track characters in the current window?",
            "Use two pointers, left and right. Expand right to include characters until you see a duplicate, then shrink left until the duplicate is expelled.",
            "Store the last seen index of each character in a map seen = {}. When a duplicate char is seen at index right, advance left = max(left, seen[char] + 1) and record max_len = max(max_len, right - left + 1)."
        ],
        "follow_up_sorted": "How would you optimize this if the character set is strictly limited to 26 lowercase English letters or ASCII, rather than arbitrary Unicode?"
    },
    "subarray_sum": {
        "id": "subarray_sum",
        "title": "Subarray Sum Equals K",
        "level": "Advanced",
        "statement": "Given an array of integers nums and an integer k, return the total number of non-empty subarrays whose sum equals to k.",
        "input_desc": "nums: List[int], k: int",
        "output_desc": "int representing the count of continuous subarrays with sum k.",
        "constraints": "- 1 <= nums.length <= 2 * 10^4\n- -1000 <= nums[i] <= 1000\n- -10^7 <= k <= 10^7",
        "examples": "Example 1:\nInput: nums = [1, 1, 1], k = 2\nOutput: 2\n\nExample 2:\nInput: nums = [1, 2, 3], k = 3\nOutput: 2 (Subarrays: [1, 2] and [3])",
        "expected_concepts": ["prefix sum", "hash map", "cumulative sum", "O(N) time", "O(N) space", "negative numbers"],
        "hints": [
            "Notice that the array can contain negative numbers, so a standard two-pointer sliding window cannot expand/contract monotonically.",
            "Think about cumulative prefix sums: if prefix_sum[j] - prefix_sum[i] == k, what does that tell you about the subarray from i to j?",
            "Store prefix sum frequencies in a hash map: prefix_counts = {0: 1}. At each element, update current_sum and add prefix_counts[current_sum - k] to total.",
            "Initialize prefix_map = {0: 1}, count = 0, current_sum = 0. For n in nums: current_sum += n; count += prefix_map.get(current_sum - k, 0); prefix_map[current_sum] = prefix_map.get(current_sum, 0) + 1."
        ],
        "follow_up_sorted": "Why does a two-pointer sliding window fail when negative numbers are present, whereas it works when all numbers are strictly positive?"
    }
}

class VivaEngine:
    def __init__(self, db: Session):
        self.db = db
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")

    def calculate_phase(self, elapsed_sec: float, duration_minutes: int = 15, questions_asked_count: int = 0) -> SessionPhase:
        """Determines the viva phase based on configured duration or question count (unlimited)."""
        if duration_minutes <= 0:
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
        Analyzes candidate's answer with Bloom/rubric extraction.
        """
        if is_silence:
            return AnswerQuality.NO_ANSWER, FollowupAction.MOVE_ON, [], []

        if is_giveup or any(phrase in raw_transcript.lower() for phrase in ["i don't know", "no idea", "skip this", "move on", "not sure"]):
            return AnswerQuality.NO_ANSWER, FollowupAction.MOVE_ON, [], []

        if is_hint_req or any(phrase in raw_transcript.lower() for phrase in ["can you give me a hint", "need a hint", "give a hint"]):
            return AnswerQuality.PARTIAL, FollowupAction.HINT, [], []

        if self.detect_prompt_injection(raw_transcript):
            return AnswerQuality.OFF_TOPIC, FollowupAction.REDIRECT, [], []

        detected = []
        missing = []
        expected = question.expected_concepts if question and question.expected_concepts else []

        normalized = self.normalize_hinglish(raw_transcript)

        for concept in expected:
            c_low = concept.lower()
            if c_low in normalized or any(word in normalized for word in c_low.split() if len(word) > 3):
                detected.append(concept)
            else:
                missing.append(concept)

        words = normalized.split()
        total_words = len(words)

        if total_words > 10 and len(detected) == 0 and not any(kw in normalized for kw in ["time", "data", "algorithm", "complexity", "structure", "function", "node", "tree", "array", "token", "react", "express", "hash", "pointer", "cookie", "sql"]):
            return AnswerQuality.OFF_TOPIC, FollowupAction.REDIRECT, detected, missing

        if len(expected) > 0:
            coverage = len(detected) / len(expected)
            if coverage >= 0.65 and total_words >= 12:
                return AnswerQuality.STRONG, FollowupAction.DEEPER, detected, missing
            elif coverage >= 0.35:
                return AnswerQuality.CORRECT, FollowupAction.DEEPER, detected, missing
            elif coverage > 0 or total_words >= 8:
                return AnswerQuality.PARTIAL, FollowupAction.HINT, detected, missing
            else:
                return AnswerQuality.SHALLOW, FollowupAction.HINT, detected, missing
        else:
            if total_words > 25:
                return AnswerQuality.STRONG, FollowupAction.DEEPER, detected, missing
            elif total_words >= 10:
                return AnswerQuality.CORRECT, FollowupAction.DEEPER, detected, missing
            else:
                return AnswerQuality.PARTIAL, FollowupAction.HINT, detected, missing

    def _call_llm_interviewer(self, session: VivaSession, conversation_history: List[Dict[str, str]], latest_input: str, code_snippet: Optional[str] = None) -> Optional[str]:
        """
        Attempts to call Groq / OpenAI LLM using the Master Prompt.
        Returns generated next question text or None on failure/missing keys.
        """
        profile = session.interview_profile or {}
        hints_used = profile.get("hints_used", 0)

        # Build message log
        system_content = AI_TECHNICAL_INTERVIEWER_SYSTEM_PROMPT + f"""

[CURRENT INTERVIEW CONTEXT]
Candidate Name: {session.student_name}
Target Domain: {session.preferred_domain or 'DSA & Web Development'}
Target Level: {session.interview_level or 'Intermediate'}
Elapsed Seconds: {session.elapsed_seconds}
Hints Used So Far: {hints_used}

REMINDERS:
- Ask exactly ONE concise question at a time.
- Do NOT dump multiple questions.
- Do NOT reveal the answer.
- Probe the quality of thinking.
- If code was submitted, evaluate correctness, complexity, or edge cases.
"""

        messages = [{"role": "system", "content": system_content}]
        for turn in conversation_history[-8:]:
            messages.append({"role": turn.get("role", "user"), "content": turn.get("content", "")})

        curr_msg = latest_input
        if code_snippet:
            curr_msg += f"\n[Candidate Code Submitted in Editor]:\n```{code_snippet}```"
        messages.append({"role": "user", "content": curr_msg})

        # Try Groq first (ultra-fast)
        if self.groq_api_key:
            try:
                res = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.groq_api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": messages,
                        "temperature": 0.4,
                        "max_tokens": 300
                    },
                    timeout=5
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"].strip()
                    if content:
                        return content
            except Exception as e:
                print(f"[VivaEngine] Groq LLM failed: {e}")

        # Try OpenAI
        if self.openai_api_key:
            try:
                res = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.openai_api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": messages,
                        "temperature": 0.4,
                        "max_tokens": 300
                    },
                    timeout=6
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"].strip()
                    if content:
                        return content
            except Exception as e:
                print(f"[VivaEngine] OpenAI LLM failed: {e}")

        return None

    def _format_dsa_problem(self, problem: Dict[str, Any]) -> str:
        """Formats problem strictly as required by Section 3."""
        return (
            f"Here is our DSA problem on {problem['title']}:\n\n"
            f"**Problem Statement:**\n{problem['statement']}\n\n"
            f"**Input Description:**\n{problem['input_desc']}\n\n"
            f"**Output Description:**\n{problem['output_desc']}\n\n"
            f"**Constraints:**\n{problem['constraints']}\n\n"
            f"**Examples:**\n{problem['examples']}\n\n"
            "Take a moment to review this. Before writing any code, please explain your understanding of the problem, any observations, and what approach you are considering."
        )

    def select_next_turn(
        self,
        session: VivaSession,
        student_transcript: str,
        code_snippet: Optional[str],
        is_giveup: bool,
        is_silence: bool,
        is_hint_req: bool
    ) -> Tuple[str, Optional[int], QuestionType, Dict[str, Any]]:
        """
        Stateful, adaptive interviewer logic following all 19 guidelines.
        """
        profile = session.interview_profile or {}
        q_count = len(session.questions_asked)
        lowered_input = student_transcript.lower()

        # Update interview profile memory
        stage = profile.get("stage", "INTRO")
        preferred_domain = profile.get("preferred_domain", session.preferred_domain or "dsa")
        level = profile.get("level", session.interview_level or "Intermediate")
        hints_used = profile.get("hints_used", 0)
        hint_level = profile.get("hint_level", 0)
        characteristics = profile.get("characteristics", {
            "asks_clarifying_questions": False,
            "identifies_core_pattern": False,
            "jumps_to_coding_early": False,
            "explains_reasoning": False,
            "derives_approach_independently": False,
            "recognizes_brute_force": False,
            "optimizes_own_solution": False,
            "analyzes_time_complexity": False,
            "analyzes_space_complexity": False,
            "considers_edge_cases": False,
            "debugs_own_code": False,
            "responds_to_counterexamples": False,
            "adapts_to_changed_constraints": False
        })

        # Observe candidate characteristics from current turn
        if "?" in student_transcript or any(w in lowered_input for w in ["can the", "is it guaranteed", "are there duplicates", "what if"]):
            characteristics["asks_clarifying_questions"] = True
        if any(w in lowered_input for w in ["hash map", "hash table", "two pointer", "sliding window", "binary search", "prefix sum", "recursion", "dynamic programming"]):
            characteristics["identifies_core_pattern"] = True
        if any(w in lowered_input for w in ["because", "since", "reason", "approach", "the idea is"]):
            characteristics["explains_reasoning"] = True
        if any(w in lowered_input for w in ["o(n)", "o(1)", "o(log n)", "o(n^2)", "linear time", "constant time"]):
            characteristics["analyzes_time_complexity"] = True
        if any(w in lowered_input for w in ["o(n) space", "o(1) space", "extra memory", "auxiliary space"]):
            characteristics["analyzes_space_complexity"] = True
        if any(w in lowered_input for w in ["brute force", "nested loop", "check every pair"]):
            characteristics["recognizes_brute_force"] = True
        if any(w in lowered_input for w in ["optimize", "better way", "instead of nested", "hash map instead"]):
            characteristics["optimizes_own_solution"] = True
        if any(w in lowered_input for w in ["empty", "null", "single element", "negative", "duplicates", "edge case"]):
            characteristics["considers_edge_cases"] = True

        # Pick chosen DSA problem based on level
        prob_key = "two_sum" if level.lower() == "beginner" else ("subarray_sum" if level.lower() == "advanced" else "longest_substring")
        problem = DSA_PROBLEMS.get(prob_key, DSA_PROBLEMS["longest_substring"])

        # Handle Prompt Injection (Section 12 / Integrity)
        if self.detect_prompt_injection(student_transcript):
            return (
                "Let's stay focused on our technical interview. Could you explain the time and space complexity of the approach you were discussing?",
                None,
                QuestionType.CONCEPT,
                profile
            )

        # Handle Progressive Hints (Section 6)
        if is_hint_req or ("hint" in lowered_input and len(student_transcript.split()) < 10):
            hint_level = min(4, hint_level + 1)
            hints_used += 1
            profile["hints_used"] = hints_used
            profile["hint_level"] = hint_level
            hint_text = problem["hints"][hint_level - 1]
            return (
                f"[Hint Level {hint_level}]: {hint_text}\n\nHow does this guide your line of thinking?",
                None,
                QuestionType.WHY,
                profile
            )

        # Handle 'I don't know' or giving up (Section 2, 6, 10)
        if is_giveup or "i don't know" in lowered_input or "no idea" in lowered_input:
            if hint_level < 2:
                hint_level = 1
                hints_used += 1
                profile["hints_used"] = hints_used
                profile["hint_level"] = hint_level
                return (
                    f"That's completely fine. Let's break it down together with a small direction: {problem['hints'][0]}\n\nWhat comes to mind when you consider that?",
                    None,
                    QuestionType.CONCEPT,
                    profile
                )
            else:
                # Transition smoothly
                stage = "WEB_DEV_1"
                profile["stage"] = stage
                return (
                    "No problem at all! Let's switch gears and explore Web Development systems. Suppose you have a React frontend and Express backend. Explain how you would implement authentication using JWT. Where would you store the token, how would the server verify it, and what security concerns would you consider?",
                    None,
                    QuestionType.APPLIED,
                    profile
                )

        # STAGE 0: Introduction & Background Discovery (Section 19)
        if q_count == 0 or stage == "INTRO":
            # Extract preferred domain and level from candidate's answer
            if "web" in lowered_input:
                preferred_domain = "webdev"
            elif "dsa" in lowered_input or "data structure" in lowered_input or "algorithm" in lowered_input:
                preferred_domain = "dsa"
            
            if "beginner" in lowered_input:
                level = "Beginner"
            elif "advanced" in lowered_input:
                level = "Advanced"
            elif "intermediate" in lowered_input:
                level = "Intermediate"

            profile["preferred_domain"] = preferred_domain
            profile["level"] = level
            profile["stage"] = "WARMUP"
            session.preferred_domain = preferred_domain
            session.interview_level = level

            # Warm-up question (Section 16)
            if preferred_domain == "webdev":
                warmup_q = "Thank you for the introduction! Let's start with a foundational web question: How does the browser Event Loop coordinate the execution of synchronous code, microtasks (like Promises), and macrotasks (like setTimeout)?"
            else:
                warmup_q = "Thank you for the introduction! Let's warm up with a foundational question: What are the differences between an Array and a Linked List in memory allocation, and how do their insertion and lookup complexities compare?"
            
            return (warmup_q, None, QuestionType.CONCEPT, profile)

        # STAGE 1: Transition from Warmup to DSA Assessment (Section 3, 4, 16)
        if stage == "WARMUP":
            profile["stage"] = "DSA_PRESENTED"
            profile["dsa_problem_id"] = prob_key
            problem_text = self._format_dsa_problem(problem)
            return (problem_text, None, QuestionType.CONCEPT, profile)

        # STAGE 2: Candidate Explains Understanding / Approach (Section 3, 5, 7)
        if stage == "DSA_PRESENTED":
            # Check if candidate jumped straight to code without explaining (Section 3 & 7)
            if code_snippet and len(student_transcript.split()) < 10:
                characteristics["jumps_to_coding_early"] = True
                profile["stage"] = "DSA_APPROACH_REASONING"
                return (
                    "I notice you jumped straight into writing code. In a technical interview, it's very important to communicate first. Before we inspect the code, could you explain your observations, what data structure you selected, and why you believe it is the optimal approach?",
                    None,
                    QuestionType.WHY,
                    profile
                )

            # Analyze approach: is it brute force or optimal?
            if any(w in lowered_input for w in ["brute force", "check all", "nested loop", "two loops"]):
                profile["stage"] = "DSA_OPTIMIZATION"
                return (
                    "Good, that brute force approach gives us a correct baseline. What would be the time and space complexity of that nested-loop approach, and can we optimize it to avoid redundant lookups?",
                    None,
                    QuestionType.TRADE_OFF,
                    profile
                )

            # Candidate proposed optimal or reasoned approach
            profile["stage"] = "DSA_CODING"
            return (
                "That is a very sound approach! What are the expected time and space complexities for this strategy, and are there any edge cases you'll need to handle once you implement it? Please also feel free to start writing your implementation in the code editor on the right.",
                None,
                QuestionType.TRADE_OFF,
                profile
            )

        # STAGE 3: DSA Optimization probing (Section 5 Stage 4 & 5)
        if stage == "DSA_OPTIMIZATION":
            profile["stage"] = "DSA_CODING"
            return (
                "Spot on! With that optimization in mind, what is your improved time complexity? Go ahead and write out your implementation in the code editor on the right screen.",
                None,
                QuestionType.CONCEPT,
                profile
            )

        # STAGE 4: Candidate Implementing Code / Reviewing Implementation (Section 5 Stage 6 & Section 13)
        if stage == "DSA_CODING":
            profile["stage"] = "DSA_CODE_REVIEW"
            if code_snippet and len(code_snippet.strip()) > 20:
                # Code evaluation (Section 13)
                # Check for edge cases
                return (
                    "Thank you for writing that out! Looking closely at your implementation, how does your code handle edge cases, such as an empty input, an array with duplicate values, or inputs where no pair exists?",
                    None,
                    QuestionType.EDGE_CASE,
                    profile
                )
            else:
                return (
                    "Please walk me through your code line by line. What is the role of each variable you defined, and how do you ensure the loop terminates correctly?",
                    None,
                    QuestionType.WHY,
                    profile
                )

        # STAGE 5: DSA Follow-up / Changed Constraint (Section 5 Stage 8, Section 7)
        if stage == "DSA_CODE_REVIEW":
            profile["stage"] = "WEB_DEV_1"
            followup_prompt = problem.get("follow_up_sorted", "What if the input size is scaled to 10^7 elements and memory is strictly limited? How would you modify your approach?")
            return (
                f"Well explained! Here is an optimization follow-up: {followup_prompt}",
                None,
                QuestionType.TRADE_OFF,
                profile
            )

        # STAGE 6: Web Development Assessment (Section 8 & 9)
        if stage == "WEB_DEV_1":
            profile["stage"] = "WEB_DEV_FOLLOWUP_1"
            # Section 9 scenario question
            return (
                "That wraps up our algorithmic discussion nicely! Let's now transition to Web Development systems:\n\n"
                "Suppose you have a React frontend and Express backend. Explain how you would implement authentication using JWT. Where would you store the token, how would the server verify it, and what security concerns would you consider?",
                None,
                QuestionType.APPLIED,
                profile
            )

        # STAGE 7: Web Development Follow-up 1 (Section 9 & 11)
        if stage == "WEB_DEV_FOLLOWUP_1":
            profile["stage"] = "WEB_DEV_FOLLOWUP_2"
            # Follow-up referencing their choice
            if "localstorage" in lowered_input:
                return (
                    "You mentioned storing the JWT in localStorage. Why choose that over an httpOnly cookie, and what makes localStorage susceptible to XSS (Cross-Site Scripting) attacks? How would you protect against that?",
                    None,
                    QuestionType.WHY,
                    profile
                )
            elif "cookie" in lowered_input or "httponly" in lowered_input:
                return (
                    "You chose httpOnly cookies, which is great for mitigating XSS. However, does storing cookies expose your API to CSRF (Cross-Site Request Forgery), and what headers or SameSite attributes would you configure to prevent that?",
                    None,
                    QuestionType.TRADE_OFF,
                    profile
                )
            else:
                return (
                    "Following up on your authentication flow: What happens when the access token expires while the user is actively working? How would you implement a refresh token mechanism without disrupting the user experience?",
                    None,
                    QuestionType.WHY,
                    profile
                )

        # STAGE 8: Web Development Follow-up 2 (Token Revocation & Route Protection) (Section 9)
        if stage == "WEB_DEV_FOLLOWUP_2":
            profile["stage"] = "WRAPUP"
            return (
                "Since standard JWTs are stateless, what happens if a user clicks 'Logout' or a token is stolen? How would the server revoke an active JWT before its expiration timestamp? Also, how would you structure an Express middleware to protect private API routes?",
                None,
                QuestionType.TRADE_OFF,
                profile
            )

        # STAGE 9: Wrap-up & Final Conclusion (Section 16)
        profile["stage"] = "COMPLETED"
        return (
            "We have covered all primary DSA and Web Development competencies for this interview! You did a very thorough job reasoning through the algorithmic stages and web architectures. Is there any final clarification or insight you would like to share before we conclude and evaluate?",
            None,
            QuestionType.CONCEPT,
            profile
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
        recording acoustic telemetry, code submissions, and memory state.
        """
        start_time = time.time()
        session = self.db.query(VivaSession).filter(VivaSession.id == session_id).first()
        if not session:
            raise ValueError(f"Session {session_id} not found")

        duration_mins = session.duration_minutes if session.duration_minutes is not None else 15
        questions_count = len(session.questions_asked)
        new_phase = self.calculate_phase(elapsed_seconds, duration_minutes=duration_mins, questions_asked_count=questions_count)
        session.current_phase = new_phase
        session.elapsed_seconds = elapsed_seconds

        combined_text = student_transcript
        if code_snippet and code_snippet.strip():
            combined_text += f"\n[Code Implementation]:\n{code_snippet}"

        # Prompt injection logging
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

        last_question_asked = self.db.query(QuestionAsked).filter(
            QuestionAsked.session_id == session.id
        ).order_by(QuestionAsked.id.desc()).first()

        last_bank_q = None
        if last_question_asked and last_question_asked.question_id:
            last_bank_q = self.db.query(Question).filter(Question.id == last_question_asked.question_id).first()

        quality, action, detected, missing = self.analyze_answer(
            question=last_bank_q,
            raw_transcript=combined_text,
            is_giveup=is_giveup,
            is_silence=is_silence,
            is_hint_req=is_hint_req
        )

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

        # Build chat history for LLM
        history = []
        for qa in session.questions_asked:
            history.append({"role": "assistant", "content": qa.question_text})
            matching_ans = next((a for a in session.answers if a.question_asked_id == qa.id), None)
            if matching_ans:
                history.append({"role": "user", "content": matching_ans.transcript})

        # Try LLM first if configured
        next_text = None
        next_qid = None
        next_qtype = QuestionType.CONCEPT

        if (self.groq_api_key or self.openai_api_key) and not is_silence and not is_giveup:
            llm_text = self._call_llm_interviewer(session, history, student_transcript, code_snippet)
            if llm_text:
                next_text = llm_text

        # Fallback to local adaptive interviewer engine
        if not next_text:
            local_text, local_qid, local_qtype, updated_profile = self.select_next_turn(
                session=session,
                student_transcript=student_transcript,
                code_snippet=code_snippet,
                is_giveup=is_giveup,
                is_silence=is_silence,
                is_hint_req=is_hint_req
            )
            next_text = local_text
            next_qid = local_qid
            next_qtype = local_qtype
            session.interview_profile = dict(updated_profile)
            flag_modified(session, "interview_profile")

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

        is_completed = (new_phase in [SessionPhase.SCORING, SessionPhase.COMPLETED]) or (session.interview_profile and session.interview_profile.get("stage") == "COMPLETED")

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
            "hints_used": session.interview_profile.get("hints_used", 0) if session.interview_profile else 0,
            "is_viva_completed": is_completed
        }
