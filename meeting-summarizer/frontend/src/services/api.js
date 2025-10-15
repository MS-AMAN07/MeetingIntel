import axios from 'axios';

// Create axios instance with correct base URL
const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Full URL to your backend
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout for file uploads
});

export const meetingAPI = {
  // Upload audio file
  uploadAudio: async (audioFile) => {
    console.log('📤 Starting upload for file:', audioFile.name);
    
    const formData = new FormData();
    formData.append('audio', audioFile);
    
    try {
      const response = await api.post('/meetings/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for upload
      });
      console.log('✅ Upload successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Upload failed:', error);
      if (error.response) {
        // Server responded with error
        throw new Error(error.response.data.message || 'Upload failed');
      } else if (error.request) {
        // No response received
        throw new Error('Cannot connect to server. Make sure backend is running on port 5000.');
      } else {
        // Other error
        throw new Error('Upload failed: ' + error.message);
      }
    }
  },

  // Get meeting by ID
  getMeeting: async (meetingId) => {
    const response = await api.get(`/meetings/${meetingId}`);
    return response.data;
  },

  // Get all meetings
  getAllMeetings: async () => {
    const response = await api.get('/meetings');
    return response.data;
  },
};

export default api;