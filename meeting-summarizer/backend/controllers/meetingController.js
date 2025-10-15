const Meeting = require('../models/Meeting');
const openaiService = require('../services/openaiService');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

class MeetingController {
  constructor() {
    // Bind the method to preserve 'this' context
    this.uploadMeeting = this.uploadMeeting.bind(this);
    this.processMeeting = this.processMeeting.bind(this);
    this.getMeeting = this.getMeeting.bind(this);
    this.getAllMeetings = this.getAllMeetings.bind(this);
  }

  // Upload and process meeting audio
  async uploadMeeting(req, res) {
    try {
      console.log('📤 Upload request received');
      
      if (!req.file) {
        console.log('❌ No file uploaded');
        return res.status(400).json({
          success: false,
          message: 'No audio file uploaded'
        });
      }

      console.log('📁 File received:', req.file.originalname, req.file.size);

      // Create meeting record
      const meetingId = uuidv4();
      const meeting = new Meeting({
        meetingId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        status: 'processing'
      });

      await meeting.save();
      console.log('💾 Meeting record created:', meetingId);

      // Process in background - FIXED: Use bind to preserve context
      this.processMeeting(meetingId, req.file.path)
        .then(() => console.log(`✅ Processing completed for ${meetingId}`))
        .catch(err => console.error(`❌ Processing failed for ${meetingId}:`, err));

      return res.status(202).json({
        success: true,
        message: 'Meeting uploaded and processing started',
        data: {
          meetingId,
          status: 'processing'
        }
      });

    } catch (error) {
      console.error('❌ Upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload meeting',
        error: error.message
      });
    }
  }

  // Process meeting (transcribe + summarize)
  async processMeeting(meetingId, filePath) {
    try {
      console.log(`🔄 Processing meeting: ${meetingId}`);
      
      const meeting = await Meeting.findOne({ meetingId });
      
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Step 1: Transcribe audio
      console.log(`🎤 Transcribing audio for: ${meetingId}`);
      const transcript = await openaiService.transcribeAudio(filePath);
      console.log(`📝 Transcription completed, length: ${transcript.length} chars`);
      
      meeting.transcript = transcript;
      await meeting.save();

      // Step 2: Generate summary
      console.log(`🤖 Generating summary for: ${meetingId}`);
      const summaryData = await openaiService.generateSummary(transcript);
      console.log(`✅ Summary generated with ${summaryData.actionItems?.length || 0} action items`);
      
      meeting.summary = summaryData.summary;
      meeting.keyDecisions = summaryData.keyDecisions;
      meeting.actionItems = summaryData.actionItems;
      meeting.status = 'completed';
      
      await meeting.save();

      // Clean up audio file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Cleaned up audio file: ${filePath}`);
      }

      console.log(`🎉 Successfully processed meeting: ${meetingId}`);

    } catch (error) {
      console.error(`💥 Processing error for meeting ${meetingId}:`, error);
      
      // Update meeting status to failed
      const meeting = await Meeting.findOne({ meetingId });
      if (meeting) {
        meeting.status = 'failed';
        await meeting.save();
      }

      // Clean up audio file on error too
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }

      throw error;
    }
  }

  // Get meeting status and results
  async getMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      console.log(`📋 Fetching meeting: ${meetingId}`);
      
      const meeting = await Meeting.findOne({ meetingId });
      
      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: meeting
      });

    } catch (error) {
      console.error('❌ Get meeting error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch meeting',
        error: error.message
      });
    }
  }

  // Get all meetings
  async getAllMeetings(req, res) {
    try {
      const meetings = await Meeting.find()
        .sort({ createdAt: -1 })
        .select('meetingId originalName status processedAt createdAt');
      
      console.log(`📊 Found ${meetings.length} meetings`);
      
      return res.status(200).json({
        success: true,
        data: meetings
      });

    } catch (error) {
      console.error('❌ Get all meetings error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch meetings',
        error: error.message
      });
    }
  }
}

// FIXED: Export properly bound instance
module.exports = new MeetingController();