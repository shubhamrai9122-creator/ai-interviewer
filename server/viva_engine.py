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
    FollowupAction, IntegrityLog, TrainedSyllabus
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

# Curated LeetCode Problems (Strictly LeetCode + Admin/Custom Only)
LEETCODE_PROBLEMS = {
    "two_sum": {
        "id": "leetcode_1_two_sum",
        "source_type": "LEETCODE",
        "number": 1,
        "title": "LeetCode #1: Two Sum",
        "level": "Easy",
        "topic": "Arrays & Hash Table",
        "statement": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
        "input_desc": "nums: vector<int>&, target: int",
        "output_desc": "vector<int>: indices of the two numbers",
        "constraints": "- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9\n- -10^9 <= target <= 10^9\n- Exactly one valid answer exists.",
        "examples": "Example 1:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].\n\nExample 2:\nInput: nums = [3,2,4], target = 6\nOutput: [1,2]\n\nExample 3:\nInput: nums = [3,3], target = 6\nOutput: [0,1]",
        "expected_concepts": ["hash map", "unordered_map", "complement", "O(N) time", "O(N) space", "two pointers"],
        "starter_code_cpp": """#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Return indices of the two numbers that add up to target
        
        return {};
    }
};
""",
        "starter_code_js": """/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Return indices of the two numbers that add up to target
    
    return [];
};
""",
        "hints": [
            "Think about what information you need to look up for each number as you iterate through the array.",
            "Consider whether a hash table (unordered_map in C++) can help you look up the required complement (target - current_num) in average O(1) time.",
            "As you traverse each element at index i, check if (target - nums[i]) is already in your hash map. If so, return {map[target - nums[i]], i}. Otherwise insert nums[i] -> i.",
            "Initialize unordered_map<int, int> seen. For i from 0 to n-1: int complement = target - nums[i]; if (seen.count(complement)) return {seen[complement], i}; seen[nums[i]] = i; return {}."
        ],
        "follow_up_sorted": "What if the input array is already sorted in ascending order? How would you solve this in O(1) auxiliary space without extra memory?"
    },
    "reverse_linked_list": {
        "id": "leetcode_206_reverse_linked_list",
        "source_type": "LEETCODE",
        "number": 206,
        "title": "LeetCode #206: Reverse Linked List",
        "level": "Easy",
        "topic": "Linked List",
        "statement": "Given the head of a singly linked list, reverse the list, and return the reversed list.",
        "input_desc": "head: ListNode*",
        "output_desc": "ListNode*: head of reversed list",
        "constraints": "- The number of nodes in the list is the range [0, 5000].\n- -5000 <= Node.val <= 5000",
        "examples": "Example 1:\nInput: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]\n\nExample 2:\nInput: head = [1,2]\nOutput: [2,1]\n\nExample 3:\nInput: head = []\nOutput: []",
        "expected_concepts": ["linked list", "prev pointer", "curr pointer", "next pointer", "iterative", "O(N) time", "O(1) space"],
        "starter_code_cpp": """/**
 * Definition for singly-linked list.
 * struct ListNode {
 *     int val;
 *     ListNode *next;
 *     ListNode() : val(0), next(nullptr) {}
 *     ListNode(int x) : val(x), next(nullptr) {}
 *     ListNode(int x, ListNode *next) : val(x), next(next) {}
 * };
 */
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        // Reverse singly linked list and return new head
        
        return nullptr;
    }
};
""",
        "starter_code_js": """/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 * @param {ListNode} head
 * @return {ListNode}
 */
var reverseList = function(head) {
    // Reverse singly linked list and return new head
    
    return null;
};
""",
        "hints": [
            "Think about manipulating pointers iteratively: at each node, what needs to point where?",
            "Maintain three pointers: prev (initially nullptr), curr (initially head), and next_node.",
            "In each step, save curr->next to next_node, point curr->next = prev, move prev = curr, and curr = next_node.",
            "Loop while (curr != nullptr): ListNode* nxt = curr->next; curr->next = prev; prev = curr; curr = nxt; Return prev."
        ],
        "follow_up_sorted": "Can you reverse the linked list recursively and explain the difference in call stack space complexity?"
    },
    "longest_substring": {
        "id": "leetcode_3_longest_substring",
        "source_type": "LEETCODE",
        "number": 3,
        "title": "LeetCode #3: Longest Substring Without Repeating Characters",
        "level": "Medium",
        "topic": "Sliding Window & Hash Set",
        "statement": "Given a string s, find the length of the longest substring without repeating characters.",
        "input_desc": "s: string",
        "output_desc": "int: length of longest substring without repeating characters",
        "constraints": "- 0 <= s.length <= 5 * 10^4\n- s consists of English letters, digits, symbols and spaces.",
        "examples": "Example 1:\nInput: s = \"abcabcbb\"\nOutput: 3\nExplanation: The answer is \"abc\", with length of 3.\n\nExample 2:\nInput: s = \"bbbbb\"\nOutput: 1\nExplanation: The answer is \"b\", with length of 1.\n\nExample 3:\nInput: s = \"pwwkew\"\nOutput: 3\nExplanation: The answer is \"wke\", with length of 3.",
        "expected_concepts": ["sliding window", "two pointers", "unordered_set", "hash map", "O(N) time"],
        "starter_code_cpp": """#include <iostream>
#include <string>
#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        // Return length of longest substring without repeating characters
        
        return 0;
    }
};
""",
        "starter_code_js": """/**
 * @param {string} s
 * @return {number}
 */
var lengthOfLongestSubstring = function(s) {
    // Return length of longest substring without repeating characters
    
    return 0;
};
""",
        "hints": [
            "Think about maintaining a contiguous window of characters as you scan through the string from left to right.",
            "Can you use the Two Pointers or Sliding Window pattern with a hash map to record the last seen index of each character?",
            "When a duplicate character is seen at index right, move left = max(left, last_seen[char] + 1).",
            "Initialize unordered_map<char, int> seen, max_len = 0, left = 0. For right from 0 to s.length()-1: if char in seen, left = max(left, seen[char] + 1); seen[char] = right; max_len = max(max_len, right - left + 1); Return max_len."
        ],
        "follow_up_sorted": "How would you optimize this if the character set is strictly 26 lowercase English letters or ASCII?"
    },
    "debounce": {
        "id": "leetcode_2627_debounce",
        "source_type": "LEETCODE",
        "number": 2627,
        "title": "LeetCode #2627: Debounce Async Dispatcher",
        "level": "Medium",
        "topic": "JavaScript Event Loop & Closures",
        "statement": "Given a function fn and a time in milliseconds t, return a debounced version of that function.\n\nA debounced function is a function whose execution is delayed by t milliseconds and whose execution is cancelled if it is called again within that window of time. The debounced function should also receive the passed parameters.",
        "input_desc": "fn: Function, t: number",
        "output_desc": "Function: debounced wrapper function",
        "constraints": "- 0 <= t <= 1000\n- fn returns void or promise",
        "examples": "Example 1:\nInput: t = 50, calls = [{\"t\": 50, inputs: [1]}, {\"t\": 75, inputs: [2]}]\nOutput: [{\"t\": 125, inputs: [2]}]\nExplanation: 1st call cancelled because 2nd call was triggered at 75ms before 50+50=100ms.",
        "expected_concepts": ["closure", "cleartimeout", "settimeout", "timer id", "event loop", "rest params"],
        "starter_code_js": """/**
 * @param {Function} fn
 * @param {number} t milliseconds
 * @return {Function}
 */
var debounce = function(fn, t) {
    let timerId = null;
    return function(...args) {
        // Return debounced function execution
        
    };
};
""",
        "starter_code_cpp": """#include <iostream>
#include <chrono>
#include <functional>
using namespace std;

class DebounceWorker {
public:
    void dispatch(int delayMs, function<void()> fn) {
        // C++ Async Debounced Worker
    }
};
""",
        "hints": [
            "Use a closure to keep track of a timerId variable across repeated invocations.",
            "Each time the returned wrapper function is called, immediately invoke clearTimeout(timerId).",
            "Then set timerId = setTimeout(() => fn(...args), t) so only the final call in the burst executes.",
            "let timer; return function(...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), t); };"
        ],
        "follow_up_sorted": "What is the difference between debounce and throttle, and when would you use throttle for UI scroll listeners instead?"
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

    def generate_continuous_followup(self, candidate_text: str, domain: str) -> str:
        """
        Continuously analyzes what the candidate just explained and generates
        a relevant, Socratic follow-up question directly linked to their answer.
        """
        lowered = candidate_text.lower()

        # 1. Linked list / pointer discussion
        if any(k in lowered for k in ["linked list", "node", "pointer", "reverse", "singly"]):
            return (
                "You explained pointer operations in linked lists nicely. Building directly on that: "
                "if you were asked to find the middle node or count the total number of nodes in a singly linked list in a single pass without knowing the length in advance, "
                "what two-pointer approach (fast and slow pointers) would you use?"
            )

        # 2. Array / Contiguous / Dynamic resizing
        if any(k in lowered for k in ["array", "vector", "contiguous", "index", "realloc", "cache", "memory"]):
            return (
                "Good point on contiguous memory. How does dynamic array resizing (like std::vector in C++) achieve amortized O(1) push_back operations, "
                "and what happens to memory cache locality during traversal compared to node-based structures?"
            )

        # 3. Hash map / lookup / collisions
        if any(k in lowered for k in ["hash", "hashmap", "map", "dictionary", "key", "lookup", "bucket"]):
            return (
                "That's a sound explanation of key-value lookup. How do hash tables resolve hash collisions when two distinct keys map to the exact same bucket index? "
                "What is the trade-off between separate chaining and open addressing?"
            )

        # 4. Stack / Queue / LIFO / FIFO
        if any(k in lowered for k in ["stack", "queue", "lifo", "fifo", "push", "pop"]):
            return (
                "Exactly. How would you implement a Queue using two Stacks while preserving amortized O(1) time complexity for enqueue and dequeue operations?"
            )

        # 5. Recursion / Call stack
        if any(k in lowered for k in ["recursion", "recursive", "call stack", "base case", "tree"]):
            return (
                "You highlighted recursive decomposition. What causes a stack overflow in recursive execution, "
                "and how can tail-call optimization or iterative memoization prevent excessive call stack growth?"
            )

        # 6. Event loop / Promises / Async
        if any(k in lowered for k in ["event loop", "microtask", "macrotask", "promise", "async", "await"]):
            return (
                "Good explanation of asynchronous execution. In the JavaScript Event Loop, what is the exact execution priority between Promise microtasks (Promise.then) "
                "and macrotasks (setTimeout / setInterval) when the call stack clears?"
            )

        # 7. React / Virtual DOM / Reconciliation
        if any(k in lowered for k in ["react", "state", "hook", "re-render", "virtual dom", "fiber"]):
            return (
                "Building on component rendering in React: what causes stale closures inside useEffect or useCallback, "
                "and how does React 18 automatic state batching optimize render performance?"
            )

        # 8. JWT / Cookies / Auth / Security
        if any(k in lowered for k in ["jwt", "token", "cookie", "auth", "session", "cors", "csrf", "xss"]):
            return (
                "Good explanation of token authentication. Why is storing an access token in localStorage vulnerable to Cross-Site Scripting (XSS), "
                "and how does an httpOnly cookie with the SameSite attribute mitigate CSRF attacks?"
            )

        # Fallback continuous question
        if domain == "webdev":
            return (
                "Interesting reasoning on that web architecture concept. Can you think about it from this perspective: "
                "how would this architecture scale under heavy concurrent traffic, and what caching strategy (like Redis or browser HTTP cache) would you add?"
            )
        else:
            return (
                "Interesting observation on that data structure. Can you think about it from this perspective: "
                "what happens to the auxiliary space complexity and call stack if you implement that iteratively versus recursively?"
            )

    def _format_coding_problem(self, problem: Dict[str, Any]) -> str:
        """Formats coding problem for the LeetCode box display."""
        source_badge = f"📋 **[From Candidate's Uploaded Syllabus: {problem.get('syllabus_title')}]**\n\n" if problem.get("syllabus_title") else f"🏷️ **[{problem.get('title', 'LeetCode Problem')}]** • Difficulty: **{problem.get('level', 'Medium')}**\n\n"
        return (
            f"{source_badge}**Problem Statement:**\n{problem['statement']}\n\n"
            f"**Input Description:**\n{problem['input_desc']}\n\n"
            f"**Output Description:**\n{problem['output_desc']}\n\n"
            f"**Constraints:**\n{problem['constraints']}\n\n"
            f"**Examples:**\n{problem['examples']}\n\n"
            "Take a moment to review this. Please explain your observations, approach, and Big-O complexity before coding."
        )

    def select_next_turn(
        self,
        session: VivaSession,
        student_transcript: str,
        code_snippet: Optional[str],
        is_giveup: bool,
        is_silence: bool,
        is_hint_req: bool
    ) -> Tuple[str, str, bool, bool, Optional[Dict[str, Any]], Optional[int], QuestionType, Dict[str, Any]]:
        """
        Stateful, adaptive interviewer logic following MSOT & LeetCode specifications.
        Returns:
        (ai_response_text, audio_spoken_text, is_coding_question, should_ask_to_read, coding_problem_details, next_qid, next_qtype, updated_profile)
        """
        profile = session.interview_profile or {}
        q_count = len(session.questions_asked)
        lowered_input = student_transcript.lower()

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

        # Observe candidate characteristics
        if "?" in student_transcript or any(w in lowered_input for w in ["can the", "is it guaranteed", "are there duplicates", "what if"]):
            characteristics["asks_clarifying_questions"] = True
        if any(w in lowered_input for w in ["hash map", "unordered_map", "two pointer", "sliding window", "binary search", "prefix sum", "recursion", "dynamic programming"]):
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

        profile["characteristics"] = characteristics

        # Determine chosen LeetCode or Custom Syllabus Problem
        custom_syllabus = None
        if hasattr(session, "active_syllabus_id") and session.active_syllabus_id:
            custom_syllabus = self.db.query(TrainedSyllabus).filter(TrainedSyllabus.id == session.active_syllabus_id).first()
        if not custom_syllabus:
            target_sub = "Web Development" if preferred_domain == "webdev" else "Data Structures & Algorithms"
            custom_syllabus = self.db.query(TrainedSyllabus).filter(
                TrainedSyllabus.is_active == True,
                TrainedSyllabus.subject == target_sub
            ).order_by(TrainedSyllabus.created_at.desc()).first()

        # Pick base LeetCode problem
        if preferred_domain == "webdev":
            prob_key = "debounce"
        else:
            prob_key = "two_sum" if level.lower() == "beginner" else ("longest_substring" if level.lower() == "intermediate" else "two_sum")
        problem = LEETCODE_PROBLEMS.get(prob_key, LEETCODE_PROBLEMS["two_sum"])

        if custom_syllabus and custom_syllabus.generated_questions:
            q_idx = profile.get("custom_q_idx", 0) % len(custom_syllabus.generated_questions)
            custom_q = custom_syllabus.generated_questions[q_idx]
            problem = {
                "id": f"custom_{custom_syllabus.id}_{q_idx}",
                "source_type": "ADMIN_CUSTOM",
                "title": custom_q.get("title", problem["title"]),
                "level": custom_q.get("level", level),
                "statement": custom_q.get("statement", problem["statement"]),
                "input_desc": custom_q.get("input_desc", problem["input_desc"]),
                "output_desc": custom_q.get("output_desc", problem["output_desc"]),
                "constraints": custom_q.get("constraints", problem["constraints"]),
                "examples": custom_q.get("examples", problem["examples"]),
                "expected_concepts": custom_q.get("expected_concepts", problem["expected_concepts"]),
                "hints": custom_q.get("hints", problem["hints"]),
                "follow_up_sorted": custom_q.get("follow_up", problem.get("follow_up_sorted", "How would you optimize this approach?")),
                "syllabus_title": custom_syllabus.title,
                "starter_code_cpp": custom_q.get("starter_code_cpp", problem.get("starter_code_cpp", "")),
                "starter_code_js": custom_q.get("starter_code_js", problem.get("starter_code_js", ""))
            }

        # 1. Handle Prompt Injection
        if self.detect_prompt_injection(student_transcript):
            return (
                "Let's stay focused on our technical interview. Could you explain the time and space complexity of the approach you were discussing?",
                "Let's stay focused on our technical interview. Could you explain the time and space complexity of the approach you were discussing?",
                False, False, None, None, QuestionType.CONCEPT, profile
            )

        # 2. Handle Progressive Hints
        if is_hint_req or ("hint" in lowered_input and len(student_transcript.split()) < 10):
            hint_level = min(4, hint_level + 1)
            hints_used += 1
            profile["hints_used"] = hints_used
            profile["hint_level"] = hint_level
            hint_text = problem["hints"][hint_level - 1]
            hint_msg = f"[Hint Level {hint_level}]: {hint_text}\n\nHow does this guide your line of thinking?"
            return (hint_msg, hint_msg, stage.startswith("CODING"), False, problem if stage.startswith("CODING") else None, None, QuestionType.WHY, profile)

        # 3. Handle 'I don't know' / giving up
        if is_giveup or "i don't know" in lowered_input or "no idea" in lowered_input:
            if hint_level < 2:
                hint_level = 1
                hints_used += 1
                profile["hints_used"] = hints_used
                profile["hint_level"] = hint_level
                h_msg = f"That's completely fine. Let's break it down together with a small direction: {problem['hints'][0]}\n\nWhat comes to mind when you consider that?"
                return (h_msg, h_msg, stage.startswith("CODING"), False, problem if stage.startswith("CODING") else None, None, QuestionType.CONCEPT, profile)

        # STAGE 0: Introduction & Setup
        if q_count == 0 or stage in ["INTRO", "WARMUP"]:
            if "web" in lowered_input:
                preferred_domain = "webdev"
            elif "dsa" in lowered_input or "data structure" in lowered_input or "algorithm" in lowered_input:
                preferred_domain = "dsa"

            if "beginner" in lowered_input: level = "Beginner"
            elif "advanced" in lowered_input: level = "Advanced"
            elif "intermediate" in lowered_input: level = "Intermediate"

            profile["preferred_domain"] = preferred_domain
            profile["level"] = level
            profile["stage"] = "GENERAL_CONCEPT_1"
            session.preferred_domain = preferred_domain
            session.interview_level = level

            # Question 1: General foundational question (Spoken aloud, NO code editor)
            if preferred_domain == "webdev":
                q1 = "Thank you for the introduction! Let's start with a foundational general question: How does the JavaScript Event Loop coordinate synchronous execution, Promise microtasks, and timer macrotasks?"
            else:
                q1 = "Thank you for the introduction! Let's start with a foundational general question: What are the fundamental differences between an Array and a Linked List in memory allocation and cache locality, and how do their insertion and lookup complexities compare?"

            return (q1, q1, False, False, None, None, QuestionType.CONCEPT, profile)

        # STAGE 1: Continuous Socratic General Follow-up 1
        if stage == "GENERAL_CONCEPT_1":
            profile["stage"] = "GENERAL_CONCEPT_2"
            continuous_q = self.generate_continuous_followup(student_transcript, preferred_domain)
            return (continuous_q, continuous_q, False, False, None, None, QuestionType.WHY, profile)

        # STAGE 2: Continuous Socratic General Follow-up 2 -> Transition to LeetCode Coding Problem
        if stage == "GENERAL_CONCEPT_2":
            profile["stage"] = "CODING_PRESENTED"
            profile["coding_problem_id"] = problem.get("id")

            formatted_problem = self._format_coding_problem(problem)
            # Custom spoken audio: Ask before reading the entire question!
            audio_ask = (
                f"I have presented {problem['title']} on your screen. "
                "Would you like me to read through the full problem statement and constraints for you, "
                "or would you prefer to read it directly and begin explaining your approach?"
            )
            return (formatted_problem, audio_ask, True, True, problem, None, QuestionType.CONCEPT, profile)

        # STAGE 3: Candidate Responds to Problem Presentation
        if stage == "CODING_PRESENTED":
            # Check if candidate requested reading the question
            if any(w in lowered_input for w in ["yes", "read it", "please read", "read the question", "read aloud", "sure read"]):
                profile["stage"] = "CODING_APPROACH_DISCUSSION"
                spoken_problem = (
                    f"Here is the problem: {problem['statement']} "
                    f"The constraints are: {problem['constraints']}. "
                    "Take a moment to review this. Please explain your observations, what data structure you plan to use, and your expected complexity before coding."
                )
                text_response = f"**Problem Statement Read:**\n\n{problem['statement']}\n\n**Constraints:**\n{problem['constraints']}\n\nBefore writing code, please explain your proposed approach and Big-O time and space complexity."
                return (text_response, spoken_problem, True, False, problem, None, QuestionType.CONCEPT, profile)

            # Candidate explained approach directly
            if code_snippet and len(student_transcript.split()) < 10:
                characteristics["jumps_to_coding_early"] = True
                profile["stage"] = "CODING_APPROACH_DISCUSSION"
                msg = "I notice you jumped straight into code. In a technical interview, it's very important to communicate your thought process first. Could you explain your observations, what data structure you selected, and why it is optimal?"
                return (msg, msg, True, False, problem, None, QuestionType.WHY, profile)

            if any(w in lowered_input for w in ["brute force", "check all", "nested loop", "two loops"]):
                profile["stage"] = "CODING_OPTIMIZATION"
                msg = "Good, that brute force approach gives us a correct baseline with O(N^2) time. Can we optimize it to avoid redundant lookups using an auxiliary data structure like a hash map?"
                return (msg, msg, True, False, problem, None, QuestionType.TRADE_OFF, profile)

            profile["stage"] = "CODING_IMPLEMENTATION_REVIEW"
            msg = "That is a very solid approach! What are your expected time and space complexities? Please go ahead and write your implementation in the code editor on the right and return the solution."
            return (msg, msg, True, False, problem, None, QuestionType.TRADE_OFF, profile)

        # STAGE 4: Coding Optimization Discussion
        if stage == "CODING_OPTIMIZATION":
            profile["stage"] = "CODING_IMPLEMENTATION_REVIEW"
            msg = "Spot on! With that optimization in mind, go ahead and implement your solution in the code editor on the right and return the result."
            return (msg, msg, True, False, problem, None, QuestionType.CONCEPT, profile)

        # STAGE 5: Code Implementation Review & Edge Cases
        if stage == "CODING_IMPLEMENTATION_REVIEW":
            profile["stage"] = "CODING_FOLLOW_UP"
            if code_snippet and len(code_snippet.strip()) > 20:
                msg = "Thank you for implementing that! Looking closely at your solution, how does your code handle boundary conditions, such as an empty input, duplicate values, or inputs where no valid pair exists?"
                return (msg, msg, True, False, problem, None, QuestionType.EDGE_CASE, profile)
            else:
                msg = "Please walk me through your implementation line by line. What is the role of each variable you defined, and how do you ensure the return value is correct?"
                return (msg, msg, True, False, problem, None, QuestionType.WHY, profile)

        # STAGE 6: Coding Follow-up / Altered Constraint
        if stage == "CODING_FOLLOW_UP":
            profile["stage"] = "WRAPUP"
            followup_prompt = problem.get("follow_up_sorted", "What if the input array is already sorted in ascending order? How would you solve this in O(1) auxiliary space without extra memory?")
            msg = f"Well explained! Here is an optimization follow-up on this problem: {followup_prompt}"
            return (msg, msg, True, False, problem, None, QuestionType.TRADE_OFF, profile)

        # STAGE 7: Wrap-up & Conclusion
        profile["stage"] = "COMPLETED"
        wrap_msg = (
            "We have covered our primary conceptual foundations and LeetCode problem solving for this interview! "
            "You did a great job explaining your reasoning and walking through your solution. "
            "Is there any final insight or question you would like to share before we generate your official MSOT evaluation report?"
        )
        return (wrap_msg, wrap_msg, False, False, None, None, QuestionType.CONCEPT, profile)

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
        audio telemetry, code submissions, and memory state.
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

        # Select next turn via adaptive state machine
        (
            next_text, audio_spoken_text, is_coding_question, should_ask_to_read,
            coding_problem_details, next_qid, next_qtype, updated_profile
        ) = self.select_next_turn(
            session=session,
            student_transcript=student_transcript,
            code_snippet=code_snippet,
            is_giveup=is_giveup,
            is_silence=is_silence,
            is_hint_req=is_hint_req
        )

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

        # Standard language determination
        standard_lang = "cpp" if (session.preferred_domain or "dsa") != "webdev" else "javascript"

        return {
            "session_id": session.id,
            "current_phase": new_phase.value,
            "elapsed_seconds": elapsed_seconds,
            "duration_minutes": duration_mins,
            "remaining_seconds": rem_sec,
            "ai_response_text": next_text,
            "audio_spoken_text": audio_spoken_text,
            "is_coding_question": is_coding_question,
            "should_ask_to_read": should_ask_to_read,
            "coding_problem_details": coding_problem_details,
            "coding_standard_language": standard_lang,
            "question_type": next_qtype.value,
            "answer_quality": quality.value,
            "followup_action": action.value,
            "detected_concepts": detected,
            "missing_concepts": missing,
            "latency_ms": latency_ms,
            "hints_used": session.interview_profile.get("hints_used", 0) if session.interview_profile else 0,
            "is_viva_completed": is_completed
        }
