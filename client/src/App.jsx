import { useState, useEffect, useRef } from 'react';
import EnhancedVoiceAgent from './components/EnhancedVoiceAgent';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);

  useEffect(() => {
    const savedName = localStorage.getItem('voiceAgentUsername');
    if (savedName) {
      setUsername(savedName);
      setShowNameInput(false);
    }
  }, []);

  const handleNameSubmit = (name) => {
    if (name.trim()) {
      setUsername(name.trim());
      localStorage.setItem('voiceAgentUsername', name.trim());
      setShowNameInput(false);
    }
  };

  if (showNameInput) {
    return (
      <div className="name-input-container">
        <div className="name-input-card">
          <span className="welcome-icon">🎙️</span>
          <h1>Voice Meeting Agent</h1>
          <p>Your AI-powered voice assistant for effortless meeting management</p>
          
          <div className="feature-highlights">
            <div className="feature-item">
              <span className="feature-icon">🗓️</span>
              <span className="feature-text">Schedule Meetings</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📋</span>
              <span className="feature-text">View Calendar</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔄</span>
              <span className="feature-text">Reschedule</span>
            </div>
          </div>

          <input
            type="text"
            placeholder="Enter your name (e.g., John Doe)"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleNameSubmit(e.target.value);
              }
            }}
            autoFocus
            className="name-input"
          />
          
          <div className="input-helper">
            Your name will be saved locally for future visits
          </div>

          <button
            onClick={() => handleNameSubmit(document.querySelector('.name-input').value)}
            className="name-submit-btn"
          >
            <span>🚀 Get Started</span>
          </button>

          <div className="app-info">
            <p>💬 Speak naturally to schedule, view, and manage your meetings</p>
            <div className="browser-badge">
              Best on Chrome & Edge
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <EnhancedVoiceAgent username={username} />;
}

export default App;


