import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav style={{
      background: 'var(--navbar-bg)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      color: 'var(--navbar-text)',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div 
        onClick={() => navigate('/')} 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <span style={{ 
          fontSize: '20px', 
          fontWeight: 800,
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.03em'
        }}>
          ✏️ QuizApp
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {user ? (
          
          <>
            <div style={{ fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Hello, <strong style={{ color: 'var(--text-main)' }}>{user.username}</strong></span>
              <span className={user.role === 'admin' ? 'badge badge-danger' : 'badge badge-success'} style={{ fontSize: '9px' }}>
                {user.role === 'admin' ? 'Admin' : 'Student'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => navigate('/dashboard')}
                className={`btn btn-small nav-link ${currentPath === '/dashboard' ? 'active' : ''}`}
              >
                Quizzes
              </button>

              {user.role === 'admin' && (
                <button 
                  onClick={() => navigate('/admin')}
                  className={`btn btn-small nav-link ${currentPath === '/admin' ? 'active' : ''}`}
                >
                  Admin Panel
                </button>
              )}

              <button 
                onClick={onLogout}
                className="btn btn-danger btn-small"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => navigate('/dashboard')}
              className={`btn btn-small nav-link ${currentPath === '/dashboard' ? 'active' : ''}`}
            >
              Browse Quizzes
            </button>

            <button 
              onClick={() => navigate('/login')}
              className={`btn btn-primary btn-small`}
            >
              Login
            </button>

            <button 
              onClick={() => navigate('/register')}
              className={`btn btn-secondary btn-small`}
            >
              Register
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}


