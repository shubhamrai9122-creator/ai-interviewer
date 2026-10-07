import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Send, RotateCcw, CheckCircle2, XCircle, AlertCircle, 
  Terminal, Code2, Sparkles, Copy, Check, ChevronDown, ChevronRight,
  Cpu, Clock, Layers, Bug, CheckCheck, RefreshCw, Settings, Sliders
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const STARTER_CODES = {
  cpp: {
    dsa: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        
    }
};`,
    webdev: `class Solution {
public:
    int calculateLatency(int requestCount, int networkDelay) {
        
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
    
};`,
    webdev: `/**
 * @param {Function} fn
 * @param {number} t
 * @return {Function}
 */
var debounce = function(fn, t) {
    let timerId = null;
    return function(...args) {
        
    };
};`
  },
  python: {
    dsa: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        
        return []`,
    webdev: `class Solution:
    def debounce(self, fn, t: int):
        
        pass`
  },
  java: {
    dsa: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        
        return new int[]{};
    }
}`,
    webdev: `class Solution {
    public int handleRequest(int t) {
        
        return 200;
    }
}`
  }
};

const DEFAULT_DSA_TEST_CASES = [
  {
    id: 1,
    name: 'Case 1',
    inputName1: 'nums =',
    inputValue1: '[2, 7, 11, 15]',
    inputName2: 'target =',
    inputValue2: '9',
    input: 'nums = [2, 7, 11, 15], target = 9',
    expected: '[0, 1]'
  },
  {
    id: 2,
    name: 'Case 2',
    inputName1: 'nums =',
    inputValue1: '[3, 2, 4]',
    inputName2: 'target =',
    inputValue2: '6',
    input: 'nums = [3, 2, 4], target = 6',
    expected: '[1, 2]'
  },
  {
    id: 3,
    name: 'Case 3',
    inputName1: 'nums =',
    inputValue1: '[3, 3]',
    inputName2: 'target =',
    inputValue2: '6',
    input: 'nums = [3, 3], target = 6',
    expected: '[0, 1]'
  }
];

const DEFAULT_WEB_TEST_CASES = [
  {
    id: 1,
    name: 'Case 1',
    inputName1: 'calls =',
    inputValue1: '[{"t": 50, "inputs": [1]}, {"t": 75, "inputs": [2]}]',
    inputName2: 't =',
    inputValue2: '50',
    input: 'fn = dispatch, delay = 50ms (rapid 3 burst)',
    expected: 'PASSED'
  },
  {
    id: 2,
    name: 'Case 2',
    inputName1: 'route =',
    inputValue1: '"GET /api/status"',
    inputName2: 'expectedStatus =',
    inputValue2: '200',
    input: 'GET /api/status -> HTTP 200 OK',
    expected: 'PASSED'
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

  // 1. Comments (green)
  escaped = escaped.replace(/\/\*[\s\S]*?\*\//g, (m) => saveToken(`<span style="color: #008000; font-style: italic;">${m}</span>`));
  escaped = escaped.replace(/(\/\/[^\n]*)/g, (m) => saveToken(`<span style="color: #008000; font-style: italic;">${m}</span>`));
  if (lang === 'python') {
    escaped = escaped.replace(/(#[^\n]*)/g, (m) => saveToken(`<span style="color: #008000; font-style: italic;">${m}</span>`));
  }

  // 2. Strings (dark red)
  escaped = escaped.replace(/("(\\"|[^"])*"|'(\\'|[^'])*'|`(\\`|[^`])*`)/g, (m) => saveToken(`<span style="color: #A31515;">${m}</span>`));

  // 3. Types (teal)
  escaped = escaped.replace(/\b(int|string|vector|bool|boolean|void|float|double|char|long|List|Dict|TreeNode|ListNode|Solution|Array|Object|Function|number|Promise|size_t)\b/g, (m) => saveToken(`<span style="color: #267F99; font-weight: 600;">${m}</span>`));

  // 4. Keywords (blue)
  escaped = escaped.replace(/\b(class|public|private|protected|return|var|let|const|function|def|import|from|for|while|if|else|new|this|auto|using|namespace|struct|static|async|await|try|catch|throw|typeof|instanceof|switch|case|break|continue|pass)\b/g, (m) => saveToken(`<span style="color: #0000FF; font-weight: 600;">${m}</span>`));

  // 5. Literals (blue)
  escaped = escaped.replace(/\b(true|false|null|nullptr|None|undefined)\b/g, (m) => saveToken(`<span style="color: #0000FF; font-weight: 600;">${m}</span>`));

  // 6. Functions (brown / olive)
  escaped = escaped.replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, (m) => saveToken(`<span style="color: #795E26;">${m}</span>`));

  // 7. Numbers (olive green)
  escaped = escaped.replace(/\b(\d+(\.\d+)?)\b/g, (m) => saveToken(`<span style="color: #098658;">${m}</span>`));

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
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  
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

  // Indentation support & cursor position tracking inside editor
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
          updateCursorPosition(textareaRef.current);
        }
      }, 0);
    }
  };

  const updateCursorPosition = (el) => {
    if (!el) return;
    const textBefore = el.value.substring(0, el.selectionStart);
    const lines = textBefore.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    setCursorPos({ line, col });
  };

  const handleSelectOrClick = (e) => {
    updateCursorPosition(e.target);
  };

  // Sandboxed code runner
  const handleRunCode = async () => {
    setIsRunning(true);
    setActiveBottomTab('result');
    setIsDrawerCollapsed(false);

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

  const handleSubmit = async () => {
    await handleRunCode();
    onSubmitSolution(code);
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
      minHeight: '680px',
      width: '100%',
      background: '#FFFFFF',
      borderRadius: '8px',
      border: '1px solid #E5E7EB',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* 1. Header Toolbar (Light Theme matching photo) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 14px',
        background: '#FAFAFA',
        borderBottom: '1px solid #E5E7EB',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Left: </> Code & Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#10B981',
            fontSize: '13px',
            fontWeight: 700
          }}>
            <span>&lt;/&gt;</span>
            <span style={{ color: '#1F2937', fontWeight: 600 }}>Code</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              style={{
                background: '#FFFFFF',
                color: '#1F2937',
                border: '1px solid #D1D5DB',
                borderRadius: '5px',
                padding: '4px 8px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
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
              fontSize: '11px',
              color: '#6B7280',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}>
              ⚙ Auto
            </span>
          </div>
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
              padding: '4px 8px',
              background: '#FFFFFF',
              color: '#4B5563',
              border: '1px solid #E5E7EB',
              borderRadius: '5px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
            title="Copy Code"
          >
            {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: '#FFFFFF',
              color: '#4B5563',
              border: '1px solid #E5E7EB',
              borderRadius: '5px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
            title="Reset to Starter Code"
          >
            <RotateCcw size={12} />
            Reset
          </button>

          {/* Run Button (Light Gray pill with Play icon) */}
          <button
            type="button"
            onClick={handleRunCode}
            disabled={isRunning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 14px',
              background: '#F3F4F6',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Play size={11} color="#4B5563" fill="#4B5563" />
            {isRunning ? 'Running...' : 'Run'}
          </button>

          {/* Submit Button (Bright Green pill) */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isRunning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 16px',
              background: '#2CBB5D',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 3px rgba(44, 187, 93, 0.2)'
            }}
          >
            <Send size={11} />
            {isRunning ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>

      {/* 2. Light Theme Editor Body (Line Numbers + Colorful Syntax Layer) */}
      <div style={{
        flex: 1,
        display: 'flex',
        position: 'relative',
        background: '#FFFFFF',
        overflow: 'hidden',
        minHeight: '340px'
      }}>
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          style={{
            width: '42px',
            padding: '12px 6px 12px 0',
            background: '#FFFFFF',
            borderRight: '1px solid #F3F4F6',
            textAlign: 'right',
            userSelect: 'none',
            fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#9CA3AF',
            overflowY: 'hidden'
          }}
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code Canvas Container with Syntax Highlight Underlay */}
        <div style={{ position: 'relative', flex: 1, height: '100%', overflow: 'hidden' }}>
          {/* Syntax Highlighted HTML Underlay (Clean Light Background) */}
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
              padding: '12px 14px',
              fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
              fontSize: '13px',
              lineHeight: '1.6',
              whiteSpace: 'pre',
              wordWrap: 'normal',
              pointerEvents: 'none',
              overflow: 'hidden',
              background: '#FFFFFF',
              color: '#1F2937',
              tabSize: 4
            }}
          />

          {/* Interactive Transparent Textarea Overlay */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => {
              onChange(e.target.value);
              updateCursorPosition(e.target);
            }}
            onClick={handleSelectOrClick}
            onKeyUp={handleSelectOrClick}
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
              padding: '12px 14px',
              boxSizing: 'border-box',
              background: 'transparent',
              color: 'transparent',
              caretColor: '#1F2937',
              fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
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

      {/* Editor Footer Status Bar (ln 1, Col 1 & Saved) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '3px 12px',
        background: '#FAFAFA',
        borderTop: '1px solid #F3F4F6',
        fontSize: '11px',
        color: '#9CA3AF'
      }}>
        <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Check size={11} /> Saved
        </span>
        <span>ln {cursorPos.line}, Col {cursorPos.col}</span>
      </div>

      {/* 3. Bottom Testcase & Test Result Panel (Light Theme matching photo) */}
      <div style={{
        background: '#FFFFFF',
        borderTop: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: isDrawerCollapsed ? '36px' : '280px',
        transition: 'max-height 0.2s ease',
        overflow: 'hidden'
      }}>
        {/* Tab Headers: Testcase vs Test Result */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          background: '#FAFAFA',
          borderBottom: isDrawerCollapsed ? 'none' : '1px solid #E5E7EB',
          height: '36px',
          minHeight: '36px'
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
                color: (!isDrawerCollapsed && activeBottomTab === 'testcase') ? '#111827' : '#6B7280',
                border: 'none',
                borderBottom: (!isDrawerCollapsed && activeBottomTab === 'testcase') ? '2px solid #FFA116' : '2px solid transparent',
                fontSize: '12px',
                fontWeight: (!isDrawerCollapsed && activeBottomTab === 'testcase') ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              <CheckCircle2 size={13} color={(!isDrawerCollapsed && activeBottomTab === 'testcase') ? '#10B981' : '#9CA3AF'} />
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
                color: (!isDrawerCollapsed && activeBottomTab === 'result') ? '#111827' : '#6B7280',
                border: 'none',
                borderBottom: (!isDrawerCollapsed && activeBottomTab === 'result') ? '2px solid #FFA116' : '2px solid transparent',
                fontSize: '12px',
                fontWeight: (!isDrawerCollapsed && activeBottomTab === 'result') ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              <span>&gt;_ Test Result</span>
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
            {runResult && !isDrawerCollapsed && activeBottomTab === 'result' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: runResult.status === 'Accepted' ? '#16A34A' : '#DC2626'
                }}>
                  {runResult.status}
                </span>
                <span style={{ fontSize: '11px', color: '#6B7280' }}>
                  {runResult.runtime_ms} ms
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6B7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                padding: '4px 6px'
              }}
              title={isDrawerCollapsed ? "Expand Testcase Panel" : "Collapse Testcase Panel"}
            >
              <span>{isDrawerCollapsed ? 'Expand' : 'Collapse'}</span>
              {isDrawerCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* Tab 1: Testcase Panel (Case 1, Case 2, Case 3 pills matching photo) */}
        {!isDrawerCollapsed && activeBottomTab === 'testcase' && (
          <div style={{ padding: '12px 16px', overflowY: 'auto', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
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
                    background: (!isCustomInputMode && selectedTestCaseIndex === idx) ? '#E5E7EB' : '#F3F4F6',
                    color: (!isCustomInputMode && selectedTestCaseIndex === idx) ? '#111827' : '#4B5563',
                    border: '1px solid',
                    borderColor: (!isCustomInputMode && selectedTestCaseIndex === idx) ? '#D1D5DB' : '#E5E7EB',
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
                  background: isCustomInputMode ? '#E5E7EB' : '#F3F4F6',
                  color: isCustomInputMode ? '#111827' : '#4B5563',
                  border: '1px solid',
                  borderColor: isCustomInputMode ? '#FFA116' : '#E5E7EB',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                + Custom Stdin
              </button>
            </div>

            {!isCustomInputMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontFamily: 'monospace' }}>
                    {activeTestCase.inputName1 || 'Input:'}
                  </div>
                  <div style={{
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#1F2937'
                  }}>
                    {activeTestCase.inputValue1 || activeTestCase.input}
                  </div>
                </div>

                {activeTestCase.inputName2 && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontFamily: 'monospace' }}>
                      {activeTestCase.inputName2}
                    </div>
                    <div style={{
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: '#1F2937'
                    }}>
                      {activeTestCase.inputValue2}
                    </div>
                  </div>
                )}

                {activeTestCase.expected && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontFamily: 'monospace' }}>
                      Output:
                    </div>
                    <div style={{
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: '#059669',
                      fontWeight: 700
                    }}>
                      {activeTestCase.expected}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontFamily: 'monospace' }}>
                  Custom Input (passed directly to sandbox runner):
                </div>
                <input
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="e.g. nums = [3, 2, 4], target = 6"
                  style={{
                    width: '100%',
                    background: '#F9FAFB',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#1F2937',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Test Result Panel (Light Theme) */}
        {!isDrawerCollapsed && activeBottomTab === 'result' && (
          <div style={{ padding: '12px 16px', overflowY: 'auto', background: '#FFFFFF' }}>
            {runResult ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: runResult.status === 'Accepted' ? '#16A34A' : '#DC2626'
                  }}>
                    {runResult.status}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#6B7280' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} color="#6B7280" />
                      <span>Runtime: <strong style={{ color: '#1F2937' }}>{runResult.runtime_ms} ms</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Cpu size={12} color="#6B7280" />
                      <span>Memory: <strong style={{ color: '#1F2937' }}>{runResult.memory_mb} MB</strong></span>
                    </div>
                  </div>
                </div>

                {runResult.stderr && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700, marginBottom: '4px' }}>
                      Compile / Runtime Error:
                    </div>
                    <pre style={{
                      margin: 0,
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#991B1B',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {runResult.stderr}
                    </pre>
                  </div>
                )}

                {runResult.stdout && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontFamily: 'monospace' }}>
                      Stdout:
                    </div>
                    <pre style={{
                      margin: 0,
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#1F2937',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {runResult.stdout}
                    </pre>
                  </div>
                )}

                {runResult.test_results && runResult.test_results.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    {runResult.test_results.map((tr) => (
                      <div
                        key={tr.case_num}
                        style={{
                          flex: 1,
                          background: tr.passed ? '#F0FDF4' : '#FEF2F2',
                          border: `1px solid ${tr.passed ? '#BBF7D0' : '#FECACA'}`,
                          borderRadius: '6px',
                          padding: '8px 10px',
                          fontSize: '11px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 700 }}>
                          <span style={{ color: '#1F2937' }}>Case {tr.case_num}</span>
                          <span style={{ color: tr.passed ? '#16A34A' : '#DC2626' }}>
                            {tr.passed ? '✔ Passed' : '✖ Failed'}
                          </span>
                        </div>
                        <div style={{ color: '#6B7280', fontFamily: 'monospace', fontSize: '10px' }}>
                          Output: {tr.actual || 'None'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: '#9CA3AF', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>
                You must run your code first to view sandbox evaluation results.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
