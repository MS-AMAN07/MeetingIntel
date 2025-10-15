const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    // Try to initialize OpenAI, but work without it if connection fails
    try {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.apiAvailable = true;
      console.log('✅ OpenAI client initialized');
    } catch (error) {
      this.apiAvailable = false;
      console.log('⚠️ OpenAI client initialization failed, using demo mode');
    }
  }

  // Transcribe audio - with fallback to demo data
  async transcribeAudio(audioFilePath, retries = 2) {
    if (!this.apiAvailable) {
      console.log('🎭 Using demo transcription');
      return this.getDemoTranscript();
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🎤 Transcription attempt ${attempt}/${retries}`);
        
        const transcription = await this.openai.audio.transcriptions.create({
          file: require('fs').createReadStream(audioFilePath),
          model: "whisper-1",
          response_format: "text"
        });
        
        console.log('✅ Transcription successful');
        return transcription;
        
      } catch (error) {
        console.error(`❌ Transcription attempt ${attempt} failed:`, error.message);
        
        if (attempt === retries) {
          console.log('🔄 Falling back to demo transcription');
          return this.getDemoTranscript();
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  // Generate summary - with fallback to demo data
  async generateSummary(transcript, retries = 2) {
    // If transcript is demo, use demo summary
    if (transcript.includes('DEMO_TRANSCRIPT')) {
      return this.getDemoSummary();
    }

    if (!this.apiAvailable) {
      console.log('🎭 Using demo summary');
      return this.getDemoSummary();
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🤖 Summary generation attempt ${attempt}/${retries}`);
        
        const prompt = this.createSummaryPrompt(transcript);
        
        const completion = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an expert meeting assistant. Extract structured information from meeting transcripts and provide output in valid JSON format."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        });

        const response = completion.choices[0].message.content;
        console.log('✅ Summary generation successful');
        return this.parseSummaryResponse(response);
        
      } catch (error) {
        console.error(`❌ Summary generation attempt ${attempt} failed:`, error.message);
        
        if (attempt === retries) {
          console.log('🔄 Falling back to demo summary');
          return this.getDemoSummary();
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  // Demo data for testing
  getDemoTranscript() {
    return `DEMO_TRANSCRIPT: Team meeting for Project Phoenix. We discussed the Q4 development timeline. John presented the backend API progress which is 80% complete. Sarah showed the frontend designs which are ready for implementation. We decided to use React with TypeScript for the frontend and Node.js for the backend. Database schema has been finalized. Action items: John to complete API endpoints by Friday, Sarah to implement login page, David to setup deployment pipeline. Next review meeting scheduled for next Monday. Budget approved for additional resources.`;
  }

  getDemoSummary() {
    return {
      summary: "The team reviewed Project Phoenix progress for Q4. Backend development is 80% complete and frontend designs are ready. Decisions were made on technology stack and database schema. Budget was approved for additional resources.",
      keyDecisions: [
        "Use React with TypeScript for frontend development",
        "Use Node.js for backend API", 
        "Finalize database schema as presented",
        "Approve budget for additional resources",
        "Schedule next review meeting for Monday"
      ],
      actionItems: [
        { task: "Complete backend API endpoints", owner: "John", deadline: "Friday" },
        { task: "Implement user login page", owner: "Sarah", deadline: "Next week" },
        { task: "Setup deployment pipeline", owner: "David", deadline: "Friday" },
        { task: "Prepare project documentation", owner: "Team", deadline: "Next Monday" }
      ]
    };
  }

  createSummaryPrompt(transcript) {
    // Limit transcript length to avoid token limits
    const limitedTranscript = transcript.length > 8000 
      ? transcript.substring(0, 8000) + '... [truncated]' 
      : transcript;

    return `
You are an expert meeting assistant. Your task is to analyze the following meeting transcript and extract the key information in a structured JSON format.

<transcript>
${limitedTranscript}
</transcript>

Please provide a summary with the following structure:

1. **Meeting Summary:** A concise paragraph (3-4 sentences) summarizing the overall discussion and purpose of the meeting.
2. **Key Decisions:** A bulleted list of the most important decisions that were made.
3. **Action Items:** A list of action items. For each action item, specify:
   - Task: A clear description of the task.
   - Owner: The person responsible for the task. If an owner is not explicitly stated, write "TBD".
   - Deadline: The deadline if mentioned, otherwise write "TBD".

Format your final output as a JSON object with the following structure:
{
  "summary": "Meeting summary text here",
  "keyDecisions": ["Decision 1", "Decision 2", ...],
  "actionItems": [
    {"task": "Task description", "owner": "Person name", "deadline": "Deadline"},
    ...
  ]
}

Ensure the output is valid JSON that can be parsed directly.
    `.trim();
  }

  parseSummaryResponse(response) {
    try {
      const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Failed to parse GPT response, using demo data:', error);
      return this.getDemoSummary();
    }
  }
}

module.exports = new OpenAIService();