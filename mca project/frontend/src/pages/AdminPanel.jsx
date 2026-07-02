import React, { useState, useEffect } from 'react';
import { API_URL } from '../config.js';

export default function AdminPanel({ token, onBack }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');


  const [activeTab, setActiveTab] = useState('quizzes');
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  

  const [viewAttemptId, setViewAttemptId] = useState(null);
  const [attemptDetails, setAttemptDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);


  const [isEditing, setIsEditing] = useState(false);
  const [editQuizId, setEditQuizId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDifficulty, setFormDifficulty] = useState('easy');
  const [formTimeLimit, setFormTimeLimit] = useState(10);
  const [formQuestions, setFormQuestions] = useState([]);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: 'confirm', message: '', onConfirm: null });

  useEffect(() => {
    fetchQuizzes();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'results') {
      fetchResults();
    }
  }, [activeTab, token]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/quizzes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load quizzes');
      const data = await res.json();
      setQuizzes(data);
    } catch (err) {
      setError(err.message || 'Error loading quizzes');
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    try {
      setResultsLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/attempts/admin/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load exam results');
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(err.message || 'Error loading exam results');
    } finally {
      setResultsLoading(false);
    }
  };

  const handleViewAttemptDetails = async (attemptId) => {
    try {
      setDetailsLoading(true);
      setError('');
      setViewAttemptId(attemptId);
      
      const res = await fetch(`${API_URL}/attempts/${attemptId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load attempt details');
      const data = await res.json();
      setAttemptDetails(data);
    } catch (err) {
      setError(err.message || 'Error loading attempt details');
      setViewAttemptId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDeleteQuiz = (quizId, quizTitle) => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      message: `Are you sure you want to permanently delete the quiz "${quizTitle}"? This will also delete all associated attempts and answers!`,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        try {
          setError('');
          setSuccess('');
          const res = await fetch(`${API_URL}/quizzes/${quizId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) throw new Error('Failed to delete quiz');
          
          setSuccess('Quiz deleted successfully.');
          fetchQuizzes();
        } catch (err) {
          setError(err.message || 'Error deleting quiz');
        }
      }
    });
  };

  const handleOpenCreateForm = () => {
    setError('');
    setSuccess('');
    setEditQuizId(null);
    setFormTitle('');
    setFormDescription('');
    setFormDifficulty('easy');
    setFormTimeLimit(10);
    setFormQuestions([
      {
        text: '',
        type: 'mcq',
        points: 1,
        options: [
          { text: '', is_correct: true },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
          { text: '', is_correct: false }
        ]
      }
    ]);
    setIsEditing(true);
  };

  const handleOpenEditForm = async (quizId) => {
    try {
      setError('');
      setSuccess('');
      setLoading(true);

      const res = await fetch(`${API_URL}/quizzes/${quizId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load quiz details');
      const quiz = await res.json();

      setEditQuizId(quiz.id);
      setFormTitle(quiz.title);
      setFormDescription(quiz.description || '');
      setFormDifficulty(quiz.difficulty || 'easy');
      setFormTimeLimit(Math.round(quiz.time_limit / 60));
      

      const mappedQuestions = quiz.questions.map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
        points: q.points,
        options: q.options.map(opt => ({
          id: opt.id,
          text: opt.text,
          is_correct: opt.is_correct === 1 || opt.is_correct === true
        }))
      }));

      setFormQuestions(mappedQuestions);
      setIsEditing(true);
    } catch (err) {
      setError(err.message || 'Error loading quiz details for edit');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setFormQuestions(prev => [
      ...prev,
      {
        text: '',
        type: 'mcq',
        points: 1,
        options: [
          { text: '', is_correct: true },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
          { text: '', is_correct: false }
        ]
      }
    ]);
  };

  const handleRemoveQuestion = (idx) => {
    if (formQuestions.length <= 1) {
      setModalConfig({
        isOpen: true,
        type: 'alert',
        message: 'A quiz must have at least one question.',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }
    setFormQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (qIdx, field, value) => {
    setFormQuestions(prev => {
      const copy = [...prev];
      if (field === 'type' && value === 'tf') {

        copy[qIdx] = {
          ...copy[qIdx],
          type: value,
          options: [
            { text: 'True', is_correct: true },
            { text: 'False', is_correct: false }
          ]
        };
      } else if (field === 'type' && value === 'mcq') {
        copy[qIdx] = {
          ...copy[qIdx],
          type: value,
          options: [
            { text: '', is_correct: true },
            { text: '', is_correct: false },
            { text: '', is_correct: false },
            { text: '', is_correct: false }
          ]
        };
      } else {
        copy[qIdx] = {
          ...copy[qIdx],
          [field]: value
        };
      }
      return copy;
    });
  };

  const handleOptionTextChange = (qIdx, optIdx, text) => {
    setFormQuestions(prev => {
      const copy = [...prev];
      copy[qIdx].options[optIdx].text = text;
      return copy;
    });
  };

  const handleCorrectOptionSelect = (qIdx, optIdx) => {
    setFormQuestions(prev => {
      const copy = [...prev];
      copy[qIdx].options = copy[qIdx].options.map((opt, i) => ({
        ...opt,
        is_correct: i === optIdx
      }));
      return copy;
    });
  };

  const handleSaveQuiz = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');


    if (!formTitle.trim()) {
      setError('Quiz Title is required.');
      return;
    }

    for (let i = 0; i < formQuestions.length; i++) {
      const q = formQuestions[i];
      if (!q.text.trim()) {
        setError(`Question ${i + 1} has no text.`);
        return;
      }
      
      const hasCorrect = q.options.some(opt => opt.is_correct);
      if (!hasCorrect) {
        setError(`Question ${i + 1} requires at least one correct option selected.`);
        return;
      }

      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim()) {
          setError(`Option ${j + 1} in Question ${i + 1} cannot be empty.`);
          return;
        }
      }
    }

    try {
      setLoading(true);
      const url = editQuizId ? `${API_URL}/quizzes/${editQuizId}` : `${API_URL}/quizzes`;
      const method = editQuizId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          time_limit: formTimeLimit * 60,
          difficulty: formDifficulty,
          questions: formQuestions
        })
      });

      if (!res.ok) throw new Error('Failed to save quiz details');

      setSuccess(editQuizId ? 'Quiz updated successfully!' : 'New quiz created successfully!');
      setIsEditing(false);
      fetchQuizzes();
    } catch (err) {
      setError(err.message || 'Error saving quiz');
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    return `${m} min`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Incomplete';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !isEditing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading quiz database...</p>
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in">
      
      {}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          {viewAttemptId ? (
            <button onClick={() => { setViewAttemptId(null); setAttemptDetails(null); }} className="btn btn-secondary btn-small" style={{ marginBottom: '0.75rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Back to Results List
            </button>
          ) : (
            <button onClick={isEditing ? () => setIsEditing(false) : onBack} className="btn btn-secondary btn-small" style={{ marginBottom: '0.75rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              {isEditing ? 'Back to Quiz List' : 'Back to Dashboard'}
            </button>
          )}
          <h1 style={{ fontSize: '1.8rem', background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>
            {viewAttemptId ? 'Candidate Attempt Review' : (isEditing ? (editQuizId ? 'Edit Assessment' : 'Create New Assessment') : 'Assessment Management')}
          </h1>
        </div>
        {!isEditing && !viewAttemptId && activeTab === 'quizzes' && (
          <button onClick={handleOpenCreateForm} className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Quiz
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {}
      {isEditing ? (
        <form onSubmit={handleSaveQuiz} className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            Quiz Configuration
          </h2>

          {}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Quiz Title</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Introduction to Javascript, Database Systems Quiz" 
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Difficulty Level</label>
              <select
                className="form-control"
                value={formDifficulty}
                onChange={e => setFormDifficulty(e.target.value)}
                required
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Time Limit (Minutes)</label>
              <input 
                type="number" 
                min="1" 
                max="180" 
                className="form-control" 
                value={formTimeLimit}
                onChange={e => setFormTimeLimit(parseInt(e.target.value) || 1)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Instructions</label>
            <textarea 
              className="form-control" 
              rows="3" 
              placeholder="Provide a brief summary or instructions for the student..." 
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
            />
          </div>

          {}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>
              Questions ({formQuestions.length})
            </h2>
            <button type="button" onClick={handleAddQuestion} className="btn btn-secondary btn-small" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
              + Add Question
            </button>
          </div>

          {}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2.5rem' }}>
            {formQuestions.map((q, qIdx) => (
              <div 
                key={qIdx} 
                style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  position: 'relative'
                }}
              >
                {}
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(qIdx)}
                  style={{
                    position: 'absolute',
                    top: '1.25rem',
                    right: '1.25rem',
                    background: 'rgba(244, 63, 94, 0.1)',
                    border: '1px solid rgba(244, 63, 94, 0.2)',
                    color: 'var(--error)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(244, 63, 94, 0.2)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)';
                  }}
                >
                  Remove Question
                </button>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', width: '80%' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>Q{qIdx + 1}</span>
                  
                  {}
                  <select 
                    className="form-control" 
                    style={{ width: '180px', padding: '0.4rem 2rem 0.4rem 0.75rem', height: '36px' }}
                    value={q.type}
                    onChange={e => handleQuestionChange(qIdx, 'type', e.target.value)}
                  >
                    <option value="mcq">Multiple Choice</option>
                    <option value="tf">True / False</option>
                  </select>

                  {}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Points:</span>
                    <input 
                      type="number" 
                      min="1" 
                      max="10" 
                      className="form-control" 
                      style={{ width: '70px', padding: '0.4rem 0.5rem', textAlign: 'center', height: '36px' }}
                      value={q.points}
                      onChange={e => handleQuestionChange(qIdx, 'points', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                {}
                <div className="form-group">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter the question text here..." 
                    value={q.text}
                    onChange={e => handleQuestionChange(qIdx, 'text', e.target.value)}
                    required
                  />
                </div>

                {}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Options (select the radio button next to the correct answer)</span>
                  
                  {q.options.map((opt, optIdx) => (
                    <div 
                      key={optIdx} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem',
                        background: opt.is_correct ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                        borderRadius: '6px',
                        padding: '0.25rem 0.5rem',
                        transition: 'background 0.2s'
                      }}
                    >
                      {}
                      <input 
                        type="radio" 
                        name={`correct-opt-${qIdx}`} 
                        checked={opt.is_correct}
                        onChange={() => handleCorrectOptionSelect(qIdx, optIdx)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        required
                      />

                      {}
                      <input 
                        type="text" 
                        className="form-control" 
                        style={{ 
                          padding: '0.5rem 0.75rem', 
                          fontSize: '0.9rem',
                          borderColor: opt.is_correct ? 'var(--success)' : 'var(--border-color)',
                          background: opt.is_correct ? 'rgba(9, 13, 22, 0.5)' : ''
                        }}
                        placeholder={`Option ${optIdx + 1}`}
                        value={opt.text}
                        onChange={e => handleOptionTextChange(qIdx, optIdx, e.target.value)}
                        disabled={q.type === 'tf'}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {}
          <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {editQuizId ? 'Update Assessment' : 'Save Assessment'}
            </button>
          </div>
        </form>
      ) : (
        
        !viewAttemptId ? (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button 
                type="button" 
                onClick={() => setActiveTab('quizzes')} 
                className={`btn ${activeTab === 'quizzes' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Quizzes
              </button>
              <button 
                type="button" 
                onClick={() => setActiveTab('results')} 
                className={`btn ${activeTab === 'results' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Exam Results
              </button>
            </div>

            {activeTab === 'quizzes' ? (
              
              <div className="glass-card">
                {quizzes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '1rem' }}>
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                      <path d="M12 16v-4"/>
                      <path d="M12 8h.01"/>
                    </svg>
                    <h3 style={{ marginBottom: '0.5rem' }}>No Quizzes Available</h3>
                    <p>Get started by clicking the "Create Quiz" button above.</p>
                  </div>
                ) : (
                  <div className="custom-table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Quiz Title</th>
                          <th>Difficulty</th>
                          <th>Time Limit</th>
                          <th>Created Date</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quizzes.map(quiz => (
                          <tr key={quiz.id}>
                            <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{quiz.title}</td>
                            <td>
                              <span className={`badge ${
                                quiz.difficulty === 'easy' ? 'badge-success' : 
                                quiz.difficulty === 'medium' ? 'badge-warning' : 'badge-danger'
                              }`} style={{ textTransform: 'capitalize' }}>
                                {quiz.difficulty || 'easy'}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-main)' }}>{formatTime(quiz.time_limit)}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                              {new Date(quiz.created_at).toLocaleDateString()}
                            </td>
                            <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button 
                                type="button"
                                onClick={() => handleOpenEditForm(quiz.id)}
                                className="btn btn-secondary btn-small"
                                style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Edit
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                                className="btn btn-secondary btn-small"
                                style={{ borderColor: 'rgba(244, 63, 94, 0.3)', color: 'var(--error)' }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  <line x1="10" y1="11" x2="10" y2="17"></line>
                                  <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              
              <div className="glass-card animate-fade-in">
                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by candidate name or quiz title..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ maxWidth: '400px' }}
                  />
                </div>

                {resultsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '30vh', gap: '1rem' }}>
                    <div className="spinner" />
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading exam results history...</p>
                  </div>
                ) : (() => {
                  const filteredResults = results.filter(r => 
                    (r.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (r.quiz_title || '').toLowerCase().includes(searchQuery.toLowerCase())
                  );

                  if (filteredResults.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '1rem' }}>
                          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                          <path d="M12 16v-4"/>
                          <path d="M12 8h.01"/>
                        </svg>
                        <h3 style={{ marginBottom: '0.5rem' }}>No Exam Results Found</h3>
                        {searchQuery ? <p>No results match your search query.</p> : <p>No students have taken any exams yet.</p>}
                      </div>
                    );
                  }

                  return (
                    <div className="custom-table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Candidate</th>
                            <th>Quiz Name</th>
                            <th>Completion Date</th>
                            <th>Score</th>
                            <th>Accuracy</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredResults.map(r => {
                            const maxScore = r.max_score || 0;
                            const pct = maxScore > 0 ? Math.round((r.score / maxScore) * 100) : 0;
                            const isPassed = pct >= 50;

                            return (
                              <tr key={r.id}>
                                <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{r.username}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{r.quiz_title}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{formatDate(r.completed_at || r.started_at)}</td>
                                <td style={{ color: 'var(--text-main)' }}>
                                  <strong>{r.score}</strong> / {maxScore} pts
                                </td>
                                <td>
                                  <span className={isPassed ? 'badge badge-success' : 'badge badge-danger'}>
                                    {pct}% {isPassed ? 'Passed' : 'Failed'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button 
                                    type="button"
                                    onClick={() => handleViewAttemptDetails(r.id)}
                                    className="btn btn-secondary btn-small"
                                    style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                      <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        ) : (
          
          <div>
            {detailsLoading || !attemptDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: '1rem' }}>
                <div className="spinner" />
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading detailed candidate analysis...</p>
              </div>
            ) : (
              <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
                {}
                {(() => {
                  const percentage = attemptDetails.maxScore > 0 ? Math.round((attemptDetails.score / attemptDetails.maxScore) * 100) : 0;
                  const isPassed = percentage >= 50;

                  return (
                    <>
                      <div className="glass-card" style={{
                        padding: '2rem',
                        marginBottom: '2.5rem',
                        borderLeft: '4px solid',
                        borderColor: isPassed ? 'var(--success)' : 'var(--error)',
                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(139, 92, 246, 0.05) 100%)'
                      }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                          Candidate Performance Review
                        </span>
                        <h1 style={{ fontSize: '2rem', marginTop: '0.25rem', marginBottom: '1rem', background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>
                          {attemptDetails.quizTitle}
                        </h1>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                          <div>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Score Achieved</span>
                            <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{attemptDetails.score}</span>
                            <span style={{ color: 'var(--text-muted)' }}> / {attemptDetails.maxScore} pts</span>
                          </div>

                          <div>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Percentage</span>
                            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: isPassed ? 'var(--success)' : 'var(--error)' }}>
                              {percentage}%
                            </span>
                          </div>

                          <div>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Result Status</span>
                            <span className={isPassed ? 'badge badge-success' : 'badge badge-danger'} style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}>
                              {isPassed ? 'Passed' : 'Failed'}
                            </span>
                          </div>

                          <div>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Completion Date</span>
                            <span style={{ display: 'block', fontSize: '0.92rem', marginTop: '0.5rem', color: 'var(--text-main)', fontWeight: 500 }}>
                              {formatDate(attemptDetails.completedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.25rem' }}>Question-by-Question Review</h2>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {attemptDetails.questions.map((q, idx) => {
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
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                  QUESTION {idx + 1} ({q.type.toUpperCase()})
                                </span>
                                
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

                              <p style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 500, marginBottom: '1.25rem' }}>
                                {q.text}
                              </p>

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
                                      
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600 }}>
                                        {icon}
                                        {isCorrectAnswer && <span>Correct Answer</span>}
                                        {isSelectedByUser && !isCorrectAnswer && <span>Candidate Choice</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ textAlign: 'center', marginTop: '2.5rem', marginBottom: '3rem' }}>
                        <button type="button" onClick={() => { setViewAttemptId(null); setAttemptDetails(null); }} className="btn btn-primary">
                          Return to Results List
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )
      )}
    </div>

    {modalConfig.isOpen && (
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
          <div style={{ fontSize: '36px', marginBottom: '16px' }}>
            {modalConfig.type === 'confirm' ? '🗑️' : '⚠️'}
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-main)' }}>
            {modalConfig.type === 'confirm' ? 'Confirm Action' : 'Notice'}
          </h3>
          <p style={{ fontSize: '14.5px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '24px' }}>
            {modalConfig.message}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {modalConfig.type === 'confirm' && (
              <button 
                type="button" 
                onClick={() => setModalConfig({ isOpen: false, type: 'confirm', message: '', onConfirm: null })} 
                className="btn btn-secondary"
                style={{ minWidth: '100px' }}
              >
                Cancel
              </button>
            )}
            <button 
              type="button" 
              onClick={modalConfig.onConfirm || (() => setModalConfig({ isOpen: false, type: 'confirm', message: '', onConfirm: null }))} 
              className="btn btn-primary"
              style={{ minWidth: '100px' }}
            >
              {modalConfig.type === 'confirm' ? 'Confirm' : 'OK'}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
}

