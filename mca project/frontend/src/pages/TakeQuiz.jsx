import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config.js';

export default function TakeQuiz({ token, quizId, onQuizSubmitted, onCancel }) {
  const [quiz, setQuiz] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  
  const timerRef = useRef(null);
  const initializedQuizIdRef = useRef(null);


  useEffect(() => {
    if (initializedQuizIdRef.current === quizId) return;
    initializedQuizIdRef.current = quizId;

    const initializeQuiz = async () => {
      try {
        setLoading(true);
        setError('');


        const quizRes = await fetch(`${API_URL}/quizzes/${quizId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!quizRes.ok) throw new Error('Failed to load quiz details');
        const quizData = await quizRes.json();
        setQuiz(quizData);


        const attemptRes = await fetch(`${API_URL}/quizzes/${quizId}/attempt`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!attemptRes.ok) throw new Error('Failed to start quiz attempt');
        const attemptData = await attemptRes.json();
        
        setAttemptId(attemptData.attemptId);
        setTimeLeft(attemptData.timeLimit);

      } catch (err) {
        setError(err.message || 'Error loading quiz');
      } finally {
        setLoading(false);
      }
    };

    initializeQuiz();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizId, token]);


  useEffect(() => {
    if (timeLeft === null) return;

    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft]);

  const handleSelectOption = (questionId, optionId) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleAutoSubmit = () => {
    console.log('[+] Time limit reached. Auto-submitting quiz...');
    submitQuiz(true);
  };

  const submitQuiz = async (isAuto = false) => {
    if (submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const answersArray = Object.keys(selectedAnswers).map(qId => ({
        questionId: parseInt(qId),
        optionId: selectedAnswers[qId]
      }));


      quiz.questions.forEach(q => {
        if (!selectedAnswers[q.id]) {
          answersArray.push({
            questionId: q.id,
            optionId: null
          });
        }
      });

      const res = await fetch(`${API_URL}/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          attemptId,
          userAnswers: answersArray
        })
      });

      if (!res.ok) throw new Error('Failed to submit answers');
      const data = await res.json();
      
      onQuizSubmitted(attemptId);
    } catch (err) {
      setError(err.message || 'Error submitting quiz answers');
      setSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    const totalQuestions = quiz.questions.length;
    const answeredCount = Object.keys(selectedAnswers).length;
    let msg = '';

    if (answeredCount < totalQuestions) {
      msg = `Warning: You have answered ${answeredCount} out of ${totalQuestions} questions. Are you sure you want to submit?`;
    } else {
      msg = 'Are you sure you want to submit and end the assessment?';
    }

    setConfirmModal({
      isOpen: true,
      message: msg,
      onConfirm: () => {
        setConfirmModal({ isOpen: false, message: '', onConfirm: null });
        submitQuiz(false);
      }
    });
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading assessment & starting timer...</p>
      </div>
    );
  }

  if (error && !quiz) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="alert alert-danger">{error}</div>
        <button onClick={onCancel} className="btn btn-secondary">Return to Dashboard</button>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIdx];
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);
  const isTimeLow = timeLeft !== null && timeLeft < 60;

  return (
    <>
      <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.2fr 3fr', gap: '2rem', alignItems: 'start' }}>
      
      {}
      <aside className="glass-card" style={{ position: 'sticky', top: '90px' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Assessment Navigation</h3>
        
        {}
        <div style={{
          background: isTimeLow ? 'rgba(244, 63, 94, 0.12)' : 'rgba(255, 255, 255, 0.03)',
          border: '1px solid',
          borderColor: isTimeLow ? 'var(--error)' : 'var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem',
          textAlign: 'center',
          marginBottom: '1.25rem',
          transition: 'all 0.3s ease',
          boxShadow: isTimeLow ? '0 0 15px rgba(244, 63, 94, 0.15)' : 'none'
        }}>
          <span style={{ display: 'block', fontSize: '0.8rem', color: isTimeLow ? 'var(--error)' : 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Time Remaining
          </span>
          <span style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            fontFamily: 'monospace',
            color: isTimeLow ? 'var(--error)' : 'var(--color-accent)'
          }}>
            {timeLeft !== null ? formatTimer(timeLeft) : '--:--'}
          </span>
        </div>

        {}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
            <span>Progress</span>
            <span>{answeredCount} / {totalQuestions} answered ({progressPercent}%)</span>
          </div>
          <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-accent) 100%)', borderRadius: '9999px', transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {quiz.questions.map((q, idx) => {
            const isCurrent = idx === currentQuestionIdx;
            const isAnswered = selectedAnswers[q.id] !== undefined;

            let btnBg = 'rgba(255, 255, 255, 0.02)';
            let btnBorder = 'var(--border-color)';
            let btnColor = 'var(--text-muted)';

            if (isCurrent) {
              btnBg = 'rgba(139, 92, 246, 0.2)';
              btnBorder = 'var(--color-primary)';
              btnColor = 'var(--text-main)';
            } else if (isAnswered) {
              btnBg = 'rgba(6, 182, 212, 0.15)';
              btnBorder = 'rgba(6, 182, 212, 0.3)';
              btnColor = 'var(--color-accent)';
            }

            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIdx(idx)}
                style={{
                  background: btnBg,
                  border: '1px solid',
                  borderColor: btnBorder,
                  color: btnColor,
                  borderRadius: '6px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <button 
          onClick={handleSubmitClick} 
          className="btn btn-primary" 
          disabled={submitting}
          style={{ width: '100%' }}
        >
          Submit Answers
        </button>
      </aside>

      {}
      <main className="glass-card" style={{ minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
        
        {}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '1.5rem'
        }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Question {currentQuestionIdx + 1} of {totalQuestions}
            </span>
            <h2 style={{ fontSize: '1.25rem', marginTop: '0.25rem', color: 'var(--text-main)', background: 'none', WebkitTextFillColor: 'initial' }}>
              {quiz.title}
            </h2>
          </div>
          <span className="badge badge-primary">
            {currentQuestion.points} Point{currentQuestion.points !== 1 ? 's' : ''}
          </span>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>{error}</div>}

        {}
        <div style={{ flexGrow: 1 }}>
          <p style={{
            fontSize: '1.2rem',
            color: 'var(--text-main)',
            fontWeight: 500,
            marginBottom: '1.5rem',
            lineHeight: 1.6
          }}>
            {currentQuestion.text}
          </p>

          {}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem' }}>
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedAnswers[currentQuestion.id] === opt.id;

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                  className={`option-btn ${isSelected ? 'selected' : ''}`}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: isSelected ? 'var(--color-primary)' : 'var(--text-muted)',
                    background: isSelected ? 'var(--color-primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}>
                    {isSelected && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />
                    )}
                  </div>
                  <span>{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1.25rem',
          marginTop: 'auto'
        }}>
          <button
            onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
            className="btn btn-secondary"
            disabled={currentQuestionIdx === 0}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Previous
          </button>

          {currentQuestionIdx < totalQuestions - 1 ? (
            <button
              onClick={() => setCurrentQuestionIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
              className="btn btn-secondary"
            >
              Next
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmitClick}
              className="btn btn-primary"
              disabled={submitting}
            >
              Finish Assessment
            </button>
          )}
        </div>
      </main>
    </div>

    {confirmModal.isOpen && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(9, 13, 22, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '20px'
      }}>
        <div 
          className="glass-card animate-fade-in" 
          style={{ 
            width: '100%', 
            maxWidth: '450px', 
            padding: '24px 30px', 
            position: 'relative',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-main)' }}>
            Confirm Submission
          </h3>
          <p style={{ fontSize: '14.5px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '24px' }}>
            {confirmModal.message}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              type="button" 
              onClick={() => setConfirmModal({ isOpen: false, message: '', onConfirm: null })} 
              className="btn btn-secondary"
              style={{ minWidth: '100px' }}
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={confirmModal.onConfirm} 
              className="btn btn-primary"
              style={{ minWidth: '100px' }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
}

