import React, { useState, useEffect } from 'react';
import { API_URL } from '../config.js';

export default function QuizReview({ token, attemptId, onClose }) {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReview = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`${API_URL}/attempts/${attemptId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load quiz review details');
        const data = await res.json();
        setReview(data);

      } catch (err) {
        setError(err.message || 'Error loading review details');
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [attemptId, token]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Generating detailed review analysis...</p>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="alert alert-danger">{error || 'Review could not be loaded'}</div>
        <button onClick={onClose} className="btn btn-secondary">Return to Dashboard</button>
      </div>
    );
  }

  const percentage = review.maxScore > 0 ? Math.round((review.score / review.maxScore) * 100) : 0;
  const isPassed = percentage >= 50;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {}
      <button 
        onClick={onClose} 
        className="btn btn-secondary btn-small"
        style={{ marginBottom: '1.5rem' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Dashboard
      </button>

      {}
      <div className="glass-card" style={{
        padding: '2rem',
        marginBottom: '2.5rem',
        borderLeft: '4px solid',
        borderColor: isPassed ? 'var(--success)' : 'var(--error)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(139, 92, 246, 0.05) 100%)'
      }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
          Assessment Feedback
        </span>
        <h1 style={{ fontSize: '2rem', marginTop: '0.25rem', marginBottom: '1rem', background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>
          {review.quizTitle}
        </h1>
        
        {}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Score Achieved</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{review.score}</span>
            <span style={{ color: 'var(--text-muted)' }}> / {review.maxScore} pts</span>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Percentage</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: isPassed ? 'var(--success)' : 'var(--error)' }}>
              {percentage}%
            </span>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Result</span>
            <span className={isPassed ? 'badge badge-success' : 'badge badge-danger'} style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}>
              {isPassed ? 'Passed' : 'Failed'}
            </span>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Completed Date</span>
            <span style={{ display: 'block', fontSize: '0.92rem', marginTop: '0.5rem', color: 'var(--text-main)', fontWeight: 500 }}>
              {formatDate(review.completedAt)}
            </span>
          </div>
        </div>
      </div>

      {}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.25rem' }}>Question-by-Question Review</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {review.questions.map((q, idx) => {
          const userSelectedOptId = q.user_answer.selected_option_id;
          const isUserCorrect = q.user_answer.is_correct;
          const isSkipped = userSelectedOptId === null;

          return (
            <div 
              key={q.id} 
              className="glass-card" 
              style={{
                borderLeft: '3px solid',
                borderColor: isSkipped ? 'var(--text-muted)' : (isUserCorrect ? 'var(--success)' : 'var(--error)'),
                padding: '1.5rem'
              }}
            >
              {}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  QUESTION {idx + 1} ({q.type.toUpperCase()})
                </span>
                
                {}
                {isSkipped ? (
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                    Skipped (0 pts)
                  </span>
                ) : isUserCorrect ? (
                  <span className="badge badge-success">
                    Correct (+{q.points} pt{q.points !== 1 ? 's' : ''})
                  </span>
                ) : (
                  <span className="badge badge-danger">
                    Incorrect (0 pts)
                  </span>
                )}
              </div>

              {}
              <p style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 500, marginBottom: '1.25rem' }}>
                {q.text}
              </p>

              {}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {q.options.map((opt) => {
                  const isCorrectAnswer = opt.is_correct;
                  const isSelectedByUser = userSelectedOptId === opt.id;

                  let boxBg = 'rgba(255, 255, 255, 0.01)';
                  let boxBorder = 'var(--border-color)';
                  let boxColor = 'var(--text-muted)';
                  let icon = null;

                  if (isCorrectAnswer) {
                    boxBg = 'rgba(16, 185, 129, 0.08)';
                    boxBorder = 'rgba(16, 185, 129, 0.35)';
                    boxColor = 'var(--success)';
                    icon = (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    );
                  } else if (isSelectedByUser && !isCorrectAnswer) {
                    boxBg = 'rgba(244, 63, 94, 0.08)';
                    boxBorder = 'rgba(244, 63, 94, 0.35)';
                    boxColor = 'var(--error)';
                    icon = (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ flexShrink: 0 }}>
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    );
                  }

                  return (
                    <div
                      key={opt.id}
                      style={{
                        background: boxBg,
                        border: '1px solid',
                        borderColor: boxBorder,
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.85rem 1.25rem',
                        color: boxColor === 'var(--text-muted)' && isSelectedByUser ? 'var(--text-main)' : boxColor,
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        opacity: isCorrectAnswer || isSelectedByUser ? 1 : 0.65
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {}
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          border: '2px solid',
                          borderColor: isSelectedByUser ? 'currentColor' : 'rgba(255,255,255,0.1)',
                          background: isSelectedByUser ? 'currentColor' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isSelectedByUser && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--bg-primary)' }} />}
                        </div>
                        <span style={{ color: boxColor === 'var(--text-muted)' ? 'var(--text-main)' : 'inherit' }}>
                          {opt.text}
                        </span>
                      </div>
                      
                      {}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600 }}>
                        {icon}
                        {isCorrectAnswer && <span>Correct Answer</span>}
                        {isSelectedByUser && !isCorrectAnswer && <span>Your Choice</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {}
      <div style={{ textAlign: 'center', marginTop: '2.5rem', marginBottom: '3rem' }}>
        <button onClick={onClose} className="btn btn-primary">
          Return to Dashboard
        </button>
      </div>

    </div>
  );
}

