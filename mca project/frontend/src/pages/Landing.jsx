import React, { useState, useEffect } from 'react';
import { API_URL } from '../config.js';

export default function Landing({ token, user, onStartQuiz, setCurrentPage }) {
  const [featuredQuizzes, setFeaturedQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/quizzes`);
      if (res.ok) {
        const data = await res.json();
        setFeaturedQuizzes(data.slice(0, 3));
      }
    } catch (err) {
      console.error('Error fetching quizzes for landing:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    return `${m} min`;
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '60px' }}>
      
      <header className="hero-container">
        <span className="hero-badge">⚡ Interactive Learning</span>
        <h1 className="hero-title">
          Master Your Skills with QuizApp
        </h1>
        <p className="hero-subtitle">
          Practice under real-time constraints, track your score history, and obtain detailed feedback on every question. Elevate your learning experience.
        </p>
        
        <div className="hero-actions">
          {user ? (
            <button 
              onClick={() => setCurrentPage('dashboard')} 
              className="btn btn-primary"
              style={{ padding: '12px 24px', fontSize: '14px' }}
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button 
                onClick={() => setCurrentPage('login')} 
                className="btn btn-primary"
                style={{ padding: '12px 24px', fontSize: '14px' }}
              >
                Get Started
              </button>
              <button 
                onClick={() => setCurrentPage('dashboard')} 
                className="btn btn-secondary"
                style={{ padding: '12px 24px', fontSize: '14px' }}
              >
                Explore Quizzes
              </button>
            </>
          )}
        </div>
      </header>

      <section style={{ marginTop: '20px' }}>
        <h2 className="landing-section-title">Why Choose Our Platform?</h2>
        
        <div className="features-grid">
          <div className="glass-card feature-card">
            <div className="feature-icon">⏱️</div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '10px' }}>Real-time Constraints</h3>
            <p style={{ fontSize: '13.5px', lineHeight: 1.5, margin: 0 }}>
              Build confidence under pressure. Every quiz runs with a live, integrated countdown timer that automatically saves your progress upon completion.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon">📊</div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '10px' }}>In-depth Reviews</h3>
            <p style={{ fontSize: '13.5px', lineHeight: 1.5, margin: 0 }}>
              Learn from your mistakes. Gain access to a detailed, question-by-question review highlighting correct answers, points scored, and accuracy scores.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon">⚙️</div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '10px' }}>Admin Capabilities</h3>
            <p style={{ fontSize: '13.5px', lineHeight: 1.5, margin: 0 }}>
              Easily configure, edit, or delete assessments. Supports multiple choice and true/false types, points weights, and custom time limits.
            </p>
          </div>
        </div>
      </section>

      <section style={{ marginTop: '40px' }}>
        <h2 className="landing-section-title">How It Works</h2>
        
        <div className="steps-container">
          <div className="glass-card step-card">
            <div className="step-number">01</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Create Profile</h3>
            <p style={{ fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
              Register a student account to track your attempts and save your score history automatically.
            </p>
          </div>

          <div className="glass-card step-card">
            <div className="step-number">02</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Start Assessment</h3>
            <p style={{ fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
              Select a quiz topic, review the time limit, and start answering the multiple-choice questions.
            </p>
          </div>

          <div className="glass-card step-card">
            <div className="step-number">03</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>View Analysis</h3>
            <p style={{ fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
              Submit your answers to instantly receive your score, accuracy rate, and full correction keys.
            </p>
          </div>
        </div>
      </section>

      <section style={{ marginTop: '40px' }}>
        <h2 className="landing-section-title">Featured Assessments</h2>
        
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <div className="spinner" />
          </div>
        ) : featuredQuizzes.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 600 }}>No Assessments Available</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Please check back later or login as admin to configure new quizzes.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '700px', margin: '0 auto' }}>
            {featuredQuizzes.map(quiz => (
              <div 
                key={quiz.id} 
                className="glass-card flex-between" 
                style={{ 
                  padding: '20px 24px', 
                  gap: '20px',
                  alignItems: 'center'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>{quiz.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                    {quiz.description || 'No description provided.'}
                  </p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0 }}>
                  <span className={`badge ${
                    quiz.difficulty === 'easy' ? 'badge-success' : 
                    quiz.difficulty === 'medium' ? 'badge-warning' : 'badge-danger'
                  }`} style={{ textTransform: 'capitalize' }}>
                    {quiz.difficulty || 'easy'}
                  </span>
                  <span className="badge badge-primary">⏱️ {formatTime(quiz.time_limit)}</span>
                  <button 
                    onClick={() => onStartQuiz(quiz.id)} 
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                  >
                    Take Quiz
                  </button>
                </div>
              </div>
            ))}
            
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <button 
                onClick={() => setCurrentPage('dashboard')} 
                className="btn btn-secondary"
              >
                Browse All Quizzes
              </button>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
