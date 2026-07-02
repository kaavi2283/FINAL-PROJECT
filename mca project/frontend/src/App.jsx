import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import TakeQuiz from './pages/TakeQuiz';
import QuizReview from './pages/QuizReview';
import AdminPanel from './pages/AdminPanel';

import { API_URL } from './config.js';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(token ? true : false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUserProfile();
    } else {
      localStorage.removeItem('token');
      setUser(null);
      const path = location.pathname;
      if (path !== '/login' && path !== '/register' && path !== '/') {
        navigate('/');
      }
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      setProfileLoading(true);
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        
        const path = location.pathname;
        if (path === '/' || path === '/login' || path === '/register') {
          const queryParams = new URLSearchParams(location.search);
          const redirectPath = queryParams.get('redirect');
          if (redirectPath) {
            navigate(redirectPath);
          } else {
            navigate('/dashboard');
          }
        }
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      handleLogout();
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    navigate('/dashboard');
  };

  if (profileLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        gap: '1.5rem'
      }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Restoring session...</p>
      </div>
    );
  }

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="app-container">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
      />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<LandingWrapper token={token} user={user} />} />
          <Route path="/dashboard" element={<DashboardWrapper token={token} user={user} />} />
          <Route path="/login" element={<DashboardWrapper token={token} user={user} />} />
          <Route path="/register" element={<DashboardWrapper token={token} user={user} />} />
          <Route path="/take-quiz/:quizId" element={<TakeQuizWrapper token={token} user={user} />} />
          <Route path="/review-attempt/:attemptId" element={<QuizReviewWrapper token={token} user={user} />} />
          <Route path="/admin" element={<AdminPanelWrapper token={token} user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {isAuthRoute && (
        <AuthModal 
          mode={location.pathname === '/login' ? 'login' : 'register'} 
          token={token}
          user={user}
          setToken={setToken}
          setUser={setUser}
          API_URL={API_URL}
        />
      )}
    </div>
  );
}

function LandingWrapper({ token, user }) {
  const navigate = useNavigate();
  return (
    <Landing 
      token={token} 
      user={user} 
      onStartQuiz={(quizId) => {
        if (!user) {
          navigate(`/login?redirect=/take-quiz/${quizId}`, { state: { error: 'Please login or register to take a quiz.' } });
          return;
        }
        navigate(`/take-quiz/${quizId}`);
      }}
      setCurrentPage={(page) => {
        if (page === 'dashboard') navigate('/dashboard');
        else if (page === 'login') navigate('/login');
        else if (page === 'register') navigate('/register');
        else navigate('/');
      }}
    />
  );
}

function DashboardWrapper({ token, user }) {
  const navigate = useNavigate();
  return (
    <Dashboard 
      token={token} 
      user={user} 
      onStartQuiz={(quizId) => {
        if (!user) {
          navigate(`/login?redirect=/take-quiz/${quizId}`, { state: { error: 'Please login or register to take a quiz.' } });
          return;
        }
        navigate(`/take-quiz/${quizId}`);
      }}
      onReviewAttempt={(attemptId) => {
        navigate(`/review-attempt/${attemptId}`);
      }}
    />
  );
}

function TakeQuizWrapper({ token, user }) {
  const { quizId } = useParams();
  const navigate = useNavigate();
  if (!user) {
    return <Navigate to={`/login?redirect=/take-quiz/${quizId}`} replace />;
  }
  return (
    <TakeQuiz 
      token={token} 
      quizId={Number(quizId)}
      onQuizSubmitted={(attemptId) => {
        navigate(`/review-attempt/${attemptId}`);
      }}
      onCancel={() => navigate('/dashboard')}
    />
  );
}

function QuizReviewWrapper({ token, user }) {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  if (!user) {
    return <Navigate to={`/login?redirect=/review-attempt/${attemptId}`} replace />;
  }
  return (
    <QuizReview 
      token={token} 
      attemptId={Number(attemptId)}
      onClose={() => navigate('/dashboard')}
    />
  );
}

function AdminPanelWrapper({ token, user }) {
  const navigate = useNavigate();
  if (!user) {
    return <Navigate to="/login?redirect=/admin" replace />;
  }
  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <AdminPanel 
      token={token}
      onBack={() => navigate('/dashboard')}
    />
  );
}

function AuthModal({ mode, token, user, setToken, setUser, API_URL }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState(location.state?.error || '');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    setAuthError(location.state?.error || '');
    setAuthSuccess('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  }, [location.pathname]);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const queryParams = new URLSearchParams(location.search);
  const redirectPath = queryParams.get('redirect');

  const handleClose = () => {
    if (redirectPath) {
      navigate('/dashboard');
    } else {
      if (window.history.length > 2) {
        navigate(-1);
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!username.trim() || !password.trim()) {
      setAuthError('Please fill out all fields.');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }
    }

    setAuthLoading(true);

    try {
      if (mode === 'register') {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        setAuthSuccess('Registration successful! You can now log in.');
        
        navigate(`/login${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`);
        
        setPassword('');
        setConfirmPassword('');
      } else {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Invalid username or password');
        }

        setToken(data.token);
        setUser(data.user);
        setUsername('');
        setPassword('');
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(9, 13, 22, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '20px'
      }}
      onClick={handleClose}
    >
      <div 
        className="glass-card animate-fade-in" 
        style={{ 
          width: '100%', 
          maxWidth: '400px', 
          padding: '30px',
          position: 'relative',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button 
          type="button" 
          onClick={handleClose} 
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '24px',
            fontWeight: 'bold',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 0.5,
            transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          &times;
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 800,
            background: 'linear-gradient(135deg, #ffffff 0%, #c7d2fe 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '4px'
          }}>
            QuizApp
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: 500 }}>
            Interactive Assessment Platform
          </p>
        </div>

        <h2 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>

        {authError && <div className="alert alert-danger">{authError}</div>}
        {authSuccess && <div className="alert alert-success">{authSuccess}</div>}

        <form onSubmit={handleAuthSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Enter username" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Enter password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required 
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="Re-type password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required 
              />
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '10px' }}
            disabled={authLoading}
          >
            {authLoading ? 'Loading...' : (mode === 'login' ? 'Log In' : 'Sign Up')}
          </button>
          
          <button 
            type="button" 
            onClick={handleClose} 
            className="btn btn-secondary" 
            style={{ width: '100%', marginTop: '8px' }}
          >
            Cancel
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          {mode === 'login' ? (
            <>
              New to the platform?{' '}
              <span 
                onClick={() => navigate(`/register${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`)} 
                style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
              >
                Register here
              </span>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <span 
                onClick={() => navigate(`/login${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`)} 
                style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
              >
                Login here
              </span>
            </>
          )}
        </div>

        {mode === 'login' && (
          <div className="demo-box animate-fade-in" style={{ width: '100%', marginTop: '20px' }}>
            <strong style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>Demo Credentials (Click to Autofill):</strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div 
                onClick={() => {
                  setUsername('admin');
                  setPassword('adminpassword');
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                className="demo-credential-row"
              >
                <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '12px' }}>Admin</span>
                <div style={{ fontSize: '11px' }}>
                  <code style={{ marginRight: '4px' }}>admin</code>/<code>adminpassword</code>
                </div>
              </div>
              
              <div 
                onClick={() => {
                  setUsername('user');
                  setPassword('userpassword');
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                className="demo-credential-row"
              >
                <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '12px' }}>Student</span>
                <div style={{ fontSize: '11px' }}>
                  <code style={{ marginRight: '4px' }}>user</code>/<code>userpassword</code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
