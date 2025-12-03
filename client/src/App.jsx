import { useState, useEffect, useRef } from 'react';
import EnhancedVoiceAgent from './components/EnhancedVoiceAgent';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const inputRef = useRef(null);

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

  const handleSkip = () => {
    setUsername('Guest');
    setShowNameInput(false);
  };

  const handleDemoMode = () => {
    setUsername('Demo User');
    localStorage.setItem('voiceAgentUsername', 'Demo User');
    setShowNameInput(false);
  };

  if (showNameInput) {
    return (
      <div className="name-input-container">
        <div className="name-input-card">
          {/* Decorative background elements */}
          <div className="decoration-circle circle-1"></div>
          <div className="decoration-circle circle-2"></div>
          <div className="decoration-circle circle-3"></div>
          
          <span className="welcome-icon">🎙️</span>
          <h1>Voice Meeting Agent</h1>
          <p className="subtitle">Your AI-powered voice assistant for effortless meeting management</p>
          
          <div className="feature-highlights">
            <div className="feature-item">
              <span className="feature-icon">🗓️</span>
              <span className="feature-text">Schedule</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📋</span>
              <span className="feature-text">Manage</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔄</span>
              <span className="feature-text">Reschedule</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔍</span>
              <span className="feature-text">Search</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📥</span>
              <span className="feature-text">Export</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🌙</span>
              <span className="feature-text">Dark Mode</span>
            </div>
          </div>

          <div className="input-section">
            <label className="input-label">What should I call you?</label>
            <input
              ref={inputRef}
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
              💡 Your name will be saved locally for future visits
            </div>
          </div>

          <div className="button-group">
            <button
              onClick={() => handleNameSubmit(inputRef.current?.value || '')}
              className="name-submit-btn primary"
            >
              <span className="btn-content">
                <span className="btn-icon">🚀</span>
                <span>Get Started</span>
              </span>
            </button>

            <div className="secondary-actions">
              <button onClick={handleSkip} className="secondary-btn">
                Skip for now
              </button>
              <span className="divider">•</span>
              <button onClick={handleDemoMode} className="secondary-btn">
                Try Demo
              </button>
            </div>
          </div>

          <div className="voice-examples">
            <p className="examples-title">💬 Voice Examples:</p>
            <div className="examples-grid">
              <div className="example-item">
                <span className="example-icon">📅</span>
                <span>"Schedule a meeting for tomorrow at 2 PM"</span>
              </div>
              <div className="example-item">
                <span className="example-icon">❓</span>
                <span>"What meetings do I have today?"</span>
              </div>
              <div className="example-item">
                <span className="example-icon">🔄</span>
                <span>"Move the team sync to next Monday"</span>
              </div>
            </div>
          </div>

          <div className="app-footer">
            <div className="browser-badges">
              <div className="browser-badge supported">
                <span>✓ Chrome</span>
              </div>
              <div className="browser-badge supported">
                <span>✓ Edge</span>
              </div>
              <div className="browser-badge limited">
                <span>⚠ Firefox</span>
              </div>
            </div>
            <button 
              className="help-link"
              onClick={() => setShowHelp(true)}
            >
              Need help? <span>→</span>
            </button>
          </div>
        </div>

        {/* Help Modal */}
        {showHelp && (
          <div className="modal-overlay" onClick={() => setShowHelp(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowHelp(false)}>×</button>
              <h2>🎯 Quick Guide</h2>
              
              <div className="help-section">
                <h3>🎤 Getting Started</h3>
                <ol>
                  <li>Enter your name or skip to continue as Guest</li>
                  <li>Allow microphone access when prompted</li>
                  <li>Click "Start Listening" to begin</li>
                  <li>Speak naturally - the AI will understand!</li>
                </ol>
              </div>

              <div className="help-section">
                <h3>🗣️ Voice Commands</h3>
                <ul>
                  <li><strong>Schedule:</strong> "Schedule a meeting with John tomorrow at 3 PM for 30 minutes"</li>
                  <li><strong>List:</strong> "What meetings do I have?" or "Show my calendar"</li>
                  <li><strong>Reschedule:</strong> "Move the Q4 planning to next week"</li>
                  <li><strong>Search:</strong> "Find my meetings with Sarah"</li>
                </ul>
              </div>

              <div className="help-section">
                <h3>⚙️ Features</h3>
                <ul>
                  <li>🌙 <strong>Dark Mode:</strong> Toggle in settings</li>
                  <li>🔄 <strong>Continuous Mode:</strong> Auto-restart listening</li>
                  <li>📥 <strong>Export:</strong> Download meetings to calendar</li>
                  <li>🎚️ <strong>Voice Settings:</strong> Adjust speed, pitch, volume</li>
                </ul>
              </div>

              <div className="help-section">
                <h3>💡 Tips</h3>
                <ul>
                  <li>Use Chrome or Edge for best results</li>
                  <li>Speak clearly and at normal pace</li>
                  <li>Try the Quick Actions for common tasks</li>
                  <li>Enable continuous mode for hands-free operation</li>
                </ul>
              </div>

              <button className="modal-button" onClick={() => setShowHelp(false)}>
                Got it!
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return <EnhancedVoiceAgent username={username} onShowHelp={() => setShowHelp(true)} />;
}

export default App;


