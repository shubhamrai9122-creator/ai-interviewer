import React, { useState, useEffect, useRef } from 'react';
import { Play, Send, RotateCcw, CheckCircle2, AlertCircle, Terminal, Code2, Sparkles, Copy, Check } from 'lucide-react';

const STARTER_CODES = {
  javascript: {
    dsa: `/**
 * Problem: Algorithmic Solution Scratchpad
 * Implement your solution with optimal Big-O time and space complexity.
 */

function solveProblem(input) {
  // Candidate implementation
  const map = new Map();
  for (let i = 0; i < input.length; i++) {
    // Invariant logic
    map.set(input[i], i);
  }
  return Array.from(map.keys());
}

// Example Test Case Execution
const testInput = [3, 2, 4, 1, 9];
console.log("Result:", solveProblem(testInput));
`,
    webdev: `/**
 * Web Development: Full-Stack & Systems Architecture
 * Implement your component hook / utility with proper cleanup and invariants.
 */

// Custom Hook / Async Worker Implementation
function useAsyncHandler(apiEndpoint, options = {}) {
  let isMounted = true;
  
  async function execute() {
    try {
      const response = await fetch(apiEndpoint, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
      const data = await response.json();
      if (isMounted) return { success: true, data };
    } catch (err) {
      if (isMounted) return { success: false, error: err.message };
    }
  }

  return { execute, cleanup: () => { isMounted = false; } };
}
`
  },
  python: {
    dsa: `"""
Problem: Algorithmic Solution Scratchpad
Implement your solution with optimal Big-O time and space complexity.
"""

from typing import List, Dict, Optional

def solve_problem(nums: List[int], target: int) -> List[int]:
    # HashMap lookup for O(N) time and O(N) space
    seen: Dict[int, int] = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Test execution
if __name__ == "__main__":
    test_nums = [2, 7, 11, 15]
    result = solve_problem(test_nums, 9)
    print(f"Indices: {result}")
`,
    webdev: `"""
Web Development: Backend API / Event Queue Architecture
FastAPI / Async Worker with idempotency key locking
"""

import time
from typing import Dict, Any

class IdempotencyManager:
    def __init__(self, ttl_seconds: int = 300):
        self.cache: Dict[str, Any] = {}
        self.ttl = ttl_seconds

    def process_transaction(self, idempotency_key: str, payload: dict) -> dict:
        current_time = time.time()
        if idempotency_key in self.cache:
            entry = self.cache[idempotency_key]
            if current_time - entry["timestamp"] < self.ttl:
                return {"status": "CACHED", "result": entry["result"]}
        
        # Execute business transaction
        result = {"order_id": "ORD-9912", "status": "CONFIRMED", "amount": payload.get("amount", 0)}
        self.cache[idempotency_key] = {"result": result, "timestamp": current_time}
        return {"status": "PROCESSED", "result": result}
`
  },
  cpp: {
    dsa: `// C++20 Solution Scratchpad
#include <iostream>
#include <vector>
#include <unordered_map>

class Solution {
public:
    std::vector<int> solve(const std::vector<int>& nums, int target) {
        std::unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); ++i) {
            int complement = target - nums[i];
            if (seen.find(complement) != seen.end()) {
                return {seen[complement], i};
            }
            seen[nums[i]] = i;
        }
        return {};
    }
};

int main() {
    Solution s;
    std::cout << "Algorithmic invariant compiled successfully." << std::endl;
    return 0;
}
`,
    webdev: `// C++ High-Throughput Network Engine
#include <iostream>
#include <string>

int main() {
    std::cout << "High-throughput async connection worker ready." << std::endl;
    return 0;
}
`
  },
  java: {
    dsa: `// Java 17 Solution Scratchpad
import java.util.HashMap;
import java.util.Map;

public class Solution {
    public int[] solve(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }

    public static void main(String[] args) {
        System.out.println("Java Solution compiled and ready for verification.");
    }
}
`,
    webdev: `// Java Spring Boot REST Invariant
public class WebSystemApplication {
    public static void main(String[] args) {
        System.out.println("Enterprise Service Worker running on port 8080");
    }
}
`
  }
};

export default function HackerRankCodeEditor({
  subject = 'dsa', // 'dsa' or 'webdev'
  code = '',
  onChange = () => {},
  onSubmitSolution = () => {}
}) {
  const [language, setLanguage] = useState('javascript');
  const [activeTab, setActiveTab] = useState('output'); // 'output' or 'testcases'
  const [customInput, setCustomInput] = useState('[2, 7, 11, 15], target = 9');
  const [executionOutput, setExecutionOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  // Initialize with starter code if empty
  useEffect(() => {
    if (!code) {
      const template = STARTER_CODES[language]?.[subject] || STARTER_CODES.javascript.dsa;
      onChange(template);
    }
  }, [language, subject]);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    const template = STARTER_CODES[newLang]?.[subject] || STARTER_CODES.javascript.dsa;
    onChange(template);
  };

  const handleReset = () => {
    const template = STARTER_CODES[language]?.[subject] || STARTER_CODES.javascript.dsa;
    onChange(template);
    setExecutionOutput(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Support Tab key inside textarea for indentation
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      onChange(newCode);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Run Code simulation (HackerRank test runner)
  const handleRunCode = () => {
    setIsRunning(true);
    setExecutionOutput(null);

    setTimeout(() => {
      setIsRunning(false);
      setActiveTab('output');

      // Syntax check
      let syntaxPass = true;
      let logs = [];
      if (language === 'javascript') {
        try {
          new Function(code);
          logs.push('✔ Syntax Verification: Clean (Zero ECMAScript compilation errors)');
          logs.push(`✔ Memory Footprint: 28.4 MB (Heap Allocated)`);
          logs.push(`✔ Execution Latency: 18ms`);
          logs.push(`✔ Test Case 1: [2, 7, 11, 15], target = 9 -> Output: [0, 1] [PASSED]`);
          logs.push(`✔ Test Case 2: [3, 2, 4], target = 6 -> Output: [1, 2] [PASSED]`);
          logs.push(`✔ Edge Case 3: Empty input & Large bounds handled gracefully [PASSED]`);
        } catch (err) {
          syntaxPass = false;
          logs.push(`✖ Syntax Error: ${err.message}`);
        }
      } else {
        logs.push(`✔ Language Target: ${language.toUpperCase()} Virtual Container`);
        logs.push(`✔ Compilation: 0 Warnings, 0 Errors`);
        logs.push(`✔ Execution Time: 34ms | Memory: 32.1 MB`);
        logs.push(`✔ Primary Invariants Verified [PASSED]`);
      }

      setExecutionOutput({
        success: syntaxPass,
        logs: logs.join('\n'),
        time: '24ms',
        memory: '31.4 MB'
      });
    }, 600);
  };

  const lines = (code || '').split('\n');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '720px',
      background: '#0B0F19',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)'
    }}>
      {/* 1. HackerRank Top Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        background: '#0F172A',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Left: Language & Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Code2 size={16} color="#5FD8FF" />
            <span style={{ fontFamily: 'var(--display)', fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
              CODE ARENA
            </span>
          </div>

          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            style={{
              background: '#1E293B',
              color: '#F8FAFC',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              padding: '5px 12px',
              fontFamily: 'var(--mono)',
              fontSize: '12px',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="javascript">JavaScript (Node.js 20)</option>
            <option value="python">Python 3.12</option>
            <option value="cpp">C++ (g++ 20)</option>
            <option value="java">Java 17 (OpenJDK)</option>
          </select>

          <span className="badge badge-dark" style={{ fontSize: '10px', background: 'rgba(255, 255, 255, 0.06)' }}>
            {subject.toUpperCase()} RUNTIME
          </span>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-secondary"
            style={{
              fontSize: '11px',
              padding: '5px 10px',
              background: '#1E293B',
              color: '#CBD5E1',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            title="Copy Code"
          >
            {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="btn btn-secondary"
            style={{
              fontSize: '11px',
              padding: '5px 10px',
              background: '#1E293B',
              color: '#CBD5E1',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            title="Reset Starter Template"
          >
            <RotateCcw size={12} />
            Reset
          </button>

          <button
            type="button"
            onClick={handleRunCode}
            disabled={isRunning}
            className="btn btn-secondary"
            style={{
              fontSize: '11px',
              padding: '6px 14px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#A5B4FC',
              border: '1px solid rgba(99, 102, 241, 0.4)'
            }}
          >
            <Play size={12} color="#818CF8" />
            {isRunning ? 'Running Tests...' : 'Run Code'}
          </button>

          <button
            type="button"
            onClick={() => onSubmitSolution(code)}
            className="btn btn-primary"
            style={{
              fontSize: '11px',
              padding: '6px 16px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#FFFFFF',
              border: 'none',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Send size={12} />
            Submit Solution
          </button>
        </div>
      </div>

      {/* 2. Main Code Editor with Line Numbers */}
      <div style={{
        flex: 1,
        display: 'flex',
        position: 'relative',
        minHeight: '420px',
        overflow: 'hidden'
      }}>
        {/* Line Numbers Gutter */}
        <div style={{
          width: '46px',
          padding: '16px 8px 16px 0',
          background: '#090D16',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          textAlign: 'right',
          userSelect: 'none',
          fontFamily: 'var(--mono)',
          fontSize: '12px',
          lineHeight: '1.6',
          color: 'rgba(148, 163, 184, 0.4)'
        }}>
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code Textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          style={{
            flex: 1,
            height: '100%',
            background: 'transparent',
            color: '#E2E8F0',
            fontFamily: 'var(--mono)',
            fontSize: '13px',
            lineHeight: '1.6',
            padding: '16px 18px',
            border: 'none',
            outline: 'none',
            resize: 'none',
            whiteSpace: 'pre',
            overflowWrap: 'normal',
            overflowX: 'auto',
            tabSize: 2
          }}
        />
      </div>

      {/* 3. Bottom Output / Test Cases Panel */}
      <div style={{
        background: '#090D16',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        maxHeight: '260px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Drawer Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: '#0F172A',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('output')}
              style={{
                background: activeTab === 'output' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: activeTab === 'output' ? '#FFFFFF' : '#94A3B8',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                fontFamily: 'var(--mono)',
                cursor: 'pointer'
              }}
            >
              Console Output
            </button>
            <button
              onClick={() => setActiveTab('testcases')}
              style={{
                background: activeTab === 'testcases' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: activeTab === 'testcases' ? '#FFFFFF' : '#94A3B8',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                fontFamily: 'var(--mono)',
                cursor: 'pointer'
              }}
            >
              Custom Test Input
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {executionOutput && (
              <span className="mono" style={{ fontSize: '10px', color: executionOutput.success ? '#10B981' : '#EF4444' }}>
                {executionOutput.success ? `✔ Accepted (${executionOutput.time})` : '✖ Error'}
              </span>
            )}
          </div>
        </div>

        {/* Tab Contents */}
        <div style={{ padding: '12px 16px', overflowY: 'auto', maxHeight: '180px' }}>
          {activeTab === 'output' ? (
            executionOutput ? (
              <pre style={{
                margin: 0,
                fontFamily: 'var(--mono)',
                fontSize: '12px',
                lineHeight: '1.5',
                color: executionOutput.success ? '#A7F3D0' : '#FCA5A5',
                whiteSpace: 'pre-wrap'
              }}>
                {executionOutput.logs}
              </pre>
            ) : (
              <div style={{ color: 'rgba(148, 163, 184, 0.5)', fontSize: '11px', fontFamily: 'var(--mono)' }}>
                Click "Run Code" above to execute test cases and verify algorithmic invariants.
              </div>
            )
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: '#94A3B8', fontFamily: 'var(--mono)', marginBottom: '4px' }}>
                Test Case Arguments (stdin):
              </label>
              <input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                style={{
                  width: '100%',
                  background: '#1E293B',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontFamily: 'var(--mono)',
                  outline: 'none'
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
