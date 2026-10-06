import os
import re
import json
import time
from typing import Dict, Any, List, Optional
import requests
from sqlalchemy.orm import Session
from server.models import TrainedSyllabus

# Topic patterns for DSA and Web Development
DSA_PATTERNS = {
    "Arrays & Strings": [r"array", r"string", r"matrix", r"vector", r"subarray", r"substring"],
    "Two Pointers & Sliding Window": [r"two pointer", r"sliding window", r"fast and slow", r"shrink", r"expand window"],
    "Hashing & Sets": [r"hash", r"hashmap", r"hashset", r"frequency map", r"dictionary", r"lookup"],
    "Binary Search": [r"binary search", r"search space", r"monotonic", r"lower bound", r"upper bound"],
    "Linked Lists": [r"linked list", r"doubly linked", r"singly linked", r"cycle detection", r"reverse list"],
    "Stacks & Queues": [r"stack", r"queue", r"monotonic stack", r"deque", r"priority queue", r"min stack"],
    "Trees & BST": [r"tree", r"binary tree", r"bst", r"traversal", r"inorder", r"preorder", r"lca", r"diameter"],
    "Graphs, BFS & DFS": [r"graph", r"bfs", r"dfs", r"topological sort", r"dijkstra", r"cycle detection", r"bipartite", r"mst"],
    "Dynamic Programming": [r"dynamic programming", r"dp", r"memoization", r"tabulation", r"knapsack", r"subsequence"],
    "Greedy Algorithms": [r"greedy", r"interval", r"scheduling", r"activity selection"],
    "Recursion & Backtracking": [r"recursion", r"backtracking", r"permutation", r"combination", r"n-queens"]
}

WEB_DEV_PATTERNS = {
    "Frontend & React": [r"react", r"virtual dom", r"fiber", r"reconciliation", r"hooks", r"useeffect", r"usestate", r"component", r"props"],
    "JavaScript Core & Async": [r"event loop", r"promise", r"async", r"await", r"closure", r"prototype", r"microtask", r"hoisting"],
    "Backend & Node.js/Express": [r"node", r"express", r"middleware", r"rest api", r"http", r"crud", r"routing", r"status code"],
    "Authentication & Security": [r"jwt", r"json web token", r"cookie", r"session", r"cors", r"csrf", r"xss", r"authorization", r"httponly"],
    "Databases & Storage": [r"mongodb", r"sql", r"postgres", r"schema", r"index", r"nosql", r"acid", r"normalization", r"query"],
    "WebSockets & Real-time": [r"websocket", r"socket\.io", r"real-time", r"sse", r"bi-directional"],
    "Caching & Performance": [r"redis", r"cache", r"ttl", r"cdn", r"lazy loading", r"bundle", r"optimization"]
}

# Template question bank based on detected topics
QUESTION_TEMPLATES = {
    "Dynamic Programming": {
        "title": "Coin Change Minimum",
        "topic": "Dynamic Programming - Unbounded Knapsack",
        "level": "Intermediate",
        "statement": "Given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money, return the fewest number of coins that you need to make up that amount. If that amount cannot be made up by any combination of the coins, return -1.",
        "input_desc": "coins: List[int], amount: int",
        "output_desc": "int: Minimum number of coins required or -1",
        "constraints": "- 1 <= coins.length <= 12\n- 1 <= coins[i] <= 2^31 - 1\n- 0 <= amount <= 10^4",
        "examples": "Example 1:\nInput: coins = [1,2,5], amount = 11\nOutput: 3 (11 = 5 + 5 + 1)\n\nExample 2:\nInput: coins = [2], amount = 3\nOutput: -1",
        "expected_concepts": ["dynamic programming", "memoization", "tabulation", "subproblem", "dp array", "O(amount * coins)"],
        "hints": [
            "Consider whether this problem can be decomposed into subproblems: what is the minimum coins needed for (amount - coin)?",
            "Think about defining a 1D DP table where dp[i] represents the minimum coins needed to make amount i.",
            "Initialize dp array of size (amount + 1) with infinity (or amount + 1), set dp[0] = 0. For each coin, update dp[i] = min(dp[i], dp[i - coin] + 1).",
            "Loop for c in coins: for i from c to amount: dp[i] = min(dp[i], dp[i-c] + 1). Return dp[amount] if dp[amount] != inf else -1."
        ],
        "follow_up": "How would you modify this to return the total number of unique combinations that sum up to amount rather than the minimum count?"
    },
    "Graphs, BFS & DFS": {
        "title": "Course Schedule (Cycle Detection)",
        "topic": "Graphs - Topological Sort & Cycle Detection",
        "level": "Intermediate",
        "statement": "There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai. Return true if you can finish all courses. Otherwise, return false.",
        "input_desc": "numCourses: int, prerequisites: List[List[int]]",
        "output_desc": "bool: True if all courses can be finished without deadlock, False otherwise.",
        "constraints": "- 1 <= numCourses <= 2000\n- 0 <= prerequisites.length <= 5000\n- prerequisites[i].length == 2\n- All prerequisite pairs are unique.",
        "examples": "Example 1:\nInput: numCourses = 2, prerequisites = [[1,0]]\nOutput: true\n\nExample 2:\nInput: numCourses = 2, prerequisites = [[1,0],[0,1]]\nOutput: false (Cycle exists between 0 and 1)",
        "expected_concepts": ["directed graph", "topological sort", "kahn's algorithm", "cycle detection", "indegree", "adjacency list"],
        "hints": [
            "Model the courses and prerequisites as a directed graph where an edge (u -> v) means course u must be taken before v.",
            "Can a candidate complete all courses if there is a directed cycle in the graph? Think about Kahn's Algorithm or DFS with 3-color states.",
            "Compute the in-degree of every course. Push all nodes with in-degree 0 into a queue. While the queue is non-empty, pop and decrement in-degrees of neighbors.",
            "Track how many courses were popped from the queue. If the count equals numCourses, return true; otherwise a cycle prevented finishing."
        ],
        "follow_up": "If a cycle is present, how would you return the exact list of courses involved in that cycle to help the student resolve the conflict?"
    },
    "Trees & BST": {
        "title": "Lowest Common Ancestor in Binary Tree",
        "topic": "Trees - Recursive Divide and Conquer",
        "level": "Intermediate",
        "statement": "Given a binary tree, find the lowest common ancestor (LCA) of two given nodes p and q in the tree.",
        "input_desc": "root: TreeNode, p: TreeNode, q: TreeNode",
        "output_desc": "TreeNode: The LCA node where both p and q are descendants.",
        "constraints": "- The number of nodes in the tree is in the range [2, 10^5].\n- -10^9 <= Node.val <= 10^9\n- All Node.val are unique.\n- p and q are different and both exist in the tree.",
        "examples": "Example:\nInput: root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1\nOutput: 3 (Explanation: Node 3 is the LCA of 5 and 1)",
        "expected_concepts": ["binary tree", "recursion", "postorder traversal", "divide and conquer", "O(N) time", "O(H) space"],
        "hints": [
            "Think about a post-order recursive traversal: what should the function return when root equals p or q?",
            "Search for p and q in the left and right subtrees recursively.",
            "If both left and right recursive calls return non-null pointers, what does that indicate about the current root?",
            "If root is None or root == p or root == q, return root. Recurse left and right. If both return non-null, return root; otherwise return whichever is non-null."
        ],
        "follow_up": "How does the approach change if the tree is guaranteed to be a Binary Search Tree (BST)?"
    },
    "Frontend & React": {
        "title": "React State Synchronization & Reconciliation",
        "topic": "Frontend Architecture - Virtual DOM & Fiber",
        "level": "Intermediate",
        "statement": "Suppose you are building a real-time collaborative dashboard in React. Components frequently re-render, causing perceptible UI lag.",
        "input_desc": "Architecture Scenario: High-frequency state updates in React",
        "output_desc": "Technical explanation and code pattern for memoization, throttling, and state collocation.",
        "constraints": "- 60 FPS target UI rendering\n- Updates arriving every 50ms",
        "examples": "Example: Rapid keystroke searches or WebSocket stock tickers causing child tree re-renders.",
        "expected_concepts": ["virtual dom", "reconciliation", "usememo", "usecallback", "react.memo", "state collocation", "concurrent mode"],
        "hints": [
            "Start by explaining what causes React to trigger a reconciliation cycle and re-execute component functions.",
            "How can we isolate high-frequency state so that parent and sibling components do not unnecessarily re-evaluate?",
            "Discuss React.memo for pure presentation components, useCallback for persistent function references, and useMemo for heavy calculations.",
            "Mention batching in React 18, useTransition or useDeferredValue to deprioritize non-urgent background updates while keeping the UI responsive."
        ],
        "follow_up": "What is the difference between shallow prop comparison in React.memo and deep comparison, and why does mutating state directly break memoization?"
    },
    "Backend & Node.js/Express": {
        "title": "Scalable REST API Rate Limiting & Middleware",
        "topic": "Backend Engineering - Express Middleware & Distributed Rate Limiting",
        "level": "Intermediate",
        "statement": "Explain how you would design and implement an IP-based and User-based rate limiter middleware in Express.js to protect sensitive API endpoints.",
        "input_desc": "Express application with public and authenticated endpoints.",
        "output_desc": "Middleware architecture and sliding window algorithm explanation.",
        "constraints": "- Must handle multiple clustered Node.js worker instances\n- Memory efficient and thread-safe",
        "examples": "Example: Limiting login requests to 5 attempts per 15 minutes per IP address.",
        "expected_concepts": ["express middleware", "sliding window", "token bucket", "redis", "ttl", "http 429", "headers retry-after"],
        "hints": [
            "Explain where middleware sits in the Express request-response lifecycle (req, res, next).",
            "Why is an in-memory JavaScript Map unsuitable when running behind a multi-core Node.js cluster or multiple server containers?",
            "Describe using Redis with atomic operations (e.g. INCR with EXPIRE or Redis sorted sets) to track request timestamps within a sliding window.",
            "If the request count exceeds the limit, return HTTP status 429 (Too Many Requests) with Retry-After headers; otherwise call next()."
        ],
        "follow_up": "How would you prevent distributed denial of service where attackers spoof the 'X-Forwarded-For' header behind reverse proxies?"
    },
    "Authentication & Security": {
        "title": "Secure Full-Stack JWT Authentication Flow",
        "topic": "Web Security - JWT, Refresh Tokens & Cookie Architecture",
        "level": "Intermediate",
        "statement": "Explain step-by-step how to implement secure JWT authentication between a React single-page application and an Express backend.",
        "input_desc": "React Client + Express REST Server + Database",
        "output_desc": "End-to-end authentication lifecycle including login, token verification, silent refresh, and secure logout.",
        "constraints": "- Defend against XSS (Cross-Site Scripting)\n- Defend against CSRF (Cross-Site Request Forgery)",
        "examples": "Example: User signs in with email/password and accesses protected /api/profile endpoint.",
        "expected_concepts": ["httponly cookie", "access token", "refresh token", "jwt verification", "samesite", "cors", "token rotation"],
        "hints": [
            "Discuss where the access token and refresh token should be stored on the client side to minimize vulnerability.",
            "Why is storing sensitive tokens in localStorage insecure against XSS attacks?",
            "Explain using short-lived access tokens (e.g. 15 minutes) kept in memory or httpOnly cookies, paired with a long-lived refresh token stored in an httpOnly, Secure cookie.",
            "Detail how the Express middleware extracts and verifies the JWT signature using a secret key, and how a /refresh endpoint issues new access tokens."
        ],
        "follow_up": "Since JWTs are stateless and signature-verified, how do you handle immediate token revocation if an account is compromised before the token expires?"
    }
}

class SyllabusService:
    def __init__(self, db: Session):
        self.db = db
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")

    def extract_topics(self, text: str, subject: str) -> Dict[str, Any]:
        """
        Extracts topics, concepts, and patterns from uploaded syllabus text.
        """
        lowered = text.lower()
        extracted_topics = []
        key_concepts = []

        is_dsa = "data structure" in subject.lower() or "dsa" in subject.lower() or "algorithm" in subject.lower()
        patterns_to_check = DSA_PATTERNS if is_dsa else WEB_DEV_PATTERNS

        for topic_name, keywords in patterns_to_check.items():
            matches = [kw for kw in keywords if re.search(r"\b" + re.escape(kw) + r"\b", lowered)]
            if matches:
                extracted_topics.append(topic_name)
                key_concepts.extend(matches)

        # Also extract any bullet points or line items as potential custom subtopics
        lines = [line.strip().lstrip("*-#•0123456789. ") for line in text.split("\n") if len(line.strip()) > 3]
        subtopics = [line for line in lines if len(line) < 60 and not line.lower().startswith("http")][:12]

        if not extracted_topics:
            if is_dsa:
                extracted_topics = ["Arrays & Strings", "Two Pointers & Sliding Window", "Trees & BST"]
                key_concepts = ["hash map", "two pointer", "binary search", "recursion"]
            else:
                extracted_topics = ["Frontend & React", "Backend & Node.js/Express", "Authentication & Security"]
                key_concepts = ["virtual dom", "event loop", "jwt", "express middleware"]

        return {
            "topics": list(dict.fromkeys(extracted_topics)),
            "subtopics": subtopics,
            "concepts": list(dict.fromkeys(key_concepts))
        }

    def generate_questions_for_syllabus(self, title: str, subject: str, syllabus_text: str, extracted_topics: List[str]) -> List[Dict[str, Any]]:
        """
        Synthesizes progressive technical interview questions tailored to the custom syllabus.
        Uses LLM if available; otherwise uses high-fidelity topic question synthesizer.
        """
        # Try Groq or OpenAI first
        if self.groq_api_key or self.openai_api_key:
            llm_questions = self._generate_with_llm(title, subject, syllabus_text, extracted_topics)
            if llm_questions and len(llm_questions) >= 2:
                return llm_questions

        # High-fidelity deterministic synthesizer
        generated = []
        for topic in extracted_topics:
            if topic in QUESTION_TEMPLATES:
                template = dict(QUESTION_TEMPLATES[topic])
                template["syllabus_origin"] = title
                generated.append(template)

        # Ensure at least 2 structured questions
        if len(generated) < 2:
            default_keys = ["Dynamic Programming", "Graphs, BFS & DFS"] if ("dsa" in subject.lower() or "algorithm" in subject.lower()) else ["Frontend & React", "Authentication & Security"]
            for k in default_keys:
                if k in QUESTION_TEMPLATES and QUESTION_TEMPLATES[k] not in generated:
                    tmpl = dict(QUESTION_TEMPLATES[k])
                    tmpl["syllabus_origin"] = title
                    generated.append(tmpl)

        return generated[:4]

    def _generate_with_llm(self, title: str, subject: str, syllabus_text: str, extracted_topics: List[str]) -> Optional[List[Dict[str, Any]]]:
        prompt = f"""You are Ira, the AI Technical Interviewer from Internshala.
Ingest this candidate's custom syllabus and generate 3 rigorous interview questions matching the exact Internshala AI Interview format.
Subject: {subject}
Syllabus Title: {title}
Syllabus Text:
{syllabus_text[:2000]}

Extracted Topics: {', '.join(extracted_topics)}

Respond ONLY with valid JSON in this exact structure:
[
  {{
    "title": "Problem Title",
    "topic": "Topic Name",
    "level": "Intermediate",
    "statement": "Detailed problem statement",
    "input_desc": "Input parameter types and descriptions",
    "output_desc": "Return type and meaning",
    "constraints": "- Constraint 1\\n- Constraint 2",
    "examples": "Example 1:\\nInput: ...\\nOutput: ...",
    "expected_concepts": ["concept1", "concept2", "concept3"],
    "hints": [
      "Level 1: Small conceptual direction",
      "Level 2: Relevant pattern/data structure",
      "Level 3: Specific guidance",
      "Level 4: Near-solution pseudocode/guidance"
    ],
    "follow_up": "Optimization or altered constraint question",
    "syllabus_origin": "{title}"
  }}
]
"""
        messages = [
            {"role": "system", "content": "You are an expert AI Technical Interviewer compiler. Return strictly JSON."},
            {"role": "user", "content": prompt}
        ]

        try:
            if self.groq_api_key:
                res = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.groq_api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": messages,
                        "temperature": 0.3,
                        "response_format": {"type": "json_object"},
                        "max_tokens": 1500
                    },
                    timeout=8
                )
                if res.status_code == 200:
                    raw = res.json()["choices"][0]["message"]["content"]
                    data = json.loads(raw)
                    if isinstance(data, list):
                        return data
                    elif isinstance(data, dict):
                        for k in ["questions", "interview_questions", "data"]:
                            if k in data and isinstance(data[k], list):
                                return data[k]
        except Exception as e:
            print(f"[SyllabusService] LLM question generation failed: {e}")

        return None

    def train_syllabus(self, title: str, subject: str, syllabus_text: str, target_role: str = "Software Development Engineer (SDE) Intern") -> Dict[str, Any]:
        """
        Trains and stores a candidate's personal syllabus.
        """
        # Validate domain strictly to DSA or Web Development
        is_dsa = any(k in subject.lower() or k in title.lower() for k in ["dsa", "data structure", "algorithm", "problem solving", "leetcode", "striver"])
        is_web = any(k in subject.lower() or k in title.lower() for k in ["web", "full stack", "frontend", "backend", "react", "node", "express", "javascript", "mern", "api"])

        normalized_subject = "Data Structures & Algorithms" if is_dsa or not is_web else "Web Development"

        # Extract topics and concepts
        extracted = self.extract_topics(syllabus_text, normalized_subject)
        topics = extracted["topics"]
        concepts = extracted["concepts"]

        # Generate progressive interview questions
        questions = self.generate_questions_for_syllabus(title, normalized_subject, syllabus_text, topics)

        # Deactivate existing syllabi for this subject to make this newly trained one the primary
        self.db.query(TrainedSyllabus).filter(TrainedSyllabus.subject == normalized_subject).update({"is_active": False})

        # Create record
        record = TrainedSyllabus(
            title=title.strip() or f"{normalized_subject} Custom Syllabus",
            subject=normalized_subject,
            target_role=target_role,
            syllabus_text=syllabus_text,
            topics_extracted=topics,
            key_concepts=concepts,
            generated_questions=questions,
            is_active=True,
            created_at=time.time()
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)

        return {
            "success": True,
            "id": record.id,
            "title": record.title,
            "subject": record.subject,
            "target_role": record.target_role,
            "topics_count": len(topics),
            "topics_extracted": topics,
            "key_concepts_count": len(concepts),
            "key_concepts": concepts,
            "questions_generated_count": len(questions),
            "questions_sample": [q.get("title") for q in questions],
            "is_active": record.is_active,
            "message": f"Successfully trained AI Interviewer (Ira) on '{record.title}'! Ira will now assess these topics."
        }

    def list_syllabi(self) -> List[Dict[str, Any]]:
        records = self.db.query(TrainedSyllabus).order_by(TrainedSyllabus.created_at.desc()).all()
        return [
            {
                "id": r.id,
                "title": r.title,
                "subject": r.subject,
                "target_role": r.target_role,
                "topics_extracted": r.topics_extracted,
                "key_concepts": r.key_concepts,
                "questions_count": len(r.generated_questions or []),
                "questions": r.generated_questions,
                "is_active": r.is_active,
                "created_at": r.created_at
            }
            for r in records
        ]

    def toggle_syllabus(self, syllabus_id: int, is_active: bool) -> bool:
        record = self.db.query(TrainedSyllabus).filter(TrainedSyllabus.id == syllabus_id).first()
        if not record:
            return False
        record.is_active = is_active
        self.db.commit()
        return True

    def get_active_syllabus(self, subject: Optional[str] = None) -> Optional[TrainedSyllabus]:
        q = self.db.query(TrainedSyllabus).filter(TrainedSyllabus.is_active == True)
        if subject:
            is_dsa = "dsa" in subject.lower() or "data structure" in subject.lower()
            target_sub = "Data Structures & Algorithms" if is_dsa else "Web Development"
            q = q.filter(TrainedSyllabus.subject == target_sub)
        return q.order_by(TrainedSyllabus.created_at.desc()).first()
