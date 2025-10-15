const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const upload = require('../middleware/upload');

// Upload meeting audio
router.post('/upload', upload.single('audio'), meetingController.uploadMeeting);

// Get meeting by ID
router.get('/:meetingId', meetingController.getMeeting);

// Get all meetings
router.get('/', meetingController.getAllMeetings);

module.exports = router;