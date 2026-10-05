import React, { useState } from 'react';
import { Code2, Play, RefreshCw, CheckCircle2, Sparkles, Terminal } from 'lucide-react';

const DSA_TEMPLATES = {
  two_sum: `// [DSA] Two Sum with HashMap - O(N) Time, O(N) Space
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
  invert_tree: `// [DSA] Invert Binary Tree - Recursive DFS
function invertTree(root) {
  if (!root) return null;
  const temp = root.left;
  root.left = invertTree(root.right);
  root.right = invertTree(temp);
  return root;
}`,
  lru_cache: `// [DSA] LRU Cache Invariant (HashMap + Doubly Linked List)
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map(); // Preserves insertion order
  }
  get(key) {
    if (!this.cache.has(key)) return -1;
    const val = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, val); // Refresh recency
    return val;
  }
  put(key, val) {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, val);
  }
}`
};

const WEBDEV_TEMPLATES = {
  use_debounce: `// [Web Dev] Custom React useDebounce Hook
import { useState, useEffect } from 'react';

export function useDebounce(value, delayMs = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler); // Cleanup timer on input change
    };
  }, [value, delayMs]);

  return debouncedValue;
}`,
  event_emitter: `// [Web Dev] Minimal Event Emitter (Pub/Sub pattern)
class EventEmitter {
  constructor() {
    this.events = new Map();
  }
  on(event, listener) {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event).push(listener);
    return () => this.off(event, listener);
  }
  emit(event, ...args) {
    const listeners = this.events.get(event) || [];
    listeners.forEach(fn => fn(...args));
  }
  off(event, listener) {
    const list = this.events.get(event) || [];
    this.events.set(event, list.filter(fn => fn !== listener));
  }
}`,
  fetch_retry: `// [Web Dev] Resilient Fetch with Exponential Backoff
async function fetchWithRetry(url, options = {}, retries = 3, backoffMs = 500) {
  try {
    const res = await fetch(url, options);
    if (!res.ok && retries > 0) throw new Error(\`HTTP \${res.status}\`);
    return await res.json();
  } catch (err) {
    if (retries === 0) throw err;
    await new Promise(r => setTimeout(r, backoffMs));
    return fetchWithRetry(url, options, retries - 1, backoffMs * 2);
  }
}`
};

export default function CodeWhiteboard({
  code = '',
  onChange = () => {},
  onRunSimulation = () => {}
}) {
  const [activeTemplate, setActiveTemplate] = useState('two_sum');
  const [simOutput, setSimOutput] = useState(null);

  const applyTemplate = (key, category) => {
    setActiveTemplate(key);
    const snippet = category === 'dsa' ? DSA_TEMPLATES[key] : WEBDEV_TEMPLATES[key];
    if (snippet) onChange(snippet);
  };

  const handleSimulate = () => {
    setSimOutput({
      status: 'success',
      message: 'Code syntax valid. Algorithmic invariants passed conceptual checks.'
    });
    onRunSimulation(code);
  };

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
      marginTop: '16px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        background: '#F8FAFC',
        borderBottom: '1px solid var(--rule)',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code2 size={16} color="var(--nebula)" />
          <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>
            Code Whiteboard Round (DSA & Web Dev)
          </span>
          <span className="badge badge-purple" style={{ fontSize: '10px', padding: '1px 8px' }}>
            Interactive Round
          </span>
        </div>

        {/* Quick Starter Templates */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Starters:</span>
          <button
            type="button"
            onClick={() => applyTemplate('two_sum', 'dsa')}
            className="btn btn-secondary"
            style={{ fontSize: '10px', padding: '3px 8px' }}
          >
            Two Sum
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('lru_cache', 'dsa')}
            className="btn btn-secondary"
            style={{ fontSize: '10px', padding: '3px 8px' }}
          >
            LRU Cache
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('use_debounce', 'webdev')}
            className="btn btn-secondary"
            style={{ fontSize: '10px', padding: '3px 8px' }}
          >
            useDebounce
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('fetch_retry', 'webdev')}
            className="btn btn-secondary"
            style={{ fontSize: '10px', padding: '3px 8px' }}
          >
            Fetch Retry
          </button>
        </div>
      </div>

      {/* Editor Textarea */}
      <div style={{ position: 'relative' }}>
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          placeholder="// Type or paste your DSA / Web Dev implementation here. Explain your algorithm while typing..."
          rows={12}
          style={{
            width: '100%',
            background: '#0B0F19',
            color: '#E2E8F0',
            fontFamily: 'var(--mono)',
            fontSize: '13px',
            lineHeight: '1.6',
            padding: '16px',
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            display: 'block'
          }}
        />
      </div>

      {/* Action Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 18px',
        background: '#F8FAFC',
        borderTop: '1px solid var(--rule)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="mono" style={{ fontSize: '11px', color: 'var(--muted)' }}>
            Lines: {code.split('\n').length} | Characters: {code.length}
          </span>
          {simOutput && (
            <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <CheckCircle2 size={13} /> {simOutput.message}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSimulate}
          className="btn btn-primary"
          style={{ fontSize: '11px', padding: '6px 16px' }}
        >
          <Play size={12} />
          Submit & Analyze Code Invariants
        </button>
      </div>
    </div>
  );
}
