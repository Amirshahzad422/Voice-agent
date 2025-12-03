import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './EnhancedVoiceAgent.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const EnhancedVoiceAgent = ({ username, onShowHelp }) => {
  // Core states
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  
  // Feature states
  const [darkMode, setDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMeetings, setShowMeetings] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [selectedView, setSelectedView] = useState('conversation'); // conversation, meetings, calendar
  
  // Voice settings
  const [voiceSettings, setVoiceSettings] = useState({
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  });
  
  // References
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const hasGreetedRef = useRef(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('voiceAgentDarkMode') === 'true';
    const savedContinuousMode = localStorage.getItem('voiceAgentContinuousMode') === 'true';
    const savedVoiceSettings = localStorage.getItem('voiceAgentVoiceSettings');
    
    setDarkMode(savedDarkMode);
    setContinuousMode(savedContinuousMode);
    if (savedVoiceSettings) {
      setVoiceSettings(JSON.parse(savedVoiceSettings));
    }
    
    if (savedDarkMode) {
      document.documentElement.classList.add('dark-mode');
    }
  }, []);

  // Fetch meetings
  const fetchMeetings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/meetings`);
      setMeetings(response.data);
    } catch (err) {
      console.error('Error fetching meetings:', err);
    }
  };

  useEffect(() => {
    fetchMeetings();
    const interval = setInterval(fetchMeetings, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Check microphone permission
  const checkMicrophonePermission = async () => {
    if (!navigator.permissions) return null;
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      return result.state;
    } catch (err) {
      return null;
    }
  };

  const requestMicrophonePermission = async () => {
    setCheckingPermission(true);
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Microphone access requires HTTPS or localhost');
        setCheckingPermission(false);
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      setError(null);
      setCheckingPermission(false);
      return true;
    } catch (err) {
      setPermissionGranted(false);
      setCheckingPermission(false);
      setError('Microphone access denied. Please allow microphone access.');
      return false;
    }
  };

  useEffect(() => {
    const checkPermission = async () => {
      const permissionState = await checkMicrophonePermission();
      if (permissionState === 'granted') {
        setPermissionGranted(true);
      }
    };
    checkPermission();
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported. Use Chrome or Edge.');
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
        await fetchMeetings(); // Refresh meetings after agent response
        
        setStatus('idle');
        
        // Auto restart in continuous mode
        if (continuousMode) {
          setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.log('Recognition already started');
              }
            }
          }, 1000);
        }
      } catch (err) {
        console.error('Error processing message:', err);
        setError('Failed to process your request.');
        setStatus('idle');
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setStatus('idle');
      
      if (event.error === 'no-speech') {
        setError(null);
        if (continuousMode) {
          setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {}
            }
          }, 1000);
        }
        return;
      }
      
      if (event.error === 'not-allowed') {
        setError('Microphone access denied.');
        setPermissionGranted(false);
      } else if (event.error !== 'aborted') {
        setError(`Recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (status !== 'processing') {
        setStatus('idle');
      }
    };

    recognitionRef.current = recognition;
  }, [conversationHistory, status, continuousMode]);

  const speakText = (text) => {
    return new Promise((resolve) => {
      if (synthRef.current.speaking) {
        synthRef.current.cancel();
      }

      setIsSpeaking(true);
      setStatus('speaking');
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.rate = voiceSettings.rate;
      utterance.pitch = voiceSettings.pitch;
      utterance.volume = voiceSettings.volume;

      utterance.onend = () => {
        setIsSpeaking(false);
        setStatus('idle');
        resolve();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setStatus('idle');
        resolve();
      };

      synthRef.current.speak(utterance);
    });
  };

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
        setError('Could not start speech recognition.');
      }
    }
  };

  const handleQuickAction = async (action) => {
    const actions = {
      'list': 'What meetings do I have?',
      'today': 'What meetings do I have today?',
      'schedule': 'Schedule a new meeting',
      'clear': 'Clear conversation'
    };
    
    if (action === 'clear') {
      setConversationHistory([]);
      return;
    }
    
    const message = actions[action];
    if (message) {
      const userMessage = { role: 'user', content: message };
      let updatedHistory;
      setConversationHistory(prev => {
        updatedHistory = [...prev, userMessage];
        return updatedHistory;
      });

      try {
        setStatus('processing');
        const response = await axios.post(`${API_BASE_URL}/api/chat`, {
          message,
          conversationHistory: updatedHistory
        });

        const agentResponse = response.data.response;
        setConversationHistory(prev => [...prev, { role: 'assistant', content: agentResponse }]);
        await speakText(agentResponse);
        await fetchMeetings();
        setStatus('idle');
      } catch (err) {
        setError('Failed to process quick action.');
        setStatus('idle');
      }
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('voiceAgentDarkMode', newMode);
    document.documentElement.classList.toggle('dark-mode');
  };

  const toggleContinuousMode = () => {
    const newMode = !continuousMode;
    setContinuousMode(newMode);
    localStorage.setItem('voiceAgentContinuousMode', newMode);
  };

  const updateVoiceSettings = (key, value) => {
    const newSettings = { ...voiceSettings, [key]: parseFloat(value) };
    setVoiceSettings(newSettings);
    localStorage.setItem('voiceAgentVoiceSettings', JSON.stringify(newSettings));
  };

  const exportMeetings = () => {
    const icsContent = generateICS(meetings);
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meetings.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateICS = (meetings) => {
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Voice Agent//Meetings//EN\n';
    meetings.forEach(meeting => {
      const start = new Date(meeting.datetime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const end = new Date(new Date(meeting.datetime).getTime() + meeting.duration_minutes * 60000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      ics += `BEGIN:VEVENT\nUID:${meeting.id}@voiceagent.com\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:${meeting.title}\nDESCRIPTION:${meeting.notes || ''}\nEND:VEVENT\n`;
    });
    ics += 'END:VCALENDAR';
    return ics;
  };

  const deleteMeeting = async (id) => {
    if (confirm('Delete this meeting?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/meetings/${id}`);
        await fetchMeetings();
      } catch (err) {
        setError('Failed to delete meeting.');
      }
    }
  };

  const getMeetingStats = () => {
    const total = meetings.length;
    const today = meetings.filter(m => {
      const meetingDate = new Date(m.datetime).toDateString();
      return meetingDate === new Date().toDateString();
    }).length;
    const upcoming = meetings.filter(m => new Date(m.datetime) > new Date()).length;
    return { total, today, upcoming };
  };

  const stats = getMeetingStats();

  return (
    <div className={`enhanced-voice-agent ${darkMode ? 'dark' : ''}`}>
      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-bar-left">
          <h1>🎙️ Voice Agent</h1>
          <span className="username-badge">👤 {username}</span>
        </div>
        <div className="top-bar-right">
          <button className="icon-btn" onClick={() => setShowSettings(!showSettings)} title="Settings">
            ⚙️
          </button>
          <button className="icon-btn" onClick={toggleDarkMode} title="Toggle Dark Mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button className="icon-btn" onClick={onShowHelp} title="Help">
            ❓
          </button>
        </div>
      </div>

      <div className="main-container">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="stats-cards">
            <div className="stat-card">
              <span className="stat-icon">📊</span>
              <div>
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total</div>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📅</span>
              <div>
                <div className="stat-value">{stats.today}</div>
                <div className="stat-label">Today</div>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">⏰</span>
              <div>
                <div className="stat-value">{stats.upcoming}</div>
                <div className="stat-label">Upcoming</div>
              </div>
            </div>
          </div>

          <div className="nav-tabs">
            <button 
              className={`nav-tab ${selectedView === 'conversation' ? 'active' : ''}`}
              onClick={() => setSelectedView('conversation')}
            >
              <span>💬</span> Chat
            </button>
            <button 
              className={`nav-tab ${selectedView === 'meetings' ? 'active' : ''}`}
              onClick={() => setSelectedView('meetings')}
            >
              <span>📋</span> Meetings
            </button>
          </div>

          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <button className="quick-action-btn" onClick={() => handleQuickAction('list')}>
              📋 List All
            </button>
            <button className="quick-action-btn" onClick={() => handleQuickAction('today')}>
              📅 Today's Meetings
            </button>
            <button className="quick-action-btn" onClick={() => handleQuickAction('schedule')}>
              ➕ Schedule New
            </button>
            <button className="quick-action-btn" onClick={exportMeetings} disabled={meetings.length === 0}>
              📥 Export Calendar
            </button>
            <button className="quick-action-btn danger" onClick={() => handleQuickAction('clear')}>
              🗑️ Clear Chat
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Voice Control Panel */}
          <div className="voice-control-panel">
            <div className="status-display">
              <div className={`status-indicator-enhanced ${status}`}>
                <div className="status-dot-enhanced"></div>
                <span className="status-text-enhanced">
                  {status === 'idle' && '🟢 Ready'}
                  {status === 'listening' && '🔴 Listening...'}
                  {status === 'processing' && '🔄 Processing...'}
                  {status === 'speaking' && '🔊 Speaking...'}
                </span>
              </div>
              {continuousMode && (
                <span className="continuous-badge">🔄 Continuous Mode</span>
              )}
            </div>

            {error && (
              <div className="error-banner">
                <span>⚠️ {error}</span>
                <button onClick={() => setError(null)}>×</button>
              </div>
            )}

            <div className="voice-controls">
              {!permissionGranted && !isListening ? (
                <button className="permission-btn-enhanced" onClick={requestMicrophonePermission} disabled={checkingPermission}>
                  {checkingPermission ? '⏳ Requesting...' : '🔒 Grant Microphone Access'}
                </button>
              ) : (
                <>
                  <button
                    className={`voice-btn-main ${isListening ? 'listening' : ''}`}
                    onClick={toggleListening}
                    disabled={status === 'processing'}
                  >
                    <span className="mic-icon-large">{isListening ? '🎤' : '🎙️'}</span>
                    <span className="btn-text">{isListening ? 'Stop Listening' : 'Start Listening'}</span>
                  </button>
                  
                  {isSpeaking && (
                    <button className="voice-btn-stop" onClick={() => synthRef.current.cancel()}>
                      🛑 Stop Speaking
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Content Area */}
          {selectedView === 'conversation' && (
            <div className="conversation-panel">
              <h2>💬 Conversation</h2>
              <div className="messages-container">
                {conversationHistory.length === 0 ? (
                  <div className="empty-state-enhanced">
                    <span className="empty-icon">🎤</span>
                    <p>Click "Start Listening" and speak naturally</p>
                    <p className="empty-hint">Try: "Schedule a meeting" or "What meetings do I have?"</p>
                  </div>
                ) : (
                  conversationHistory.map((msg, index) => (
                    <div key={index} className={`message-enhanced ${msg.role}`}>
                      <div className="message-avatar">
                        {msg.role === 'user' ? '👤' : '🤖'}
                      </div>
                      <div className="message-bubble">
                        <div className="message-role-enhanced">
                          {msg.role === 'user' ? 'You' : 'Assistant'}
                        </div>
                        <div className="message-content-enhanced">{msg.content}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedView === 'meetings' && (
            <div className="meetings-panel">
              <div className="meetings-header">
                <h2>📋 Your Meetings</h2>
                <button className="refresh-btn" onClick={fetchMeetings}>
                  🔄 Refresh
                </button>
              </div>
              <div className="meetings-grid">
                {meetings.length === 0 ? (
                  <div className="empty-state-enhanced">
                    <span className="empty-icon">📅</span>
                    <p>No meetings scheduled</p>
                    <p className="empty-hint">Say "Schedule a meeting" to create one</p>
                  </div>
                ) : (
                  meetings.map(meeting => (
                    <div key={meeting.id} className="meeting-card">
                      <div className="meeting-card-header">
                        <h3>{meeting.title}</h3>
                        <button className="delete-btn" onClick={() => deleteMeeting(meeting.id)}>
                          🗑️
                        </button>
                      </div>
                      <div className="meeting-card-body">
                        <div className="meeting-detail">
                          <span className="detail-icon">📅</span>
                          <span>{new Date(meeting.datetime).toLocaleDateString()}</span>
                        </div>
                        <div className="meeting-detail">
                          <span className="detail-icon">⏰</span>
                          <span>{new Date(meeting.datetime).toLocaleTimeString()}</span>
                        </div>
                        <div className="meeting-detail">
                          <span className="detail-icon">⏱️</span>
                          <span>{meeting.duration_minutes} minutes</span>
                        </div>
                        {meeting.notes && (
                          <div className="meeting-notes">
                            <span className="detail-icon">📝</span>
                            <span>{meeting.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
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
              <div className="setting-group">
                <h3>🎚️ Voice Settings</h3>
                
                <div className="setting-item">
                  <label>
                    <span>Speed</span>
                    <span className="setting-value">{voiceSettings.rate.toFixed(1)}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={voiceSettings.rate}
                    onChange={(e) => updateVoiceSettings('rate', e.target.value)}
                    className="slider"
                  />
                </div>

                <div className="setting-item">
                  <label>
                    <span>Pitch</span>
                    <span className="setting-value">{voiceSettings.pitch.toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={voiceSettings.pitch}
                    onChange={(e) => updateVoiceSettings('pitch', e.target.value)}
                    className="slider"
                  />
                </div>

                <div className="setting-item">
                  <label>
                    <span>Volume</span>
                    <span className="setting-value">{Math.round(voiceSettings.volume * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={voiceSettings.volume}
                    onChange={(e) => updateVoiceSettings('volume', e.target.value)}
                    className="slider"
                  />
                </div>
              </div>

              <div className="setting-group">
                <h3>🎛️ Options</h3>
                
                <div className="setting-toggle">
                  <div>
                    <div className="toggle-label">Continuous Listening Mode</div>
                    <div className="toggle-description">Auto-restart after each interaction</div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={continuousMode} onChange={toggleContinuousMode} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-toggle">
                  <div>
                    <div className="toggle-label">Dark Mode</div>
                    <div className="toggle-description">Use dark theme</div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-group">
                <h3>ℹ️ Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span>Browser</span>
                    <span>{navigator.userAgent.includes('Chrome') ? 'Chrome ✓' : 'Other'}</span>
                  </div>
                  <div className="info-item">
                    <span>Microphone</span>
                    <span>{permissionGranted ? 'Granted ✓' : 'Not granted'}</span>
                  </div>
                  <div className="info-item">
                    <span>Total Meetings</span>
                    <span>{meetings.length}</span>
                  </div>
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
