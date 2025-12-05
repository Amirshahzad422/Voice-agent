import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { getMeetings, createMeeting, updateMeeting, deleteMeeting } from './db.js';
import { format, parseISO, isWithinInterval, addMinutes, isBefore, isAfter } from 'date-fns';
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

// Helper function to delete a meeting
async function removeMeeting(meetingId) {
  try {
    const result = await deleteMeeting(meetingId);
    if (result.error) throw result.error;
    return true;
  } catch (error) {
    console.error('Error deleting meeting:', error);
    throw error;
  }
}

// Helper function to search meetings
function searchMeetings(meetings, query) {
  const lowerQuery = query.toLowerCase();
  return meetings.filter(meeting => 
    meeting.title.toLowerCase().includes(lowerQuery) ||
    (meeting.notes && meeting.notes.toLowerCase().includes(lowerQuery))
  );
}

// Helper function to check for meeting conflicts
function checkMeetingConflict(newMeeting, existingMeetings) {
  const newStart = parseISO(newMeeting.datetime);
  const newEnd = addMinutes(newStart, newMeeting.duration_minutes);

  const conflicts = existingMeetings.filter(existing => {
    const existingStart = parseISO(existing.datetime);
    const existingEnd = addMinutes(existingStart, existing.duration_minutes);

    // Check if meetings overlap
    return (
      (isWithinInterval(newStart, { start: existingStart, end: existingEnd })) ||
      (isWithinInterval(newEnd, { start: existingStart, end: existingEnd })) ||
      (isBefore(newStart, existingStart) && isAfter(newEnd, existingEnd))
    );
  });

  return conflicts;
}

// Helper function to search meetings
function searchMeetings(meetings, query) {
  const lowerQuery = query.toLowerCase();
  return meetings.filter(meeting => 
    meeting.title.toLowerCase().includes(lowerQuery) ||
    (meeting.notes && meeting.notes.toLowerCase().includes(lowerQuery))
  );
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
4. Delete/cancel meetings by voice command
5. Search for specific meetings
6. Check for scheduling conflicts and warn users

Important rules:
- Always speak naturally and conversationally
- Ask ONE question at a time when collecting meeting details
- When confirming a meeting, summarize all details in one sentence
- When listing meetings, format them clearly with bullet points (⤷)
- Always use IST (Indian Standard Time) timezone unless user specifies otherwise
- Be concise but friendly
- If user says "yes" or confirms, proceed with the action
- If user says "no" or corrects something, ask for the correction
- ALWAYS check for conflicts before scheduling a new meeting
- If a conflict exists, inform the user and ask if they want to proceed anyway

Current conversation state will be provided to you. Use it to track what information you've collected.

When you need to:
- LIST meetings: Call the list_meetings function
- CREATE a meeting: Call the create_meeting function with all required fields (checks conflicts automatically)
- UPDATE a meeting: Call the update_meeting function with the meeting ID and new datetime
- DELETE a meeting: Call the delete_meeting function with the meeting ID or title
- SEARCH meetings: Call the search_meetings function with the search query

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
    // Check for conflicts first
    const existingMeetings = await fetchMeetingsList();
    const conflicts = checkMeetingConflict(
      { datetime, duration_minutes: parseInt(duration_minutes) },
      existingMeetings
    );

    if (conflicts.length > 0) {
      const conflictTitles = conflicts.map(m => m.title).join(', ');
      return `Warning: This meeting conflicts with: ${conflictTitles}. Would you still like to schedule it?`;
    }

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
  },
  
  delete_meeting: async ({ meetingId, meetingTitle }) => {
    const meetings = await fetchMeetingsList();
    let meeting = meetings.find(m => 
      m.id === meetingId || 
      (meetingTitle && m.title.toLowerCase().includes(meetingTitle.toLowerCase()))
    );
    
    if (!meeting) {
      return `I couldn't find that meeting. Please be more specific.`;
    }
    
    await removeMeeting(meeting.id);
    return `Meeting "${meeting.title}" has been cancelled successfully.`;
  },
  
  search_meetings: async ({ query }) => {
    const allMeetings = await fetchMeetingsList();
    const results = searchMeetings(allMeetings, query);
    
    if (results.length === 0) {
      return `No meetings found matching "${query}".`;
    }
    
    return formatMeetingsForDisplay(results);
  },

  delete_meeting: async ({ meetingId }) => {
    const meetings = await fetchMeetingsList();
    const meeting = meetings.find(m => 
      m.id === meetingId || 
      m.title.toLowerCase().includes(meetingId.toLowerCase())
    );

    if (!meeting) {
      return `I couldn't find a meeting matching "${meetingId}". Please try again.`;
    }

    await removeMeeting(meeting.id);
    return `Meeting "${meeting.title}" has been deleted successfully!`;
  },

  search_meetings: async ({ query }) => {
    const meetings = await fetchMeetingsList();
    const results = searchMeetings(meetings, query);

    if (results.length === 0) {
      return `No meetings found matching "${query}".`;
    }

    return formatMeetingsForDisplay(results);
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

      // Check if user wants to delete/cancel a meeting
      if (lowerInput.includes('delete') || lowerInput.includes('cancel') || 
          lowerInput.includes('remove')) {
        const deletePrompt = `User wants to delete/cancel a meeting. Current meetings:
${JSON.stringify(meetings, null, 2)}

User said: ${input}

Identify which meeting to delete. Respond with JSON:
{
  "action": "delete",
  "meetingId": "id or title"
}

Or ask for clarification if unclear.`;

        const deleteResponse = await llm.invoke(deletePrompt);
        const responseText = deleteResponse.content;

        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const deleteData = JSON.parse(jsonMatch[0]);
            if (deleteData.action === 'delete') {
              const result = await tools.delete_meeting({ meetingId: deleteData.meetingId });
              return {
                output: result,
                conversationState: {}
              };
            }
          }
        } catch (e) {
          // Not JSON, continue with natural response
        }

        return {
          output: responseText,
          conversationState: { collecting: 'delete' }
        };
      }

      // Check if user wants to search meetings
      if (lowerInput.includes('find') || lowerInput.includes('search') || 
          lowerInput.includes('look for')) {
        const searchPrompt = `User wants to search for meetings. 

User said: ${input}

Extract the search query from the user's input. Respond with JSON:
{
  "action": "search",
  "query": "search terms"
}`;

        const searchResponse = await llm.invoke(searchPrompt);
        const responseText = searchResponse.content;

        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const searchData = JSON.parse(jsonMatch[0]);
            if (searchData.action === 'search') {
              const result = await tools.search_meetings({ query: searchData.query });
              return {
                output: result,
                conversationState: {}
              };
            }
          }
        } catch (e) {
          // Not JSON, continue with natural response
        }

        return {
          output: responseText,
          conversationState: { collecting: 'search' }
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

