import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Send, RotateCcw, CheckCircle2, XCircle, AlertCircle, 
  Terminal, Code2, Sparkles, Copy, Check, ChevronDown, ChevronRight,
  Cpu, Clock, Layers, Bug, Flame, CheckCheck, RefreshCw
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const STARTER_CODES = {
  cpp: {
    dsa: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Return indices of the two numbers such that they add up to target
        
        return {};
    }
};`,
    webdev: `class Solution {
public:
    int calculateLatency(int requestCount, int networkDelay) {
        // Return computed server latency in milliseconds
        
        return 0;
    }
};`
  },
  javascript: {
    dsa: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Return indices of the two numbers such that they add up to target
    
    return [];
};`,
    webdev: `/**
 * @param {Function} fn
 * @param {number} t
 * @return {Function}
 */
var debounce = function(fn, t) {
    // Return a debounced version of that function
    
    return function(...args) {
        
    };
};`
  },
  python: {
    dsa: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Return indices of the two numbers such that they add up to target
        
        return []`,
    webdev: `class Solution:
    def debounce(self, fn, t: int):
        # Return debounced version of function
        
        pass`
  },
  java: {
    dsa: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Return indices of the two numbers such that they add up to target
        
        return new int[]{};
    }
}`,
    webdev: `class Solution {
    public int handleRequest(int t) {
        // Return processed response status code
        
        return 200;
    }
}`
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

const highlightSyntax = (rawCode, lang) => {
  if (!rawCode) return '&nbsp;';

  let escaped = rawCode
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const tokens = [];
  const saveToken = (html) => {
    tokens.push(html);
    return `___TOKEN_${tokens.length - 1}___`;
  };

  // 1. Comments
  escaped = escaped.replace(/\/\*[\s\S]*?\*\//g, (m) => saveToken(`<span style="color: #6A9955; font-style: italic;">${m}</span>`));
  escaped = escaped.replace(/(\/\/[^\n]*)/g, (m) => saveToken(`<span style="color: #6A9955; font-style: italic;">${m}</span>`));
  if (lang === 'python') {
    escaped = escaped.replace(/(#[^\n]*)/g, (m) => saveToken(`<span style="color: #6A9955; font-style: italic;">${m}</span>`));
  }

  // 2. Strings
  escaped = escaped.replace(/("(\\"|[^"])*"|'(\\'|[^'])*'|`(\\`|[^`])*`)/g, (m) => saveToken(`<span style="color: #CE9178;">${m}</span>`));

  // 3. Types
  escaped = escaped.replace(/\b(int|string|vector|bool|boolean|void|float|double|char|long|List|Dict|TreeNode|ListNode|Solution|Array|Object|Function|number|Promise|size_t)\b/g, (m) => `<span style="color: #4EC9B0; font-weight: 600;">${m}</span>`);

  // 4. Keywords
  escaped = escaped.replace(/\b(class|public|private|protected|return|var|let|const|function|def|import|from|for|while|if|else|new|this|auto|using|namespace|struct|static|async|await|try|catch|throw|typeof|instanceof|switch|case|break|continue|pass)\b/g, (m) => `<span style="color: #569CD6; font-weight: 600;">${m}</span>`);

  // 5. Literals
  escaped = escaped.replace(/\b(true|false|null|nullptr|None|undefined)\b/g, (m) => `<span style="color: #569CD6; font-weight: 600;">${m}</span>`);

  // 6. Numbers
  escaped = escaped.replace(/\b(\d+(\.\d+)?)\b/g, (m) => `<span style="color: #B5CEA8;">${m}</span>`);

  // 7. Functions
  escaped = escaped.replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, (m) => `<span style="color: #DCDCAA;">${m}</span>`);

  // 8. Restore tokens
  escaped = escaped.replace(/___TOKEN_(\d+)___/g, (_, idx) => tokens[parseInt(idx, 10)]);

  if (rawCode.endsWith('\n')) {
    escaped += ' ';
  }

  return escaped;
};

export default function HackerRankCodeEditor({
  subject = 'dsa', // 'dsa' or 'webdev'
  code = '',
  onChange = () => {},
  onSubmitSolution = () => {}
}) {
  const standardLang = subject === 'webdev' ? 'javascript' : 'cpp';
  const [language, setLanguage] = useState(standardLang);
  const [activeBottomTab, setActiveBottomTab] = useState('testcase'); // 'testcase' or 'result'
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [isCustomInputMode, setIsCustomInputMode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const gutterRef = useRef(null);

  const testCases = subject === 'webdev' ? DEFAULT_WEB_TEST_CASES : DEFAULT_DSA_TEST_CASES;

  // Initialize with standard starter code on subject change or if empty
  useEffect(() => {
    const stdLang = subject === 'webdev' ? 'javascript' : 'cpp';
    setLanguage(stdLang);
    const template = STARTER_CODES[stdLang]?.[subject] || (subject === 'webdev' ? STARTER_CODES.javascript.webdev : STARTER_CODES.cpp.dsa);
    if (!code || code.trim() === '') {
      onChange(template);
    }
  }, [subject]);

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
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.target.scrollTop;
      highlightRef.current.scrollLeft = e.target.scrollLeft;
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
              MSOT LeetCode Arena
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
            <option value="cpp">{subject === 'dsa' ? 'C++ (Standard)' : 'C++'}</option>
            <option value="javascript">{subject === 'webdev' ? 'JavaScript (Standard)' : 'JavaScript'}</option>
            <option value="python">Python 3</option>
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
            {subject === 'dsa' ? 'DSA • C++ Standard' : 'WEB • JS Standard'}
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

      {/* 2. LeetCode Editor Body (Line Numbers + Colorful Syntax Layer) */}
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
            padding: '14px 8px 14px 0',
            background: '#1E1E1E',
            borderRight: '1px solid #2B2B2B',
            textAlign: 'right',
            userSelect: 'none',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#858585',
            overflowY: 'hidden'
          }}
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code Canvas Container with Syntax Highlight Underlay */}
        <div style={{ position: 'relative', flex: 1, height: '100%', overflow: 'hidden' }}>
          {/* Syntax Highlighted HTML Underlay */}
          <pre
            ref={highlightRef}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlightSyntax(code, language) }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              margin: 0,
              padding: '14px 16px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '13px',
              lineHeight: '1.6',
              whiteSpace: 'pre',
              wordWrap: 'normal',
              pointerEvents: 'none',
              overflow: 'hidden',
              background: 'transparent',
              color: '#D4D4D4',
              tabSize: 4
            }}
          />

          {/* Interactive Transparent Textarea Overlay */}
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
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              margin: 0,
              padding: '14px 16px',
              boxSizing: 'border-box',
              background: 'transparent',
              color: 'transparent',
              caretColor: '#38BDF8',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '13px',
              lineHeight: '1.6',
              border: 'none',
              outline: 'none',
              resize: 'none',
              whiteSpace: 'pre',
              wordWrap: 'normal',
              overflowX: 'auto',
              overflowY: 'auto',
              tabSize: 4
            }}
          />
        </div>
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
