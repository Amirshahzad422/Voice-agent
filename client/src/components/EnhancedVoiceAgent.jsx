import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './EnhancedVoiceAgent.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const EnhancedVoiceAgent = ({ username }) => {
  // Voice & conversation state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  
  // Meetings state
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  
  // UI state
  const [view, setView] = useState('home'); // 'home', 'calendar', 'settings'
  const [darkMode, setDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  
  // Settings state
  const [continuousMode, setContinuousMode] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  });
  
  // Refs
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const hasGreetedRef = useRef(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const conversationEndRef = useRef(null);

  // Check and request microphone permission
  const requestMicrophonePermission = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Microphone access requires HTTPS or localhost');
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      setError(null);
      return true;
    } catch (err) {
      console.error('Microphone permission error:', err);
      setPermissionGranted(false);
      setError('Microphone access denied. Please allow microphone access in your browser settings.');
      return false;
    }
  };

  // Load dark mode preference
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark-mode');
    }

    const savedVoiceSettings = localStorage.getItem('voiceSettings');
    if (savedVoiceSettings) {
      setVoiceSettings(JSON.parse(savedVoiceSettings));
    }

    const savedContinuousMode = localStorage.getItem('continuousMode') === 'true';
    setContinuousMode(savedContinuousMode);
  }, []);

  // Fetch meetings
  const fetchMeetings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/meetings`);
      setMeetings(response.data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  };

  useEffect(() => {
    fetchMeetings();
    const interval = setInterval(fetchMeetings, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('listening');
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setStatus('processing');
      
      const userMessage = { role: 'user', content: transcript };
      
      let updatedHistory;
      setConversationHistory(prev => {
        updatedHistory = [...prev, userMessage];
        return updatedHistory;
      });

      try {
        const response = await axios.post(`${API_BASE_URL}/api/chat`, {
          message: transcript,
          conversationHistory: updatedHistory
        });

        const agentResponse = response.data.response;
        
        setConversationHistory(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === 'user' && lastMsg.content === transcript) {
            return [...prev, { role: 'assistant', content: agentResponse }];
          }
          return prev;
        });

        await speakText(agentResponse);
        await fetchMeetings(); // Refresh meetings after any action
        
        setStatus('idle');
        
        // Continue listening if continuous mode is enabled
        if (continuousMode && !isSpeaking) {
          setTimeout(() => {
            if (recognitionRef.current && !isListening) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.log('Could not restart recognition:', e);
              }
            }
          }, 1000);
        }
      } catch (err) {
        console.error('Error processing message:', err);
        setError('Failed to process your request. Please try again.');
        setStatus('idle');
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setStatus('idle');
      
      if (event.error === 'no-speech') {
        setError(null);
        return;
      }
      
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access.');
        setPermissionGranted(false);
      } else if (event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (status !== 'processing') {
        setStatus('idle');
      }
    };

    recognitionRef.current = recognition;
  }, [conversationHistory, status, continuousMode, isSpeaking, isListening]);

  // Text-to-speech function
  const speakText = (text) => {
    return new Promise((resolve) => {
      if (synthRef.current.speaking) {
        synthRef.current.cancel();
      }

      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.rate = voiceSettings.rate;
      utterance.pitch = voiceSettings.pitch;
      utterance.volume = voiceSettings.volume;

      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };

      synthRef.current.speak(utterance);
    });
  };

  // Toggle listening
  const toggleListening = async () => {
    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setStatus('idle');
    } else {
      setError(null);
      
      if (!permissionGranted) {
        const granted = await requestMicrophonePermission();
        if (!granted) return;
      }
      
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
        setError('Could not start speech recognition. Please try again.');
      }
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
    if (newMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  };

  // Toggle continuous mode
  const toggleContinuousMode = () => {
    const newMode = !continuousMode;
    setContinuousMode(newMode);
    localStorage.setItem('continuousMode', newMode);
  };

  // Update voice settings
  const updateVoiceSettings = (key, value) => {
    const newSettings = { ...voiceSettings, [key]: value };
    setVoiceSettings(newSettings);
    localStorage.setItem('voiceSettings', JSON.stringify(newSettings));
  };

  // Export meetings to ICS
  const exportToICS = () => {
    if (meetings.length === 0) {
      alert('No meetings to export');
      return;
    }

    let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Voice Meeting Agent//EN\n';
    
    meetings.forEach(meeting => {
      const startDate = new Date(meeting.datetime);
      const endDate = new Date(startDate.getTime() + meeting.duration_minutes * 60000);
      
      const formatDate = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      icsContent += 'BEGIN:VEVENT\n';
      icsContent += `UID:${meeting.id}@voiceagent\n`;
      icsContent += `DTSTAMP:${formatDate(new Date())}\n`;
      icsContent += `DTSTART:${formatDate(startDate)}\n`;
      icsContent += `DTEND:${formatDate(endDate)}\n`;
      icsContent += `SUMMARY:${meeting.title}\n`;
      if (meeting.notes) {
        icsContent += `DESCRIPTION:${meeting.notes.replace(/\n/g, '\\n')}\n`;
      }
      icsContent += 'END:VEVENT\n';
    });

    icsContent += 'END:VCALENDAR';

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meetings.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Delete meeting
  const deleteMeeting = async (id) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/api/meetings/${id}`);
      await fetchMeetings();
      setSelectedMeeting(null);
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('Failed to delete meeting');
    }
  };

  // Quick actions
  const quickActions = [
    { icon: '📅', label: 'Schedule Meeting', command: 'Schedule a meeting' },
    { icon: '📋', label: 'List Meetings', command: 'What meetings do I have?' },
    { icon: '🔍', label: 'Search', command: 'Find meetings' },
    { icon: '📥', label: 'Export', action: exportToICS },
  ];

  const executeQuickAction = async (action) => {
    if (action.action) {
      action.action();
      return;
    }
    
    if (action.command) {
      const userMessage = { role: 'user', content: action.command };
      setConversationHistory(prev => [...prev, userMessage]);
      
      try {
        const response = await axios.post(`${API_BASE_URL}/api/chat`, {
          message: action.command,
          conversationHistory: [...conversationHistory, userMessage]
        });

        const agentResponse = response.data.response;
        setConversationHistory(prev => [...prev, { role: 'assistant', content: agentResponse }]);
        await speakText(agentResponse);
        await fetchMeetings();
      } catch (error) {
        console.error('Error executing quick action:', error);
      }
    }
  };

  // Scroll to bottom of conversation
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    if (date.toDateString() === now.toDateString()) {
      return `Today at ${timeStr}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${timeStr}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }
  };

  return (
    <div className="enhanced-voice-agent">
      {/* Header */}
      <div className="agent-header">
        <div className="header-left">
          <h1>🎙️ Voice Meeting Agent</h1>
          <p className="user-greeting">Welcome back, {username}!</p>
        </div>
        <div className="header-right">
          <button 
            className={`icon-btn ${darkMode ? 'active' : ''}`}
            onClick={toggleDarkMode}
            title="Toggle Dark Mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button 
            className="icon-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            ⚙️
          </button>
          <div className="stats-badge">
            <span className="badge-number">{meetings.length}</span>
            <span className="badge-label">Meetings</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="agent-content">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="nav-buttons">
            <button 
              className={`nav-btn ${view === 'home' ? 'active' : ''}`}
              onClick={() => setView('home')}
            >
              <span className="nav-icon">🏠</span>
              <span>Home</span>
            </button>
            <button 
              className={`nav-btn ${view === 'calendar' ? 'active' : ''}`}
              onClick={() => setView('calendar')}
            >
              <span className="nav-icon">📅</span>
              <span>Calendar</span>
            </button>
          </div>

          {/* Quick Actions */}
          {showQuickActions && (
            <div className="quick-actions-panel">
              <div className="panel-header">
                <h3>⚡ Quick Actions</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowQuickActions(false)}
                >
                  ×
                </button>
              </div>
              <div className="quick-actions-grid">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    className="quick-action-btn"
                    onClick={() => executeQuickAction(action)}
                    title={action.label}
                  >
                    <span className="action-icon">{action.icon}</span>
                    <span className="action-label">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main View */}
        <div className="main-view">
          {view === 'home' && (
            <>
              {/* Voice Control Section */}
              <div className="voice-control-card">
                <div className="control-header">
                  <h2>🎤 Voice Control</h2>
                  <div className="control-options">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={continuousMode}
                        onChange={toggleContinuousMode}
                      />
                      <span>Continuous Mode</span>
                    </label>
                  </div>
                </div>

                <div className={`status-indicator ${status}`}>
                  <div className="status-dot"></div>
                  <span className="status-text">
                    {status === 'idle' && 'Ready to listen'}
                    {status === 'listening' && '🎤 Listening...'}
                    {status === 'processing' && '🤔 Processing...'}
                  </span>
                </div>

                {error && (
                  <div className="error-alert">
                    <span>⚠️</span>
                    <p>{error}</p>
                    <button onClick={() => setError(null)}>×</button>
                  </div>
                )}

                <div className="voice-controls">
                  <button
                    className={`main-voice-btn ${isListening ? 'active' : ''}`}
                    onClick={toggleListening}
                    disabled={status === 'processing'}
                  >
                    {isListening ? (
                      <>
                        <span className="btn-icon pulse">🔴</span>
                        <span>Stop Listening</span>
                      </>
                    ) : (
                      <>
                        <span className="btn-icon">🎤</span>
                        <span>Start Listening</span>
                      </>
                    )}
                  </button>

                  {isSpeaking && (
                    <button 
                      className="secondary-voice-btn"
                      onClick={() => synthRef.current.cancel()}
                    >
                      🔇 Stop Speaking
                    </button>
                  )}
                </div>
              </div>

              {/* Conversation History */}
              <div className="conversation-card">
                <h3>💬 Conversation</h3>
                <div className="messages-container">
                  {conversationHistory.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">🎤</span>
                      <p>Start speaking to begin...</p>
                      <div className="example-commands">
                        <p>Try saying:</p>
                        <ul>
                          <li>"Schedule a meeting for tomorrow"</li>
                          <li>"Show my meetings"</li>
                          <li>"What's next on my calendar?"</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <>
                      {conversationHistory.map((msg, index) => (
                        <div key={index} className={`message ${msg.role}`}>
                          <div className="message-avatar">
                            {msg.role === 'user' ? '👤' : '🤖'}
                          </div>
                          <div className="message-content">
                            <div className="message-header">
                              {msg.role === 'user' ? 'You' : 'Assistant'}
                            </div>
                            <p>{msg.content}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={conversationEndRef} />
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {view === 'calendar' && (
            <div className="calendar-view">
              <div className="calendar-header">
                <h2>📅 Your Meetings</h2>
                <button className="export-btn" onClick={exportToICS}>
                  📥 Export to Calendar
                </button>
              </div>

              {meetings.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📅</span>
                  <p>No meetings scheduled yet</p>
                  <button 
                    className="create-meeting-btn"
                    onClick={() => {
                      setView('home');
                      setTimeout(() => toggleListening(), 300);
                    }}
                  >
                    Schedule Your First Meeting
                  </button>
                </div>
              ) : (
                <div className="meetings-grid">
                  {meetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className={`meeting-card ${selectedMeeting?.id === meeting.id ? 'selected' : ''}`}
                      onClick={() => setSelectedMeeting(meeting)}
                    >
                      <div className="meeting-time">
                        <span className="time-icon">🕒</span>
                        <span>{formatDate(meeting.datetime)}</span>
                      </div>
                      <h3 className="meeting-title">{meeting.title}</h3>
                      <div className="meeting-duration">
                        {meeting.duration_minutes} minutes
                      </div>
                      {meeting.notes && (
                        <p className="meeting-notes">{meeting.notes}</p>
                      )}
                      <div className="meeting-actions">
                        <button 
                          className="action-btn edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Implement edit
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="action-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMeeting(meeting.id);
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h2>⚙️ Settings</h2>
              <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
            </div>

            <div className="settings-content">
              <div className="setting-section">
                <h3>🎚️ Voice Settings</h3>
                
                <div className="setting-item">
                  <label>
                    Speech Rate: {voiceSettings.rate.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={voiceSettings.rate}
                    onChange={(e) => updateVoiceSettings('rate', parseFloat(e.target.value))}
                  />
                </div>

                <div className="setting-item">
                  <label>
                    Pitch: {voiceSettings.pitch.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={voiceSettings.pitch}
                    onChange={(e) => updateVoiceSettings('pitch', parseFloat(e.target.value))}
                  />
                </div>

                <div className="setting-item">
                  <label>
                    Volume: {Math.round(voiceSettings.volume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={voiceSettings.volume}
                    onChange={(e) => updateVoiceSettings('volume', parseFloat(e.target.value))}
                  />
                </div>

                <button 
                  className="test-voice-btn"
                  onClick={() => speakText('This is how I sound with your current settings.')}
                >
                  🔊 Test Voice
                </button>
              </div>

              <div className="setting-section">
                <h3>🎛️ Preferences</h3>
                
                <div className="setting-toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={darkMode}
                      onChange={toggleDarkMode}
                    />
                    <span>🌙 Dark Mode</span>
                  </label>
                </div>

                <div className="setting-toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={continuousMode}
                      onChange={toggleContinuousMode}
                    />
                    <span>🔄 Continuous Listening Mode</span>
                  </label>
                </div>

                <div className="setting-toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={showQuickActions}
                      onChange={() => setShowQuickActions(!showQuickActions)}
                    />
                    <span>⚡ Show Quick Actions</span>
                  </label>
                </div>
              </div>

              <div className="setting-section">
                <h3>ℹ️ About</h3>
                <div className="about-info">
                  <p><strong>Version:</strong> 2.0.0</p>
                  <p><strong>AI Model:</strong> GPT-4 with LangChain</p>
                  <p><strong>Voice:</strong> Browser Web Speech API</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedVoiceAgent;
