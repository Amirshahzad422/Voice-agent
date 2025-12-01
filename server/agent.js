import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { getMeetings, createMeeting, updateMeeting } from './db.js';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const llm = new ChatOpenAI({
  modelName: 'gpt-4',
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY
});

// Helper function to fetch meetings list
async function fetchMeetingsList() {
  try {
    const result = await getMeetings();
    if (result.error) {
      console.error('Error fetching meetings:', result.error);
      return [];
    }
    return result.data || [];
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return [];
  }
}

// Helper function to save a meeting
async function saveMeeting(meetingData) {
  try {
    const result = await createMeeting({
      ...meetingData,
      created_at: new Date().toISOString()
    });
    if (result.error) throw result.error;
    return result.data;
  } catch (error) {
    console.error('Error creating meeting:', error);
    throw error;
  }
}

// Helper function to modify a meeting
async function modifyMeeting(meetingId, updates) {
  try {
    const result = await updateMeeting(meetingId, updates);
    if (result.error) throw result.error;
    return result.data;
  } catch (error) {
    console.error('Error updating meeting:', error);
    throw error;
  }
}

// Format meetings for display
function formatMeetingsForDisplay(meetings) {
  if (!meetings || meetings.length === 0) {
    return 'You have no upcoming meetings.';
  }

  const formatted = meetings.map((meeting, index) => {
    try {
      const date = parseISO(meeting.datetime);
      const formattedDate = formatInTimeZone(date, 'Asia/Kolkata', 'MMMM d, h:mm a zzz');
      return `⤷ ${meeting.title} – ${formattedDate} (${meeting.duration_minutes} mins)`;
    } catch (error) {
      return `⤷ ${meeting.title} – ${meeting.datetime} (${meeting.duration_minutes} mins)`;
    }
  }).join('\n');

  return `You have ${meetings.length} upcoming meeting${meetings.length > 1 ? 's' : ''}:\n${formatted}`;
}

// System prompt for the agent
const systemPrompt = `You are a helpful voice-only meeting scheduling assistant. Your name is Alex's Assistant.

Your capabilities:
1. Schedule new meetings by collecting: title, date & time (IST timezone), duration, and optional notes
2. List upcoming meetings in a natural, readable format
3. Reschedule existing meetings by identifying them and updating the datetime

Important rules:
- Always speak naturally and conversationally
- Ask ONE question at a time when collecting meeting details
- When confirming a meeting, summarize all details in one sentence
- When listing meetings, format them clearly with bullet points (⤷)
- Always use IST (Indian Standard Time) timezone unless user specifies otherwise
- Be concise but friendly
- If user says "yes" or confirms, proceed with the action
- If user says "no" or corrects something, ask for the correction

Current conversation state will be provided to you. Use it to track what information you've collected.

When you need to:
- LIST meetings: Call the list_meetings function
- CREATE a meeting: Call the create_meeting function with all required fields
- UPDATE a meeting: Call the update_meeting function with the meeting ID and new datetime

Always respond in a natural, conversational voice that sounds good when spoken aloud.`;

// Create the prompt template
const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  new MessagesPlaceholder('conversationHistory'),
  ['human', '{input}']
]);

// Create tools/functions for the agent
const tools = {
  list_meetings: async () => {
    const meetings = await fetchMeetingsList();
    return formatMeetingsForDisplay(meetings);
  },
  
  create_meeting: async ({ title, datetime, duration_minutes, notes }) => {
    const meeting = await saveMeeting({
      title,
      datetime,
      duration_minutes: parseInt(duration_minutes),
      notes: notes || null
    });
    return `Meeting "${title}" has been scheduled successfully!`;
  },
  
  update_meeting: async ({ meetingId, datetime }) => {
    const meeting = await modifyMeeting(meetingId, { datetime });
    return `Meeting "${meeting.title}" has been rescheduled successfully!`;
  }
};

// Agent chain with function calling
const agentChain = RunnableSequence.from([
  {
    input: (x) => x.input,
    conversationHistory: (x) => x.conversationHistory || []
  },
  prompt,
  llm,
  new StringOutputParser()
]);

// Main agent function
export const meetingAgent = {
  async invoke({ input, conversationHistory = [] }) {
    try {
      // Get current meetings for context
      const meetings = await fetchMeetingsList();
      const meetingsContext = meetings.length > 0 
        ? `\n\nCurrent meetings:\n${JSON.stringify(meetings, null, 2)}`
        : '\n\nNo meetings scheduled yet.';

      // Enhanced system prompt with current meetings
      const enhancedPrompt = systemPrompt + meetingsContext;

      // Check if user wants to list meetings
      const lowerInput = input.toLowerCase();
      if (lowerInput.includes('list') || lowerInput.includes('show') || 
          lowerInput.includes('what meetings') || lowerInput.includes('calendar')) {
        const meetingsList = await tools.list_meetings();
        return {
          output: meetingsList + '\n\nAnything you\'d like to reschedule?',
          conversationState: {}
        };
      }

      // Check if user wants to schedule a new meeting
      if (lowerInput.includes('schedule') || lowerInput.includes('set up') || 
          lowerInput.includes('create') || lowerInput.includes('new meeting')) {
        // Use LLM to extract meeting details from conversation
        const extractionPrompt = `Based on the conversation history and current input, extract meeting details.
If information is missing, ask for it one piece at a time.

Conversation history:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Current input: ${input}

Respond with JSON if all details are present:
{
  "action": "create",
  "title": "...",
  "datetime": "ISO format with IST timezone",
  "duration_minutes": number,
  "notes": "..."
}

Or respond naturally asking for missing information.`;

        const extractionResponse = await llm.invoke(extractionPrompt);
        const responseText = extractionResponse.content;

        // Try to parse JSON response
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const meetingData = JSON.parse(jsonMatch[0]);
            if (meetingData.action === 'create' && meetingData.title && 
                meetingData.datetime && meetingData.duration_minutes) {
              await tools.create_meeting(meetingData);
              return {
                output: `Meeting "${meetingData.title}" has been scheduled successfully!`,
                conversationState: {}
              };
            }
          }
        } catch (e) {
          // Not JSON, continue with natural response
        }

        // If not complete, return the LLM's natural response
        return {
          output: responseText,
          conversationState: { collecting: 'meeting' }
        };
      }

      // Check if user wants to reschedule
      if (lowerInput.includes('reschedule') || lowerInput.includes('move') || 
          lowerInput.includes('change') || lowerInput.includes('delay')) {
        // Find the meeting and update it
        const reschedulePrompt = `User wants to reschedule a meeting. Current meetings:
${JSON.stringify(meetings, null, 2)}

User said: ${input}

Identify which meeting and what the new datetime should be. Respond with JSON:
{
  "action": "update",
  "meetingId": "id or title",
  "newDatetime": "ISO format with IST timezone"
}

Or ask for clarification if unclear.`;

        const rescheduleResponse = await llm.invoke(reschedulePrompt);
        const responseText = rescheduleResponse.content;

        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const updateData = JSON.parse(jsonMatch[0]);
            if (updateData.action === 'update') {
              // Find meeting by ID or title
              let meeting = meetings.find(m => 
                m.id === updateData.meetingId || 
                m.title.toLowerCase().includes(updateData.meetingId.toLowerCase())
              );

              if (meeting) {
                await tools.update_meeting({
                  meetingId: meeting.id,
                  datetime: updateData.newDatetime
                });
                return {
                  output: `Meeting "${meeting.title}" has been rescheduled successfully!`,
                  conversationState: {}
                };
              }
            }
          }
        } catch (e) {
          // Not JSON, continue with natural response
        }

        return {
          output: responseText,
          conversationState: { collecting: 'reschedule' }
        };
      }

      // General conversation - use LLM
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role === 'user' ? 'human' : 'assistant',
          content: msg.content
        })),
        { role: 'human', content: input }
      ];

      const response = await agentChain.invoke({
        input: input + meetingsContext,
        conversationHistory: messages
      });

      return {
        output: response,
        conversationState: {}
      };
    } catch (error) {
      console.error('Agent error:', error);
      return {
        output: 'I apologize, but I encountered an error. Could you please try again?',
        conversationState: {}
      };
    }
  }
};

