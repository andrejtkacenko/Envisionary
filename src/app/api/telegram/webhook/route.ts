
import { NextRequest, NextResponse } from 'next/server';
import { telegramChat } from '@/ai/flows/telegram-chat';
import { createGoal, findGoals } from '@/ai/tools/goal-tools';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// A simple in-memory store for chat history.
// In a production app, you'd want to use a database like Firestore or Redis.
const chatHistories: Record<string, any[]> = {};

// Function to send a message back to the user
async function sendMessage(chatId: number, text: string) {
  if (!text) return; // Don't send empty messages
  const url = `${TELEGRAM_API_URL}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
      }),
    });
    const data = await response.json();
    if (!data.ok) {
        console.error('Error sending message:', data.description);
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}

async function callTool(toolRequest: any, userId: string): Promise<any> {
    const toolName = toolRequest.name;
    const args = toolRequest.input;
    args.userId = userId; // Ensure userId is passed to tools

    switch (toolName) {
        case 'createGoal':
            return await createGoal(args);
        case 'findGoals':
             const goals = await findGoals(args);
             // Format the output for better display in chat
             if (goals.length === 0) return "No goals found matching that query.";
             return `Found goals:\n${goals.map(g => `- ${g.title} (ID: ${g.id})`).join('\n')}`;
        default:
            throw new Error(`Unknown tool: ${toolName}`);
    }
};

export async function POST(req: NextRequest) {
  if (!TELEGRAM_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not set.");
    return NextResponse.json({ error: "Bot not configured." }, { status: 500 });
  }

  try {
    const body = await req.json();
    console.log('Received Telegram update:', JSON.stringify(body, null, 2));

    const message = body.message || body.edited_message;

    if (!message || !message.text) {
        console.log("Received a non-message update, ignoring.");
        return NextResponse.json({ status: 'ok' });
    }
    
    const chatId = message.chat.id;
    const text = message.text;
    const userId = message.from.id.toString();

    // Get or initialize chat history
    if (!chatHistories[userId]) {
      chatHistories[userId] = [];
    }
    const userHistory = chatHistories[userId];
    
    // Process the message asynchronously to avoid blocking the response.
    // A more robust solution would use a queueing system (e.g., Cloud Tasks).
    const processMessage = async () => {
      try {
        // Send a "typing..." action to give user feedback
        await fetch(`${TELEGRAM_API_URL}/sendChatAction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
        });
        
        userHistory.push({ role: 'user', content: [{ text }] });

        // 1. Initial call to the AI
        let aiResponse = await telegramChat({ message: text, userId: userId, history: userHistory });

        // 2. Handle tool calls if any
        while (aiResponse.toolRequest) {
          const toolRequest = aiResponse.toolRequest;
            // Add assistant's partial response and tool request to history
          userHistory.push({ role: 'model', content: [{ text: aiResponse.reply }, { toolRequest }] });

          const toolResult = await callTool(toolRequest, userId);
          const toolResultMessage = { role: 'tool', content: [{ toolResult: { name: toolRequest.name, result: toolResult } }] };
          userHistory.push(toolResultMessage);
          
          // Send the tool result back to the model for a final response
          aiResponse = await telegramChat({ message: "", userId, history: userHistory });
        }
        
        // Add final AI response to history
        userHistory.push({ role: 'model', content: [{ text: aiResponse.reply }] });

        // 3. Send the final reply back to the user
        await sendMessage(chatId, aiResponse.reply);

      } catch (e: any) {
          console.error("Error processing message with AI:", e);
          await sendMessage(chatId, "Sorry, I encountered an error. Please try again later.");
      }
    };

    // Fire-and-forget the message processing
    processMessage();
    
    // Respond to Telegram immediately to acknowledge receipt of the update
    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
