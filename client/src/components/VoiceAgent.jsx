import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './VoiceAgent.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const VoiceAgent = ({ username }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const hasGreetedRef = useRef(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(false);

  // Check current permission status
  const checkMicrophonePermission = async () => {
    if (!navigator.permissions) {
      // Permissions API not supported, try direct access
      return null;
    }
    
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      return result.state;
    } catch (err) {
      console.log('Permission query not supported:', err);
      return null;
    }
  };

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    setCheckingPermission(true);
    setError(null);
    
    try {
      // Check if we're on a secure context (required for getUserMedia)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Microphone access requires a secure connection (HTTPS) or localhost. Please ensure you\'re accessing the app via http://localhost:3000');
        setCheckingPermission(false);
        return false;
      }

      // Request permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      setPermissionGranted(true);
      setError(null);
      setCheckingPermission(false);
      return true;
    } catch (err) {
      console.error('Microphone permission error:', err);
      setPermissionGranted(false);
      setCheckingPermission(false);
      
      let errorMessage = 'Could not access microphone. ';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone access was denied. ';
        if (err.message.includes('not allowed')) {
          errorMessage += 'Please click the lock/microphone icon in your browser\'s address bar and allow microphone access.';
        } else {
          errorMessage += 'Please allow microphone access in your browser settings.';
        }
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Microphone is being used by another application. Please close other apps using the microphone.';
      } else {
        errorMessage += `Error: ${err.message || err.name}`;
      }
      
      setError(errorMessage);
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
        setError('Microphone access is blocked. Please enable it in your browser settings.');
        setPermissionGranted(false);
      }
      // If 'prompt', we'll wait for user to click the button
    };
    
    checkPermission();
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
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
      
      // Add user message to history
      const userMessage = { role: 'user', content: transcript };
      
      // Update history and get the updated version
      let updatedHistory;
      setConversationHistory(prev => {
        updatedHistory = [...prev, userMessage];
        return updatedHistory;
      });

      // Process with agent
      try {
        const response = await axios.post(`${API_BASE_URL}/api/chat`, {
          message: transcript,
          conversationHistory: updatedHistory
        });

        const agentResponse = response.data.response;
        
        // Add agent response to history
        setConversationHistory(prev => {
          // Ensure we don't duplicate the user message
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === 'user' && lastMsg.content === transcript) {
            return [...prev, { role: 'assistant', content: agentResponse }];
          }
          return prev;
        });

        // Speak the response
        await speakText(agentResponse);
        
        setStatus('idle');
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
        // User didn't speak, just reset
        setError(null);
        return;
      }
      
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Click the lock icon in your browser\'s address bar and allow microphone access, then refresh the page.');
        setPermissionGranted(false);
      } else if (event.error === 'aborted') {
        // User stopped it, no error needed
        setError(null);
      } else if (event.error === 'network') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(`Speech recognition error: ${event.error}. Please try again.`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (status !== 'processing') {
        setStatus('idle');
      }
    };

    recognitionRef.current = recognition;
  }, [conversationHistory, status]);

  // Initial greeting
  useEffect(() => {
    if (!hasGreetedRef.current && username) {
      hasGreetedRef.current = true;
      // Don't speak greeting automatically - let user grant permission first
      // The greeting will be shown in the UI instead
    }
  }, [username]);

  // Text-to-speech function
  const speakText = (text) => {
    return new Promise((resolve) => {
      if (synthRef.current.speaking) {
        synthRef.current.cancel();
      }

      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
        // Don't show error for TTS issues, just resolve silently
        // TTS errors are usually non-critical
        resolve();
      };

      synthRef.current.speak(utterance);
    });
  };

  // Start/stop listening
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
      
      // Request permission first if not already granted
      if (!permissionGranted) {
        const granted = await requestMicrophonePermission();
        if (!granted) {
          return; // Permission denied, don't start recognition
        }
      }
      
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
        if (err.name === 'NotAllowedError' || err.message.includes('not-allowed')) {
          setError('Microphone access denied. Please allow microphone access in your browser settings.');
          setPermissionGranted(false);
        } else {
          setError('Could not start speech recognition. Please try again.');
        }
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

  return (
    <div className="voice-agent-container">
      <div className="voice-agent-card">
        <div className="header">
          <h1>Voice Meeting Agent</h1>
          <p className="username">Hello, {username}!</p>
        </div>

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
              {(error.includes('Microphone') || error.includes('microphone') || error.includes('denied') || error.includes('blocked')) && (
                <div className="error-instructions">
                  <p><strong>📋 Step-by-Step Fix:</strong></p>
                  <div className="steps-container">
                    <div className="step">
                      <span className="step-number">1</span>
                      <span className="step-text">Look at your browser's address bar (where you see <code>localhost:3000</code>)</span>
                    </div>
                    <div className="step">
                      <span className="step-number">2</span>
                      <span className="step-text">Find the <strong>lock icon 🔒</strong> or <strong>microphone icon 🎤</strong> on the left side of the address bar</span>
                    </div>
                    <div className="step">
                      <span className="step-number">3</span>
                      <span className="step-text">Click the icon to open "Site settings" or "Permissions"</span>
                    </div>
                    <div className="step">
                      <span className="step-number">4</span>
                      <span className="step-text">Find "Microphone" in the list and change it from "Block" to <strong>"Allow"</strong></span>
                    </div>
                    <div className="step">
                      <span className="step-number">5</span>
                      <span className="step-text">Close the settings and <strong>refresh this page</strong> (F5 or Cmd+R)</span>
                    </div>
                  </div>
                  <div className="browser-check">
                    <p><strong>💡 Important:</strong></p>
                    <ul>
                      <li>Use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> browser</li>
                      <li>Make sure you're accessing via <code>http://localhost:3000</code></li>
                      <li>If you see a popup asking for permission, click <strong>"Allow"</strong></li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setError(null)} className="error-close">×</button>
          </div>
        )}

        <div className="controls">
          {!permissionGranted && !isListening && (
            <div className="permission-notice">
              <p>🔒 Microphone access required for voice interaction</p>
              <button 
                className="permission-btn"
                onClick={requestMicrophonePermission}
                disabled={checkingPermission}
              >
                {checkingPermission ? 'Requesting Access...' : 'Grant Microphone Access'}
              </button>
              <div className="permission-help">
                <p><strong>Having trouble?</strong></p>
                <p>1. Look for a <strong>lock 🔒</strong> or <strong>microphone 🎤</strong> icon in your browser's address bar</p>
                <p>2. Click it and change microphone permission to <strong>"Allow"</strong></p>
                <p>3. Refresh this page</p>
                <p style={{marginTop: '10px', fontSize: '12px', color: '#666'}}>
                  <strong>Note:</strong> Make sure you're using Chrome or Edge and accessing via <code>http://localhost:3000</code>
                </p>
              </div>
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
    </div>
  );
};

export default VoiceAgent;

