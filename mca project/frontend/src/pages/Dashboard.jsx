import React, { useState, useEffect } from 'react';
import { API_URL } from '../config.js';

export default function Dashboard({ token, user, onStartQuiz, onReviewAttempt }) {
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const quizzesRes = await fetch(`${API_URL}/quizzes`);
      if (!quizzesRes.ok) throw new Error('Failed to load quizzes');
      const quizzesData = await quizzesRes.json();
      setQuizzes(quizzesData);

      if (token && user) {
        const attemptsRes = await fetch(`${API_URL}/attempts/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!attemptsRes.ok) throw new Error('Failed to load attempt history');
        const attemptsData = await attemptsRes.json();
        setAttempts(attemptsData);
      } else {
        setAttempts([]);
      }

    } catch (err) {
      setError(err.message || 'Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m${s > 0 ? ` ${s}s` : ''}`;
  };

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '1rem' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading available quizzes...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      
      <div className="premium-banner">
        <h2 className="premium-banner-title">
          Interactive Quiz Platform
        </h2>
        <p className="premium-banner-text">
          Welcome to the quiz homepage. Anyone can browse the available quiz topics below. To participate, start an assessment, track your progress, or review your answers, please login or register an account.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        <section>
          {(() => {
            const filteredQuizzes = quizzes.filter(
              quiz => (quiz.difficulty || 'easy').toLowerCase() === selectedDifficulty
            );

            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Available Quizzes</h2>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{filteredQuizzes.length} Quiz{filteredQuizzes.length !== 1 ? 'zes' : ''} shown</span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                  {['easy', 'medium', 'hard'].map(level => (
                    <button
                      key={level}
                      onClick={() => setSelectedDifficulty(level)}
                      className={`btn ${selectedDifficulty === level ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '8px 16px', fontSize: '13px', textTransform: 'capitalize', minWidth: '100px' }}
                    >
                      {level === 'hard' ? 'Hard' : level}
                    </button>
                  ))}
                </div>

                {filteredQuizzes.length === 0 ? (
                  <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)' }}>
                    <h3 style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 600 }}>No Quizzes Available</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>There are no {selectedDifficulty} difficulty quizzes configured currently.</p>
                  </div>
                ) : (
                  <div className="quiz-grid">
                    {filteredQuizzes.map(quiz => (
                      <div key={quiz.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px', padding: '24px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '12px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{quiz.title}</h3>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                              <span className={`badge ${
                                quiz.difficulty === 'easy' ? 'badge-success' : 
                                quiz.difficulty === 'medium' ? 'badge-warning' : 'badge-danger'
                              }`} style={{ whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                                {quiz.difficulty || 'easy'}
                              </span>
                              <span className="badge badge-primary" style={{ whiteSpace: 'nowrap' }}>
                                ⏱️ {formatTime(quiz.time_limit)}
                              </span>
                            </div>
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
                            {quiz.description || 'No description provided.'}
                          </p>
                        </div>
                        <button 
                          onClick={() => onStartQuiz(quiz.id)}
                          className="btn btn-primary"
                          style={{ width: '100%' }}
                        >
                          Start Quiz
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </section>

        {user && (
          <section>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>My Score History</h2>
            </div>

            {attempts.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)' }}>
                <h3 style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 600 }}>No Attempts Record</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>You haven't taken any quizzes yet. Click "Start Quiz" above to begin.</p>
              </div>
            ) : (
              <div className="custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Quiz Name</th>
                      <th>Completion Date</th>
                      <th>Score</th>
                      <th>Accuracy</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map(attempt => {
                      const maxScore = attempt.max_score || 0;
                      const pct = maxScore > 0 ? Math.round((attempt.score / maxScore) * 100) : 0;
                      const isPassed = pct >= 50;

                      return (
                        <tr key={attempt.id}>
                          <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{attempt.quiz_title}</td>
                          <td style={{ color: 'var(--text-muted)' }}>
                            {attempt.completed_at ? formatDate(attempt.completed_at) : 'Incomplete'}
                          </td>
                          <td style={{ color: 'var(--text-main)' }}>
                            <strong>{attempt.score}</strong> / {maxScore} pts
                          </td>
                          <td>
                            <span className={isPassed ? 'badge badge-success' : 'badge badge-danger'}>
                              {pct}% {isPassed ? 'Passed' : 'Failed'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              onClick={() => onReviewAttempt(attempt.id)}
                              className="btn btn-secondary btn-small"
                            >
                              Review Answers
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
}
