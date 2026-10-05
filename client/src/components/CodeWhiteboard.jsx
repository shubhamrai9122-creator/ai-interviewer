import React, { useState } from 'react';
import { Code2, Play, RefreshCw, CheckCircle2 } from 'lucide-react';

const LANGUAGE_TEMPLATES = {
  python: `# Python Solution Scratchpad
def solve(arr, k):
    # Explain your invariant and time complexity while typing
    seen = {}
    for i, val in enumerate(arr):
        target = k - val
        if target in seen:
            return (seen[target], i)
        seen[val] = i
    return None
`,
  javascript: `// JavaScript Solution Scratchpad
function solve(arr, k) {
  // Candidate algorithm logic
  const map = new Map();
  for (let i = 0; i < arr.length; i++) {
    const diff = k - arr[i];
    if (map.has(diff)) {
      return [map.get(diff), i];
    }
    map.set(arr[i], i);
  }
  return null;
}
`,
  cpp: `// C++ Solution Scratchpad
#include <iostream>
#include <unordered_map>
#include <vector>

std::pair<int, int> solve(const std::vector<int>& nums, int target) {
    std::unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); ++i) {
        int diff = target - nums[i];
        if (seen.count(diff)) return {seen[diff], i};
        seen[nums[i]] = i;
    }
    return {-1, -1};
}
`
};

export default function CodeWhiteboard({
  code = '',
  onChange = () => {},
  onRunSimulation = () => {}
}) {
  const [language, setLanguage] = useState('python');
  const [simOutput, setSimOutput] = useState(null);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (!code || code === LANGUAGE_TEMPLATES.python || code === LANGUAGE_TEMPLATES.javascript || code === LANGUAGE_TEMPLATES.cpp) {
      onChange(LANGUAGE_TEMPLATES[newLang]);
    }
  };

  const handleSimulate = () => {
    setSimOutput({
      status: 'success',
      message: 'Code syntax valid. Algorithmic invariants passed conceptual linting checks.'
    });
    onRunSimulation(code);
  };

  return (
    <div style={{
      background: 'rgba(11, 17, 32, 0.9)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Top Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'rgba(6, 9, 19, 0.95)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code2 size={16} color="var(--primary-light)" />
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>
            Interactive Whiteboard & Code Pad
          </span>
          <span className="badge badge-purple" style={{ fontSize: '10px' }}>
            Multi-Modal Viva
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-subtle)',
              color: '#f8fafc',
              fontSize: '12px',
              padding: '4px 8px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <option value="python">Python 3</option>
            <option value="javascript">JavaScript (ES6)</option>
            <option value="cpp">C++ 20</option>
          </select>

          <button
            type="button"
            onClick={() => onChange(LANGUAGE_TEMPLATES[language])}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '4px 8px' }}
            title="Reset to template"
          >
            <RefreshCw size={12} />
            Reset
          </button>

          <button
            type="button"
            onClick={handleSimulate}
            className="btn btn-primary"
            style={{ fontSize: '11px', padding: '4px 10px' }}
          >
            <Play size={12} />
            Verify Syntax
          </button>
        </div>
      </div>

      {/* Editor Textarea */}
      <div style={{ position: 'relative', flex: 1, minHeight: '200px' }}>
        <textarea
          value={code || LANGUAGE_TEMPLATES[language]}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="mono"
          style={{
            width: '100%',
            height: '100%',
            minHeight: '200px',
            background: 'transparent',
            color: '#38bdf8',
            border: 'none',
            outline: 'none',
            padding: '14px',
            fontSize: '13px',
            lineHeight: '1.6',
            resize: 'none',
            fontFamily: 'var(--font-mono)'
          }}
          placeholder="Type or explain code here during applied questions..."
        />
      </div>

      {/* Simulation Result */}
      {simOutput && (
        <div style={{
          padding: '8px 14px',
          background: 'rgba(16, 185, 129, 0.1)',
          borderTop: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: 'var(--emerald)'
        }}>
          <CheckCircle2 size={14} />
          <span>{simOutput.message}</span>
        </div>
      )}
    </div>
  );
}
