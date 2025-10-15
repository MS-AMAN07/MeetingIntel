import React, { useState } from 'react';
import { meetingAPI } from './services/api';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [meeting, setMeeting] = useState(null);
  const [error, setError] = useState('');
  const [pollingId, setPollingId] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    handleFileSelection(selectedFile);
  };

  const handleFileSelection = (selectedFile) => {
    if (selectedFile) {
      if (selectedFile.type.startsWith('audio/')) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please select an audio file (MP3, WAV, M4A, etc.)');
        setFile(null);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelection(droppedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const response = await meetingAPI.uploadAudio(file);
      
      if (response.success) {
        const meetingId = response.data.meetingId;
        startPolling(meetingId);
      } else {
        setError(response.message || 'Upload failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const startPolling = (meetingId) => {
    if (pollingId) {
      clearInterval(pollingId);
    }

    const id = setInterval(async () => {
      try {
        const response = await meetingAPI.getMeeting(meetingId);
        
        if (response.success) {
          const meetingData = response.data;
          setMeeting(meetingData);

          if (meetingData.status === 'completed' || meetingData.status === 'failed') {
            clearInterval(id);
            setPollingId(null);
            
            if (meetingData.status === 'failed') {
              setError('Processing failed. Please try again with a different audio file.');
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
        clearInterval(id);
        setPollingId(null);
        setError('Failed to check meeting status');
      }
    }, 2000);

    setPollingId(id);
  };

  const resetForm = () => {
    setFile(null);
    setMeeting(null);
    setError('');
    if (pollingId) {
      clearInterval(pollingId);
      setPollingId(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">🎯</div>
            <h1>MeetingIntel</h1>
          </div>
          <p className="tagline">Transform meeting audio into actionable insights</p>
        </div>
      </header>

      <main className="app-main">
        {!meeting ? (
          <div className="upload-section">
            <div className="upload-container">
              <h2>Upload Meeting Audio</h2>
              <p className="upload-subtitle">Get instant transcripts, summaries, and action items</p>
              
              <div 
                className={`upload-area ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="audio-file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                
                <div className="upload-content">
                  <div className="upload-icon">🎤</div>
                  
                  {file ? (
                    <div className="file-info">
                      <div className="file-name">{file.name}</div>
                      <div className="file-size">{formatFileSize(file.size)}</div>
                      <div className="audio-preview">
                        <audio controls>
                          <source src={URL.createObjectURL(file)} type={file.type} />
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3>Drop your audio file here</h3>
                      <p>or click to browse</p>
                      <div className="supported-formats">
                        Supports: MP3, WAV, M4A, OGG
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className={`upload-button ${uploading ? 'uploading' : ''}`}
              >
                {uploading ? (
                  <>
                    <div className="button-spinner"></div>
                    Processing Audio...
                  </>
                ) : (
                  'Generate Meeting Summary'
                )}
              </button>

              {error && (
                <div className="error-message">
                  <div className="error-icon">⚠️</div>
                  {error}
                </div>
              )}
            </div>

            {/* Features Grid */}
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">📝</div>
                <h3>AI Transcription</h3>
                <p>Accurate speech-to-text conversion using advanced AI</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🤖</div>
                <h3>Smart Summaries</h3>
                <p>Key insights and decisions extracted automatically</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">✅</div>
                <h3>Action Items</h3>
                <p>Clear tasks with owners and deadlines</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="results-section">
            <div className="results-header">
              <h2>Meeting Analysis Complete</h2>
              <button onClick={resetForm} className="new-meeting-button">
                + New Meeting
              </button>
            </div>

            {meeting.status === 'processing' && (
              <div className="processing-message">
                <div className="processing-animation">
                  <div className="pulse-dot"></div>
                  <div className="pulse-ring"></div>
                </div>
                <h3>Processing Your Meeting</h3>
                <p>This may take 1-2 minutes depending on audio length</p>
                <div className="processing-steps">
                  <div className="step active">📤 Uploaded</div>
                  <div className="step active">🎤 Transcribing</div>
                  <div className="step">🤖 Analyzing</div>
                  <div className="step">✅ Complete</div>
                </div>
              </div>
            )}

            {meeting.status === 'completed' && (
              <div className="meeting-results">
                {/* Summary Card */}
                <div className="result-card summary-card">
                  <div className="card-header">
                    <div className="card-icon">📊</div>
                    <h3>Meeting Summary</h3>
                  </div>
                  <div className="card-content">
                    <p>{meeting.summary}</p>
                  </div>
                </div>

                <div className="results-grid">
                  {/* Key Decisions */}
                  <div className="result-card">
                    <div className="card-header">
                      <div className="card-icon">🎯</div>
                      <h3>Key Decisions</h3>
                    </div>
                    <div className="card-content">
                      <ul className="decisions-list">
                        {meeting.keyDecisions.map((decision, index) => (
                          <li key={index} className="decision-item">
                            <span className="decision-bullet">•</span>
                            {decision}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Items */}
                  <div className="result-card">
                    <div className="card-header">
                      <div className="card-icon">✅</div>
                      <h3>Action Items</h3>
                    </div>
                    <div className="card-content">
                      <div className="action-items">
                        {meeting.actionItems.map((item, index) => (
                          <div key={index} className="action-item">
                            <div className="task-text">{item.task}</div>
                            <div className="action-details">
                              <span className="detail owner">
                                <span className="detail-label">Owner:</span>
                                <span className={`owner-name ${item.owner === 'TBD' ? 'unassigned' : ''}`}>
                                  {item.owner}
                                </span>
                              </span>
                              <span className="detail deadline">
                                <span className="detail-label">Deadline:</span>
                                <span className={`deadline-date ${item.deadline === 'TBD' ? 'unassigned' : ''}`}>
                                  {item.deadline}
                                </span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transcript */}
                <div className="result-card transcript-card">
                  <div className="card-header">
                    <div className="card-icon">📄</div>
                    <h3>Full Transcript</h3>
                  </div>
                  <div className="card-content">
                    <div className="transcript">
                      {meeting.transcript}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>Built with React, Node.js, and OpenAI • Meeting Summarizer v1.0</p>
      </footer>
    </div>
  );
}

export default App;