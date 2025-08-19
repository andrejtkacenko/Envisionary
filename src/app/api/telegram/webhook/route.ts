
import { NextRequest, NextResponse } from 'next/server';
import { telegramChat, TelegramChatInput, TelegramChatOutput } from '@/ai/flows/telegram-chat';
import { createGoal, findGoals } from '@/ai/tools/goal-tools';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

type ChatMessage = {
    role: 'user' | 'assistant' | 'tool';
    content: string;
    toolRequest?: any;
    toolResult?: any;
};

// This is a simplistic in-memory store. In a real app, use a database like Firestore.
const chatHistories: Record<string, ChatMessage[]> = {};


// Function to send a message back to the user
async function sendMessage(chatId: number, text: string) {
  if (!text.trim()) return; 
  const url = `${TELEGRAM_API_URL}/sendMessage`;
  console.log(`Sending message to chat ID ${chatId}: "${text}"`);
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
    } else {
        console.log('Message sent successfully.');
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}

async function callTool(toolRequest: any, userId: string): Promise<any> {
    const toolName = toolRequest.name;
    const args = toolRequest.input;
    args.userId = userId; // Ensure userId is passed to tools

    console.log(`Calling tool: ${toolName} with args:`, args);

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

    // Handle the /start command
    if (text === '/start') {
        const welcomeMessage = "Hello! I'm your AI assistant, Zenith Flow. I can help you manage your goals. Try asking me to 'create a new goal' or 'show me my current tasks'.";
        await sendMessage(chatId, welcomeMessage);
        chatHistories[userId] = []; // Clear history on start
        return NextResponse.json({ status: 'ok' });
    }

    // Send a "typing..." action to give user feedback
    await fetch(`${TELEGRAM_API_URL}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    });
    
    try {
        const userHistory = chatHistories[userId] || [];
        userHistory.push({ role: 'user', content: text });

        let aiResponse: TelegramChatOutput;

        // Loop to handle potential tool calls
        while (true) {
            aiResponse = await telegramChat({ 
                message: text, 
                userId: userId,
                history: userHistory,
            });

            if (aiResponse.toolRequest) {
                // If the model wants to call a tool
                userHistory.push({ role: 'assistant', content: aiResponse.reply, toolRequest: aiResponse.toolRequest });
                const toolResult = await callTool(aiResponse.toolRequest, userId);
                userHistory.push({ role: 'tool', content: "Tool result", toolResult: { name: aiResponse.toolRequest.name, result: toolResult } });
                // We don't send anything here, we loop back to the model with the tool result
            } else {
                // If the model is done, send the final response and break the loop
                userHistory.push({ role: 'assistant', content: aiResponse.reply });
                await sendMessage(chatId, aiResponse.reply);
                break;
            }
        }

        chatHistories[userId] = userHistory;

    } catch (e: any) {
        console.error("Error processing message with AI:", e);
        await sendMessage(chatId, "Sorry, I encountered an error. Please try again later.");
    }
    
    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
