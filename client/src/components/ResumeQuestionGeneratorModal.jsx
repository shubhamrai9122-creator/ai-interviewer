import React, { useState } from 'react';
import { Sparkles, FileText, CheckCircle2, Loader2, X, Plus } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

export default function ResumeQuestionGeneratorModal({
  isOpen = false,
  onClose = () => {},
  onQuestionsApplied = () => {}
}) {
  const [roleTitle, setRoleTitle] = useState('Full-Stack Distributed Systems Engineer');
  const [contextText, setContextText] = useState(
    'Experienced building low-latency microservices with React 19, Node.js, Kafka, Redis, and PostgreSQL. Familiar with distributed transactions, database indexing, and hash table cache-aside patterns.'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [appliedCount, setAppliedCount] = useState(0);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!contextText.trim()) return;
    setIsGenerating(true);
    setGeneratedQuestions([]);
    try {
      const res = await fetch(`${API_BASE}/api/vivas/generate-from-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_title: roleTitle,
          context_text: contextText,
          viva_id: 42
        })
      });
      const data = await res.json();
      setGeneratedQuestions(data.questions || []);
    } catch (err) {
      alert('Failed to generate questions: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    onQuestionsApplied(generatedQuestions, roleTitle);
    setAppliedCount(generatedQuestions.length);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '680px',
        width: '100%',
        padding: '28px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #a855f7, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Sparkles size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800' }}>AI Question Bank Generator</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Synthesize custom viva questions tailored to candidate resume or syllabus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '4px', borderRadius: '50%', width: '28px', height: '28px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Role & Context Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Target Role or Subject Title
            </label>
            <input
              className="input-field"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer / AI Engineer"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Candidate Resume Summary / Syllabus Topics / Job Description
            </label>
            <textarea
              className="input-field"
              rows={4}
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              placeholder="Paste candidate projects, technical stacks, or course modules here..."
              style={{ resize: 'vertical' }}
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !contextText.trim()}
            className="btn btn-primary"
            style={{ alignSelf: 'flex-start' }}
          >
            {isGenerating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
            {isGenerating ? 'Synthesizing Questions...' : 'Generate Syllabus Probes'}
          </button>
        </div>

        {/* Generated Questions List */}
        {generatedQuestions.length > 0 && (
          <div style={{
            background: 'rgba(6, 9, 19, 0.6)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            border: '1px solid var(--border-subtle)',
            marginBottom: '20px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--cyan)', marginBottom: '12px' }}>
              Synthesized Questions ({generatedQuestions.length})
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {generatedQuestions.map((q, idx) => (
                <div key={idx} style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderLeft: '3px solid var(--purple)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                      {q.question_type}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      Diff: {q.difficulty}/5
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '4px' }}>
                    {q.question_text}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    Expected: {q.expected_concepts.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          {generatedQuestions.length > 0 && (
            <button onClick={handleApply} className="btn btn-success">
              <CheckCircle2 size={16} />
              {appliedCount > 0 ? 'Applied to Viva Bank!' : 'Apply to Current Viva'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
