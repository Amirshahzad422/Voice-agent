import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MeetingCard from './MeetingCard';
import './EnhancedVoiceAgent.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const EnhancedVoiceAgent = ({ username }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('voice'); // voice, meetings, calendar, settings
  const [meetings, setMeetings] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  });
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const hasGreetedRef = useRef(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(false);

  // Fetch meetings
  const fetchMeetings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/meetings`);
      setMeetings(response.data || []);
    } catch (err) {
      console.error('Error fetching meetings:', err);
    }
  };

  useEffect(() => {
    fetchMeetings();
    const interval = setInterval(fetchMeetings, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [darkMode]);

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

  // Request microphone permission
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
      console.error('Microphone permission error:', err);
      setPermissionGranted(false);
      setCheckingPermission(false);
      setError('Microphone access denied. Please allow microphone access in browser settings.');
      return false;
    }
  };

  // Check permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      const permissionState = await checkMicrophonePermission();
      if (permissionState === 'granted') {
        setPermissionGranted(true);
      } else if (permissionState === 'denied') {
        setError('Microphone access blocked. Enable it in browser settings.');
        setPermissionGranted(false);
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
    
    recognition.continuous = continuousMode;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('listening');
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
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
        
        // Refresh meetings after agent response
        fetchMeetings();
        
        setStatus('idle');
        
        // Continue listening if continuous mode is on
        if (continuousMode && recognitionRef.current) {
          setTimeout(() => {
            try {
              recognitionRef.current?.start();
            } catch (e) {
              console.log('Already listening');
            }
          }, 1000);
        }
      } catch (err) {
        console.error('Error processing message:', err);
        setError('Failed to process request. Please try again.');
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
            try {
              recognitionRef.current?.start();
            } catch (e) {
              console.log('Already listening');
            }
          }, 1000);
        }
        return;
      }
      
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Allow in browser settings.');
        setPermissionGranted(false);
      } else if (event.error === 'aborted') {
        setError(null);
      } else if (event.error === 'network') {
        setError('Network error. Check internet connection.');
      } else {
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
  }, [conversationHistory, status, continuousMode]);

  // Text-to-speech
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
        setError('Could not start speech recognition.');
      }
    }
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Delete meeting
  const handleDeleteMeeting = async (meeting) => {
    if (!confirm(`Delete "${meeting.title}"?`)) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/api/meetings/${meeting.id}`);
      fetchMeetings();
      speakText(`Meeting "${meeting.title}" has been deleted.`);
    } catch (err) {
      console.error('Error deleting meeting:', err);
      setError('Failed to delete meeting.');
    }
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
      
      const formatICSDate = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };
      
      icsContent += 'BEGIN:VEVENT\n';
      icsContent += `UID:${meeting.id}@voicemeetingagent\n`;
      icsContent += `DTSTAMP:${formatICSDate(new Date())}\n`;
      icsContent += `DTSTART:${formatICSDate(startDate)}\n`;
      icsContent += `DTEND:${formatICSDate(endDate)}\n`;
      icsContent += `SUMMARY:${meeting.title}\n`;
      if (meeting.notes) {
        icsContent += `DESCRIPTION:${meeting.notes.replace(/\n/g, '\\n')}\n`;
      }
      icsContent += 'END:VEVENT\n';
    });
    
    icsContent += 'END:VCALENDAR';
    
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'meetings.ics';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Render different tabs
  const renderContent = () => {
    switch (activeTab) {
      case 'voice':
        return renderVoiceInterface();
      case 'meetings':
        return renderMeetingsView();
      case 'calendar':
        return renderCalendarView();
      case 'settings':
        return renderSettings();
      default:
        return renderVoiceInterface();
    }
  };

  const renderVoiceInterface = () => (
    <div className="voice-interface">
      <div className="status-section">
        <div className={`status-indicator ${status}`}>
          <div className="status-dot"></div>
          <span className="status-text">
            {status === 'idle' && 'Ready to listen'}
            {status === 'listening' && 'Listening...'}
            {status === 'processing' && 'Processing...'}
            {status === 'speaking' && 'Speaking...'}
          </span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <div className="error-content">
            <strong>⚠️ {error}</strong>
          </div>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      <div className="controls">
        {!permissionGranted && !isListening && (
          <div className="permission-notice">
            <p>🔒 Microphone access required</p>
            <button 
              className="permission-btn"
              onClick={requestMicrophonePermission}
              disabled={checkingPermission}
            >
              {checkingPermission ? 'Requesting...' : 'Grant Access'}
            </button>
          </div>
        )}
        
        <button
          className={`listen-btn ${isListening ? 'active' : ''}`}
          onClick={toggleListening}
          disabled={status === 'processing'}
        >
          {isListening ? (
            <>
              <span className="mic-icon">🎤</span>
              Stop Listening
            </>
          ) : (
            <>
              <span className="mic-icon">🎤</span>
              Start Listening
            </>
          )}
        </button>

        {isSpeaking && (
          <button className="stop-btn" onClick={stopSpeaking}>
            Stop Speaking
          </button>
        )}
      </div>

      <div className="conversation">
        <h3>Conversation</h3>
        <div className="conversation-messages">
          {conversationHistory.length === 0 ? (
            <p className="empty-state">Start speaking to begin...</p>
          ) : (
            conversationHistory.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <span className="message-role">
                  {msg.role === 'user' ? 'You' : 'Agent'}
                </span>
                <span className="message-content">{msg.content}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderMeetingsView = () => (
    <div className="meetings-view">
      <div className="meetings-header">
        <h2>Your Meetings ({meetings.length})</h2>
        <button className="export-btn" onClick={exportToICS}>
          📥 Export Calendar
        </button>
      </div>
      
      {meetings.length === 0 ? (
        <div className="empty-meetings">
          <span className="empty-icon">📅</span>
          <p>No meetings scheduled</p>
          <p className="empty-hint">Switch to Voice tab and say "Schedule a meeting"</p>
        </div>
      ) : (
        <div className="meetings-grid">
          {meetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onDelete={handleDeleteMeeting}
              onEdit={(m) => console.log('Edit:', m)}
              onReschedule={(m) => {
                setActiveTab('voice');
                speakText(`To reschedule ${m.title}, please tell me the new date and time.`);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderCalendarView = () => (
    <div className="calendar-view">
      <h2>Calendar View</h2>
      <div className="calendar-placeholder">
        <span className="calendar-icon">📆</span>
        <p>Visual calendar coming soon!</p>
        <p className="calendar-hint">For now, view your meetings in the Meetings tab</p>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="settings-view">
      <h2>Settings</h2>
      
      <div className="setting-group">
        <h3>Appearance</h3>
        <div className="setting-item">
          <label className="setting-label">
            <span>Dark Mode</span>
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
              className="setting-checkbox"
            />
          </label>
        </div>
      </div>

      <div className="setting-group">
        <h3>Voice Recognition</h3>
        <div className="setting-item">
          <label className="setting-label">
            <span>Continuous Listening Mode</span>
            <input
              type="checkbox"
              checked={continuousMode}
              onChange={(e) => setContinuousMode(e.target.checked)}
              className="setting-checkbox"
            />
          </label>
          <p className="setting-description">
            Keep listening after each response (experimental)
          </p>
        </div>
      </div>

      <div className="setting-group">
        <h3>Voice Settings</h3>
        <div className="setting-item">
          <label className="setting-label">
            <span>Speech Rate: {voiceSettings.rate.toFixed(1)}x</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={voiceSettings.rate}
            onChange={(e) => setVoiceSettings({...voiceSettings, rate: parseFloat(e.target.value)})}
            className="setting-slider"
          />
        </div>
        
        <div className="setting-item">
          <label className="setting-label">
            <span>Pitch: {voiceSettings.pitch.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={voiceSettings.pitch}
            onChange={(e) => setVoiceSettings({...voiceSettings, pitch: parseFloat(e.target.value)})}
            className="setting-slider"
          />
        </div>
        
        <div className="setting-item">
          <label className="setting-label">
            <span>Volume: {Math.round(voiceSettings.volume * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={voiceSettings.volume}
            onChange={(e) => setVoiceSettings({...voiceSettings, volume: parseFloat(e.target.value)})}
            className="setting-slider"
          />
        </div>

        <button 
          className="test-voice-btn"
          onClick={() => speakText('Hello! This is a test of the voice settings.')}
        >
          🔊 Test Voice
        </button>
      </div>
    </div>
  );

  return (
    <div className="enhanced-voice-agent-container">
      <div className="enhanced-voice-agent-card">
        <div className="header">
          <div className="header-content">
            <h1>Voice Meeting Agent</h1>
            <p className="username">Hello, {username}! 👋</p>
          </div>
          <div className="header-actions">
            <div className="stats">
              <span className="stat-item">
                📅 {meetings.length} {meetings.length === 1 ? 'Meeting' : 'Meetings'}
              </span>
            </div>
          </div>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'voice' ? 'active' : ''}`}
            onClick={() => setActiveTab('voice')}
          >
            <span className="tab-icon">🎤</span>
            Voice
          </button>
          <button
            className={`tab ${activeTab === 'meetings' ? 'active' : ''}`}
            onClick={() => setActiveTab('meetings')}
          >
            <span className="tab-icon">📋</span>
            Meetings
          </button>
          <button
            className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <span className="tab-icon">📆</span>
            Calendar
          </button>
          <button
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="tab-icon">⚙️</span>
            Settings
          </button>
        </div>

        <div className="tab-content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default EnhancedVoiceAgent;

