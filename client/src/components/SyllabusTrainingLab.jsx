import React, { useState, useEffect } from 'react';

const PRESETS = {
  dsa_striver: {
    title: "Striver SDE Sheet - Graphs & Dynamic Programming",
    subject: "Data Structures & Algorithms",
    role: "Software Development Engineer (SDE) Intern",
    text: `Module 1: Advanced Graph Algorithms
- Directed and Undirected Graph Representation (Adjacency List & Matrix)
- Breadth First Search (BFS) and Depth First Search (DFS)
- Cycle Detection in Directed Graphs using Topological Sort (Kahn's Algorithm)
- Shortest Path in Weighted Graphs (Dijkstra's Algorithm)
- Minimum Spanning Trees (Prim's and Kruskal's)

Module 2: Dynamic Programming Mastery
- 1D DP: Climbing Stairs, Frog Jump, House Robber
- 2D/3D DP: Grid Unique Paths, Minimum Path Sum
- DP on Subsequences: 0/1 Knapsack, Coin Change (Infinite Supply), Target Sum
- DP on Strings: Longest Common Subsequence (LCS), Edit Distance`
  },
  dsa_core_patterns: {
    title: "Core 75 Algorithmic Patterns (Sliding Window & Trees)",
    subject: "Data Structures & Algorithms",
    role: "SDE Intern",
    text: `Topic 1: Two Pointers & Sliding Window
- Maximum Average Subarray, Max Consecutive Ones III
- Longest Substring Without Repeating Characters
- Container With Most Water, Trapping Rain Water

Topic 2: Binary Search & Monotonic Space
- Search in Rotated Sorted Array
- Koko Eating Bananas, Capacity to Ship Packages
- Peak Element finding in O(log N)

Topic 3: Trees and Binary Search Trees
- Maximum Depth of Binary Tree, Diameter of Binary Tree
- Lowest Common Ancestor (LCA) in Binary Tree
- Validate Binary Search Tree (BST Invariant)`
  },
  web_mern: {
    title: "Modern MERN Full-Stack Systems & Auth",
    subject: "Web Development",
    role: "Full-Stack Developer Intern",
    text: `Part 1: Frontend Architecture with React
- Virtual DOM Reconciliation, React Fiber Tree & Diffing Algorithm
- React Hooks: useState, useEffect, useMemo, useCallback, useRef
- State Collocation, Redux Toolkit, Context API Performance Optimization

Part 2: Backend Architecture with Node.js & Express
- Node.js Event Loop phases: Microtasks, Macrotasks, Timers, I/O Polling
- Express Middleware pipeline (req, res, next), Error Handling Middleware
- RESTful API design, HTTP status codes, CORS configuration

Part 3: Security & Storage
- Stateless JWT Authentication with Access Tokens & HttpOnly Refresh Cookies
- Mitigating Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF)
- MongoDB Schema design, Indexing strategies, Query optimization`
  },
  web_frontend: {
    title: "React High-Performance & Web Security Track",
    subject: "Web Development",
    role: "Frontend Engineer Intern",
    text: `Unit 1: Advanced React Rendering
- Component Lifecycle & Re-render triggers
- Preventing unnecessary re-renders using React.memo and shallow prop equality
- Concurrent React: useTransition, useDeferredValue, Suspense

Unit 2: Web Performance & Security
- Web Vitals: Largest Contentful Paint (LCP), First Input Delay (FID), Cumulative Layout Shift (CLS)
- Content Security Policy (CSP), SameSite Cookie attributes, CORS preflight requests
- Client-side routing, code splitting with React.lazy and dynamic imports`
  }
};

export default function SyllabusTrainingLab({ onLaunchInterview }) {
  const [subject, setSubject] = useState("Data Structures & Algorithms");
  const [title, setTitle] = useState("");
  const [targetRole, setTargetRole] = useState("Software Development Engineer (SDE) Intern");
  const [syllabusText, setSyllabusText] = useState("");
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStep, setTrainingStep] = useState(0);
  const [syllabi, setSyllabi] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [notification, setNotification] = useState(null);
  const [expandedSyllabusId, setExpandedSyllabusId] = useState(null);

  useEffect(() => {
    fetchSyllabi();
  }, []);

  const fetchSyllabi = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/syllabus/list");
      if (res.ok) {
        const data = await res.json();
        setSyllabi(data);
      }
    } catch (err) {
      console.error("Failed to fetch syllabi:", err);
    }
  };

  const handleApplyPreset = (key) => {
    const p = PRESETS[key];
    if (!p) return;
    setSelectedPreset(key);
    setTitle(p.title);
    setSubject(p.subject);
    setTargetRole(p.role);
    setSyllabusText(p.text);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setSyllabusText(content);
      setNotification({
        type: "success",
        msg: `File "${file.name}" uploaded successfully (${Math.round(file.size / 1024)} KB)!`
      });
    };
    reader.onerror = () => {
      setNotification({ type: "error", msg: "Failed to read the file. Please try pasting text." });
    };
    reader.readAsText(file);
  };

  const handleTrain = async (e) => {
    e.preventDefault();
    if (!syllabusText.trim()) {
      setNotification({ type: "error", msg: "Please upload or paste your syllabus content before training." });
      return;
    }

    setIsTraining(true);
    setTrainingStep(1);

    // Realistic progressive steps
    setTimeout(() => setTrainingStep(2), 600);
    setTimeout(() => setTrainingStep(3), 1200);

    try {
      const res = await fetch("http://localhost:8000/api/syllabus/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || `${subject} Custom Syllabus`,
          subject: subject,
          target_role: targetRole,
          syllabus_text: syllabusText
        })
      });

      const data = await res.json();
      setIsTraining(false);
      setTrainingStep(0);

      if (res.ok && data.success) {
        setNotification({
          type: "success",
          msg: `🎉 Success! Ira is now trained on "${data.title}". ${data.topics_count} topic modules and ${data.questions_generated_count} adaptive questions generated!`
        });
        fetchSyllabi();
      } else {
        setNotification({ type: "error", msg: data.detail || "Training failed. Please check input format." });
      }
    } catch (err) {
      setIsTraining(false);
      setTrainingStep(0);
      setNotification({ type: "error", msg: "Connection error with training service." });
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      const res = await fetch("http://localhost:8000/api/syllabus/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syllabus_id: id, is_active: !currentStatus })
      });
      if (res.ok) {
        fetchSyllabi();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this trained syllabus?")) return;
    try {
      const res = await fetch(`http://localhost:8000/api/syllabus/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSyllabi();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #EBF5FB 0%, #FFFFFF 100%)',
        border: '1px solid #D0E3F0',
        borderRadius: '12px',
        padding: '28px 32px',
        marginBottom: '28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0, 139, 220, 0.08)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span className="is-badge-blue">MSOT AI Lab</span>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Mirai School of Technology • DSA & Web Development Tracks</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>
            Personalize MSOT AI Recruiter <span style={{ color: '#008BDC' }}>Ira</span> With Your Syllabus
          </h1>
          <p style={{ color: '#475569', fontSize: '15px', maxWidth: '680px', lineHeight: 1.5 }}>
            Upload or paste your personal syllabus, semester notes, or curated problem sheets.
            Ira parses your topics, extracts core patterns, and crafts an adaptive interview session based specifically on your curriculum.
          </p>
        </div>
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #008BDC',
          borderRadius: '12px',
          padding: '16px 20px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0, 139, 220, 0.12)',
          minWidth: '200px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '4px' }}>👩‍💼</div>
          <div style={{ fontWeight: 700, color: '#008BDC', fontSize: '15px' }}>Ira • AI Recruiter</div>
          <div style={{ fontSize: '12px', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginTop: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span>
            Ready to Train
          </div>
        </div>
      </div>

      {notification && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          fontWeight: 500,
          background: notification.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${notification.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
          color: notification.type === 'success' ? '#065F46' : '#991B1B',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{notification.msg}</span>
          <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
      )}

      {/* Main Grid: Form on Left, Active Syllabi on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Left Column: Training Studio */}
        <div className="is-card is-card-highlight">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B' }}>
              📚 Train AI with New Syllabus
            </h2>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Strictly DSA & Web Dev</span>
          </div>

          {/* Quick Presets */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              Quick Presets (1-Click Load)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleApplyPreset('dsa_striver')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: selectedPreset === 'dsa_striver' ? '1.5px solid #008BDC' : '1px solid #E2E8F0',
                  background: selectedPreset === 'dsa_striver' ? '#EBF5FB' : '#F8FAFC',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'left',
                  color: selectedPreset === 'dsa_striver' ? '#008BDC' : '#334155',
                  cursor: 'pointer'
                }}
              >
                🌲 Striver SDE Sheet (Graphs & DP)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('dsa_core_patterns')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: selectedPreset === 'dsa_core_patterns' ? '1.5px solid #008BDC' : '1px solid #E2E8F0',
                  background: selectedPreset === 'dsa_core_patterns' ? '#EBF5FB' : '#F8FAFC',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'left',
                  color: selectedPreset === 'dsa_core_patterns' ? '#008BDC' : '#334155',
                  cursor: 'pointer'
                }}
              >
                ⚡ Core 75 Patterns
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('web_mern')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: selectedPreset === 'web_mern' ? '1.5px solid #FF6B00' : '1px solid #E2E8F0',
                  background: selectedPreset === 'web_mern' ? '#FFF4EC' : '#F8FAFC',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'left',
                  color: selectedPreset === 'web_mern' ? '#FF6B00' : '#334155',
                  cursor: 'pointer'
                }}
              >
                🌐 MERN Full-Stack & JWT
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('web_frontend')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: selectedPreset === 'web_frontend' ? '1.5px solid #FF6B00' : '1px solid #E2E8F0',
                  background: selectedPreset === 'web_frontend' ? '#FFF4EC' : '#F8FAFC',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'left',
                  color: selectedPreset === 'web_frontend' ? '#FF6B00' : '#334155',
                  cursor: 'pointer'
                }}
              >
                ⚛️ React Fiber & Security
              </button>
            </div>
          </div>

          <form onSubmit={handleTrain}>
            {/* Domain Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Subject Track *
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: subject === 'Data Structures & Algorithms' ? '2px solid #008BDC' : '1px solid #CBD5E1',
                  background: subject === 'Data Structures & Algorithms' ? '#EBF5FB' : '#FFFFFF',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px'
                }}>
                  <input
                    type="radio"
                    name="subject"
                    value="Data Structures & Algorithms"
                    checked={subject === 'Data Structures & Algorithms'}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{ accentColor: '#008BDC' }}
                  />
                  🔷 DSA & Algorithms
                </label>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: subject === 'Web Development' ? '2px solid #FF6B00' : '1px solid #CBD5E1',
                  background: subject === 'Web Development' ? '#FFF4EC' : '#FFFFFF',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px'
                }}>
                  <input
                    type="radio"
                    name="subject"
                    value="Web Development"
                    checked={subject === 'Web Development'}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{ accentColor: '#FF6B00' }}
                  />
                  🔶 Web Development
                </label>
              </div>
            </div>

            {/* Syllabus Title & Target Role */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Syllabus Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. My Semester 5 DSA Graph Notes"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Target Role
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    background: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="Software Development Engineer (SDE) Intern">SDE Intern</option>
                  <option value="Frontend Developer Intern">Frontend Intern</option>
                  <option value="Backend Developer Intern">Backend Intern</option>
                  <option value="Full-Stack Developer Intern">Full-Stack Intern</option>
                </select>
              </div>
            </div>

            {/* File Upload Option */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Upload Syllabus File (Optional)
                </label>
                <span style={{ fontSize: '11px', color: '#64748B' }}>.txt, .md, .json, .csv</span>
              </div>
              <input
                type="file"
                accept=".txt,.md,.json,.csv"
                onChange={handleFileUpload}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#F8FAFC',
                  border: '1px dashed #94A3B8',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              />
            </div>

            {/* Syllabus Text Content */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Syllabus Content / Curriculum Notes *
              </label>
              <textarea
                value={syllabusText}
                onChange={(e) => setSyllabusText(e.target.value)}
                placeholder="Paste your course outline, topics list, algorithm concepts, or problem topics here..."
                rows={8}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Training Button / Progress */}
            {isTraining ? (
              <div style={{
                background: '#EBF5FB',
                border: '1.5px solid #008BDC',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '10px' }}>
                  <span className="is-wave-bar"></span>
                  <span className="is-wave-bar"></span>
                  <span className="is-wave-bar"></span>
                  <span className="is-wave-bar"></span>
                  <span className="is-wave-bar"></span>
                </div>
                <div style={{ fontWeight: 700, color: '#008BDC', fontSize: '14px', marginBottom: '4px' }}>
                  {trainingStep === 1 && "Parsing Syllabus & Detecting Topic Ontology..."}
                  {trainingStep === 2 && "Synthesizing Algorithmic Problems & 4-Level Hint Trees..."}
                  {trainingStep === 3 && "Calibrating Ira's Adaptive Interview Persona..."}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Creating tailored questions for your mock interview
                </div>
              </div>
            ) : (
              <button
                type="submit"
                className="is-btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '15px' }}
              >
                🚀 Train AI Interviewer (Ira) on this Syllabus
              </button>
            )}
          </form>
        </div>

        {/* Right Column: Active & Trained Syllabi List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B' }}>
              📋 Trained Syllabi ({syllabi.length})
            </h2>
            <button
              onClick={fetchSyllabi}
              style={{ background: 'none', border: 'none', color: '#008BDC', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              🔄 Refresh
            </button>
          </div>

          {syllabi.length === 0 ? (
            <div className="is-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>📂</div>
              <div style={{ fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>No Trained Syllabi Yet</div>
              <div style={{ fontSize: '13px' }}>Use the form on the left or select a 1-click preset to train Ira!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {syllabi.map((s) => {
                const isExpanded = expandedSyllabusId === s.id;
                return (
                  <div
                    key={s.id}
                    className="is-card"
                    style={{
                      padding: '16px 20px',
                      borderLeft: s.is_active ? '4px solid #10B981' : '4px solid #CBD5E1',
                      background: s.is_active ? '#FFFFFF' : '#F8FAFC'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, color: '#1E293B', fontSize: '15px' }}>
                            {s.title}
                          </span>
                          {s.is_active && (
                            <span className="is-badge-green" style={{ fontSize: '11px', padding: '2px 8px' }}>
                              ✓ Active for Ira
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          Track: <strong style={{ color: s.subject.includes('DSA') ? '#008BDC' : '#FF6B00' }}>{s.subject}</strong> • {s.target_role}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggle(s.id, s.is_active)}
                          title={s.is_active ? "Deactivate" : "Activate"}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: '1px solid #CBD5E1',
                            background: s.is_active ? '#ECFDF5' : '#F1F5F9',
                            color: s.is_active ? '#065F46' : '#64748B',
                            cursor: 'pointer'
                          }}
                        >
                          {s.is_active ? "Active" : "Set Active"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '14px' }}
                          title="Delete Syllabus"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Extracted Topics */}
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Extracted Modules ({s.topics_extracted?.length || 0}):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {(s.topics_extracted || []).map((topic, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: '#F1F5F9',
                              color: '#334155',
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 500
                            }}
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Questions count and toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                      <span style={{ fontSize: '12px', color: '#008BDC', fontWeight: 600 }}>
                        🎯 {s.questions_count || (s.questions?.length || 0)} Progressive Questions Synthesized
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setExpandedSyllabusId(isExpanded ? null : s.id)}
                          style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {isExpanded ? "Hide Details" : "View Questions"}
                        </button>
                        {onLaunchInterview && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!s.is_active) handleToggle(s.id, false);
                              onLaunchInterview(s);
                            }}
                            className="is-btn-primary"
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                          >
                            Start Interview ▶
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Accordion Questions Preview */}
                    {isExpanded && s.questions && s.questions.length > 0 && (
                      <div style={{ marginTop: '12px', padding: '12px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
                        <div style={{ fontWeight: 600, color: '#1E293B', marginBottom: '8px' }}>Generated Interview Problems:</div>
                        {s.questions.map((q, qIdx) => (
                          <div key={qIdx} style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: qIdx < s.questions.length - 1 ? '1px dashed #CBD5E1' : 'none' }}>
                            <div style={{ fontWeight: 600, color: '#008BDC' }}>{qIdx + 1}. {q.title} <span style={{ color: '#64748B', fontWeight: 400 }}>({q.topic})</span></div>
                            <div style={{ color: '#334155', marginTop: '3px' }}>{q.statement}</div>
                            {q.hints && (
                              <div style={{ marginTop: '5px', color: '#64748B' }}>
                                💡 <strong>4 Progressive Hints Ready:</strong> {q.hints[0].substring(0, 75)}...
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
