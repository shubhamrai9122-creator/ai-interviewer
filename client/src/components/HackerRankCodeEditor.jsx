import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Send, RotateCcw, CheckCircle2, XCircle, AlertCircle, 
  Terminal, Code2, Sparkles, Copy, Check, ChevronDown, ChevronRight,
  Cpu, Clock, Layers, Bug, Flame, CheckCheck, RefreshCw
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const STARTER_CODES = {
  javascript: {
    dsa: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
};

// Driver Harness for LeetCode evaluation
const nums = [2, 7, 11, 15];
const target = 9;
console.log(JSON.stringify(twoSum(nums, target)));
`,
    webdev: `/**
 * Web Development: Asynchronous Event Queue / Debounced Dispatcher
 * @param {Function} fn
 * @param {number} delay
 * @return {Function}
 */
function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
}

// Driver Test Execution
let counter = 0;
const increment = debounce(() => counter++, 50);
increment();
increment();
increment();
setTimeout(() => {
    console.log("Debounced Execution Result:", counter === 1 ? "PASSED" : "FAILED");
}, 100);
`
  },
  python: {
    dsa: `from typing import List, Dict

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen: Dict[int, int] = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []

# Driver harness
if __name__ == "__main__":
    sol = Solution()
    print(sol.twoSum([2, 7, 11, 15], 9))
`,
    webdev: `"""
Web Development / Backend Systems: LRU Cache Implementation
"""
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)

if __name__ == "__main__":
    lru = LRUCache(2)
    lru.put(1, 1)
    lru.put(2, 2)
    print("LRU get(1):", lru.get(1))
    lru.put(3, 3) # evicts 2
    print("LRU get(2) [evicted]:", lru.get(2))
`
  },
  cpp: {
    dsa: `// C++20 LeetCode Solution
#include <iostream>
#include <vector>
#include <unordered_map>

class Solution {
public:
    std::vector<int> twoSum(const std::vector<int>& nums, int target) {
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
    auto res = s.twoSum({2, 7, 11, 15}, 9);
    std::cout << "[" << res[0] << ", " << res[1] << "]" << std::endl;
    return 0;
}
`,
    webdev: `// C++ High-Throughput HTTP Event Worker
#include <iostream>
#include <string>

int main() {
    std::cout << "HTTP Async Event Loop Running on Port 8080" << std::endl;
    return 0;
}
`
  },
  java: {
    dsa: `// Java 17 LeetCode Solution
import java.util.HashMap;
import java.util.Map;
import java.util.Arrays;

public class Solution {
    public int[] twoSum(int[] nums, int target) {
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
        Solution sol = new Solution();
        int[] result = sol.twoSum(new int[]{2, 7, 11, 15}, 9);
        System.out.println(Arrays.toString(result));
    }
}
`,
    webdev: `// Java Microservice Transaction Handler
public class Application {
    public static void main(String[] args) {
        System.out.println("Distributed Transaction Coordinator Active");
    }
}
`
  }
};

const DEFAULT_DSA_TEST_CASES = [
  {
    id: 1,
    name: 'Case 1',
    input: 'nums = [2, 7, 11, 15], target = 9',
    expected: '[0, 1]',
    description: 'Basic standard two-sum pair at front'
  },
  {
    id: 2,
    name: 'Case 2',
    input: 'nums = [3, 2, 4], target = 6',
    expected: '[1, 2]',
    description: 'Elements not located at index 0'
  },
  {
    id: 3,
    name: 'Case 3',
    input: 'nums = [3, 3], target = 6',
    expected: '[0, 1]',
    description: 'Duplicate numbers requiring proper map index overwrite protection'
  }
];

const DEFAULT_WEB_TEST_CASES = [
  {
    id: 1,
    name: 'Case 1',
    input: 'fn = dispatch, delay = 50ms (rapid 3 burst)',
    expected: 'PASSED',
    description: 'Coalesce repeated burst triggers to single execution'
  },
  {
    id: 2,
    name: 'Case 2',
    input: 'GET /api/status -> HTTP 200 OK',
    expected: 'PASSED',
    description: 'Asynchronous promise resolve with non-null JSON payload'
  }
];

export default function HackerRankCodeEditor({
  subject = 'dsa', // 'dsa' or 'webdev'
  code = '',
  onChange = () => {},
  onSubmitSolution = () => {}
}) {
  const [language, setLanguage] = useState('javascript');
  const [activeBottomTab, setActiveBottomTab] = useState('testcase'); // 'testcase' or 'result'
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [isCustomInputMode, setIsCustomInputMode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);

  const testCases = subject === 'webdev' ? DEFAULT_WEB_TEST_CASES : DEFAULT_DSA_TEST_CASES;

  // Initialize with starter code if empty or on subject change
  useEffect(() => {
    if (!code || code.trim() === '') {
      const template = STARTER_CODES[language]?.[subject] || STARTER_CODES.javascript.dsa;
      onChange(template);
    }
  }, [language, subject, code]);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    const template = STARTER_CODES[newLang]?.[subject] || STARTER_CODES.javascript.dsa;
    onChange(template);
  };

  const handleReset = () => {
    const template = STARTER_CODES[language]?.[subject] || STARTER_CODES.javascript.dsa;
    onChange(template);
    setRunResult(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Indentation support inside editor
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      onChange(newCode);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }
  };

  // Real LeetCode-style code runner
  const handleRunCode = async () => {
    setIsRunning(true);
    setActiveBottomTab('result');

    try {
      const res = await fetch(`${API_BASE}/api/code/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          language: language,
          custom_input: isCustomInputMode ? customInput : null,
          test_cases: testCases.map(tc => ({ input: tc.input, expected: tc.expected }))
        })
      });

      const data = await res.json();
      setRunResult(data);
    } catch (err) {
      setRunResult({
        status: 'Runtime Error',
        passed: 0,
        total: testCases.length,
        stdout: '',
        stderr: err.message,
        runtime_ms: 0,
        memory_mb: 0,
        test_results: []
      });
    } finally {
      setIsRunning(false);
    }
  };

  const lines = (code || '').split('\n');
  const activeTestCase = testCases[selectedTestCaseIndex] || testCases[0];

  const handleScroll = (e) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.target.scrollTop;
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: '#1A1A1A',
      borderRadius: '12px',
      border: '1px solid #2D2D2D',
      overflow: 'hidden',
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* 1. LeetCode Top Navigation Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 14px',
        background: '#262626',
        borderBottom: '1px solid #333333',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Left: Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '4px'
          }}>
            <Code2 size={14} color="#FFA116" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#E5E5E5' }}>
              LeetCode Arena
            </span>
          </div>

          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            style={{
              background: '#333333',
              color: '#FFFFFF',
              border: '1px solid #444444',
              borderRadius: '5px',
              padding: '4px 10px',
              fontFamily: 'var(--mono)',
              fontSize: '12px',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python 3</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>

          <span style={{
            fontSize: '10px',
            fontFamily: 'var(--mono)',
            padding: '2px 8px',
            borderRadius: '999px',
            background: 'rgba(255, 161, 22, 0.12)',
            color: '#FFA116',
            fontWeight: 700
          }}>
            {subject.toUpperCase()}
          </span>
        </div>

        {/* Right: Actions (Reset, Copy, Run, Submit) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              background: '#333333',
              color: '#D4D4D4',
              border: '1px solid #444444',
              borderRadius: '5px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
            title="Copy Code"
          >
            {copied ? <Check size={12} color="#22C55E" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              background: '#333333',
              color: '#D4D4D4',
              border: '1px solid #444444',
              borderRadius: '5px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
            title="Reset to Starter Code"
          >
            <RotateCcw size={12} />
            Reset
          </button>

          {/* LeetCode Run Button (Gray rounded button with Play icon) */}
          <button
            type="button"
            onClick={handleRunCode}
            disabled={isRunning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 14px',
              background: '#3A3A3A',
              color: '#FFFFFF',
              border: '1px solid #4D4D4D',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Play size={12} color="#22C55E" fill="#22C55E" />
            {isRunning ? 'Running...' : 'Run'}
          </button>

          {/* LeetCode Submit Button (Green rounded button) */}
          <button
            type="button"
            onClick={() => onSubmitSolution(code)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 16px',
              background: '#2CBB5D',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(44, 187, 93, 0.3)'
            }}
          >
            <Send size={12} />
            Submit
          </button>
        </div>
      </div>

      {/* 2. LeetCode Editor Body (Line Numbers + Dark Code Canvas Covering Left Screen) */}
      <div style={{
        flex: 1,
        display: 'flex',
        position: 'relative',
        background: '#1E1E1E',
        overflow: 'hidden'
      }}>
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          style={{
            width: '46px',
            padding: '14px 6px 14px 0',
            background: '#1E1E1E',
            borderRight: '1px solid #2B2B2B',
            textAlign: 'right',
            userSelect: 'none',
            fontFamily: 'var(--mono)',
            fontSize: '12px',
            lineHeight: '1.6',
            color: '#5A5A5A',
            overflowY: 'hidden'
          }}
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code Input */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          style={{
            flex: 1,
            height: '100%',
            background: 'transparent',
            color: '#D4D4D4',
            fontFamily: 'var(--mono)',
            fontSize: '13px',
            lineHeight: '1.6',
            padding: '14px 16px',
            border: 'none',
            outline: 'none',
            resize: 'none',
            whiteSpace: 'pre',
            overflowWrap: 'normal',
            overflowX: 'auto',
            overflowY: 'auto',
            tabSize: 4
          }}
        />
      </div>

      {/* 3. LeetCode Bottom Testcase & Test Result Panel with Collapsible Drawer */}
      <div style={{
        background: '#262626',
        borderTop: '1px solid #333333',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: isDrawerCollapsed ? '38px' : '280px',
        transition: 'max-height 0.2s ease',
        overflow: 'hidden'
      }}>
        {/* Tab Headers: Testcase vs Test Result + Collapse Chevron */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          background: '#1F1F1F',
          borderBottom: isDrawerCollapsed ? 'none' : '1px solid #2D2D2D',
          height: '38px',
          minHeight: '38px'
        }}>
          <div style={{ display: 'flex', gap: '4px', height: '100%' }}>
            <button
              type="button"
              onClick={() => {
                setActiveBottomTab('testcase');
                setIsDrawerCollapsed(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 12px',
                background: 'transparent',
                color: (!isDrawerCollapsed && activeBottomTab === 'testcase') ? '#FFFFFF' : '#888888',
                border: 'none',
                borderBottom: (!isDrawerCollapsed && activeBottomTab === 'testcase') ? '2px solid #FFA116' : '2px solid transparent',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span>Testcase</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveBottomTab('result');
                setIsDrawerCollapsed(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 12px',
                background: 'transparent',
                color: (!isDrawerCollapsed && activeBottomTab === 'result') ? '#FFFFFF' : '#888888',
                border: 'none',
                borderBottom: (!isDrawerCollapsed && activeBottomTab === 'result') ? '2px solid #FFA116' : '2px solid transparent',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span>Test Result</span>
              {runResult && (
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: runResult.status === 'Accepted' ? '#22C55E' : '#EF4444'
                }} />
              )}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Quick status pill when result is available */}
            {runResult && !isDrawerCollapsed && activeBottomTab === 'result' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: runResult.status === 'Accepted' ? '#22C55E' : '#EF4444',
                  fontFamily: 'var(--mono)'
                }}>
                  {runResult.status}
                </span>
                <span style={{ fontSize: '11px', color: '#888888', fontFamily: 'var(--mono)' }}>
                  {runResult.runtime_ms} ms
                </span>
              </div>
            )}

            {/* Collapse/Expand Drawer Toggle Button */}
            <button
              type="button"
              onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#A0A0A0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                padding: '4px 6px'
              }}
              title={isDrawerCollapsed ? "Expand Testcase Panel" : "Collapse Testcase Panel to enlarge code"}
            >
              <span>{isDrawerCollapsed ? 'Expand Testcases' : 'Collapse'}</span>
              {isDrawerCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Tab 1: Testcase Panel (Case 1, Case 2, Case 3 pills like LeetCode) */}
        {!isDrawerCollapsed && activeBottomTab === 'testcase' && (
          <div style={{ padding: '14px 16px', overflowY: 'auto' }}>
            {/* Case selector pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              {testCases.map((tc, idx) => (
                <button
                  key={tc.id}
                  type="button"
                  onClick={() => {
                    setSelectedTestCaseIndex(idx);
                    setIsCustomInputMode(false);
                  }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '5px',
                    background: (!isCustomInputMode && selectedTestCaseIndex === idx) ? '#383838' : '#2A2A2A',
                    color: (!isCustomInputMode && selectedTestCaseIndex === idx) ? '#FFFFFF' : '#8A8A8A',
                    border: '1px solid',
                    borderColor: (!isCustomInputMode && selectedTestCaseIndex === idx) ? '#555555' : 'transparent',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {tc.name}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setIsCustomInputMode(true)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '5px',
                  background: isCustomInputMode ? '#383838' : '#2A2A2A',
                  color: isCustomInputMode ? '#FFFFFF' : '#8A8A8A',
                  border: '1px solid',
                  borderColor: isCustomInputMode ? '#FFA116' : 'transparent',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                + Custom Stdin
              </button>
            </div>

            {/* Test Case Details */}
            {!isCustomInputMode ? (
              <div>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#888888', marginBottom: '4px', fontFamily: 'var(--mono)' }}>
                    Input Parameters:
                  </div>
                  <div style={{
                    background: '#1F1F1F',
                    border: '1px solid #333333',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontFamily: 'var(--mono)',
                    color: '#E5E5E5'
                  }}>
                    {activeTestCase.input}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#888888', marginBottom: '4px', fontFamily: 'var(--mono)' }}>
                    Expected Output:
                  </div>
                  <div style={{
                    background: '#1F1F1F',
                    border: '1px solid #333333',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontFamily: 'var(--mono)',
                    color: '#22C55E'
                  }}>
                    {activeTestCase.expected}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '11px', color: '#888888', marginBottom: '4px', fontFamily: 'var(--mono)' }}>
                  Custom Input (passed directly to process stdin):
                </div>
                <input
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="e.g. [3, 2, 4], 6"
                  style={{
                    width: '100%',
                    background: '#1F1F1F',
                    border: '1px solid #444444',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontFamily: 'var(--mono)',
                    color: '#FFFFFF',
                    outline: 'none'
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 2: LeetCode Test Result Panel */}
        {!isDrawerCollapsed && activeBottomTab === 'result' && (
          <div style={{ padding: '14px 16px', overflowY: 'auto' }}>
            {runResult ? (
              <div>
                {/* Result Status Banner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: runResult.status === 'Accepted' ? '#2CBB5D' : '#EF4444'
                  }}>
                    {runResult.status}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#888888' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} color="#888888" />
                      <span>Runtime: <strong style={{ color: '#D4D4D4' }}>{runResult.runtime_ms} ms</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Cpu size={13} color="#888888" />
                      <span>Memory: <strong style={{ color: '#D4D4D4' }}>{runResult.memory_mb} MB</strong></span>
                    </div>
                  </div>
                </div>

                {/* Stdout / Stderr logs */}
                {runResult.stderr && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, marginBottom: '4px' }}>
                      Compile / Runtime Error:
                    </div>
                    <pre style={{
                      margin: 0,
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#FCA5A5',
                      fontFamily: 'var(--mono)',
                      fontSize: '11px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {runResult.stderr}
                    </pre>
                  </div>
                )}

                {runResult.stdout && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#888888', marginBottom: '4px', fontFamily: 'var(--mono)' }}>
                      Stdout:
                    </div>
                    <pre style={{
                      margin: 0,
                      background: '#1F1F1F',
                      border: '1px solid #333333',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#E5E5E5',
                      fontFamily: 'var(--mono)',
                      fontSize: '12px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {runResult.stdout}
                    </pre>
                  </div>
                )}

                {/* Case Breakdown */}
                {runResult.test_results && runResult.test_results.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    {runResult.test_results.map((tr) => (
                      <div
                        key={tr.case_num}
                        style={{
                          flex: 1,
                          background: '#1F1F1F',
                          border: `1px solid ${tr.passed ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                          borderRadius: '6px',
                          padding: '8px 10px',
                          fontSize: '11px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 700 }}>
                          <span style={{ color: '#FFFFFF' }}>Case {tr.case_num}</span>
                          <span style={{ color: tr.passed ? '#22C55E' : '#EF4444' }}>
                            {tr.passed ? '✔ Passed' : '✖ Failed'}
                          </span>
                        </div>
                        <div style={{ color: '#888888', fontFamily: 'var(--mono)', fontSize: '10px' }}>
                          Output: {tr.actual || 'None'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: '#777777', fontSize: '12px', textAlign: 'center', padding: '18px 0' }}>
                You must run your code first to view LeetCode evaluation results.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
