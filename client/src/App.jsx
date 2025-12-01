import { useState, useEffect, useRef } from 'react';
import VoiceAgent from './components/VoiceAgent';
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
          <h1>Welcome to Voice Meeting Agent</h1>
          <p>Please enter your name to get started</p>
          <input
            type="text"
            placeholder="Enter your name"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleNameSubmit(e.target.value);
              }
            }}
            autoFocus
            className="name-input"
          />
          <button
            onClick={() => handleNameSubmit(document.querySelector('.name-input').value)}
            className="name-submit-btn"
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  return <VoiceAgent username={username} />;
}

export default App;


