
import { NextRequest, NextResponse } from 'next/server';
import { telegramChat, TelegramChatInput, TelegramChatOutput } from '@/ai/flows/telegram-chat';
import { createGoal, findGoals } from '@/ai/tools/goal-tools';
import { findUserByTelegramId } from '@/lib/goals-service';

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
  if (!text || !text.trim()) {
    console.log("DEBUG: Attempted to send an empty or whitespace message. Aborting.");
    return; 
  }
  const url = `${TELEGRAM_API_URL}/sendMessage`;
  console.log(`DEBUG: Sending message to chat ID ${chatId}: "${text}"`);
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
        console.error('DEBUG: Error sending message:', data.description);
    } else {
        console.log('DEBUG: Message sent successfully.');
    }
  } catch (error) {
    console.error('DEBUG: Failed to send message via fetch:', error);
  }
}

async function callTool(toolRequest: any, userId: string): Promise<any> {
    const toolName = toolRequest.name;
    const args = toolRequest.input;
    args.userId = userId; // Ensure userId is passed to tools

    console.log(`DEBUG: [Tool Call] Attempting to execute: ${toolName} with args:`, args);

    try {
        let result;
        switch (toolName) {
            case 'createGoal':
                result = await createGoal(args);
                console.log('DEBUG: [Tool Result] createGoal returned:', result);
                return result;
            case 'findGoals':
                const goals = await findGoals(args);
                 if (goals.length === 0) {
                    console.log('DEBUG: [Tool Result] findGoals returned no goals.');
                    return "No goals found matching that query.";
                }
                const goalsText = `Found goals:\n${goals.map(g => `- ${g.title} (ID: ${g.id})`).join('\n')}`;
                console.log('DEBUG: [Tool Result] findGoals returned:', goalsText);
                return goalsText;
            default:
                console.warn(`DEBUG: Unknown tool requested: ${toolName}`);
                throw new Error(`Unknown tool: ${toolName}`);
        }
    } catch(e) {
        console.error(`DEBUG: [Tool Error] Error executing ${toolName}:`, e);
        return `Error: Could not execute tool ${toolName}.`;
    }
};

export async function POST(req: NextRequest) {
  console.log("DEBUG: Received a request on /api/telegram/webhook");
  if (!TELEGRAM_TOKEN) {
    console.error("DEBUG: TELEGRAM_BOT_TOKEN is not set. Aborting.");
    return NextResponse.json({ error: "Bot not configured." }, { status: 500 });
  }

  try {
    const body = await req.json();
    console.log('DEBUG: Parsed request body:', JSON.stringify(body, null, 2));

    const message = body.message || body.edited_message;

    if (!message || !message.text) {
        console.log("DEBUG: Update is not a message with text. Ignoring.");
        return NextResponse.json({ status: 'ok' });
    }
    
    const chatId = message.chat.id;
    const text = message.text;
    const telegramId = message.from.id.toString();
    console.log(`DEBUG: Processing message from chat ID ${chatId} (Telegram ID: ${telegramId})`);

    // Try to find the app user associated with this telegram ID
    console.log(`DEBUG: Searching for user with Telegram ID: ${telegramId}`);
    const zenithFlowUser = await findUserByTelegramId(telegramId);
    
    if (!zenithFlowUser) {
        console.log(`DEBUG: User with Telegram ID ${telegramId} not found in DB.`);
        const connectMessage = `Hello! To use this bot, you need to connect your Telegram account to your Zenith Flow account.\n\n1. Go to your Zenith Flow profile on the web app.\n2. Find the "Connect to Telegram" section.\n3. Enter the following command there: /connect ${telegramId}\n\nOnce connected, you'll be able to manage your goals from here.`;
        await sendMessage(chatId, connectMessage);
        return NextResponse.json({ status: 'ok' });
    }
    
    const userId = zenithFlowUser.uid; 
    console.log(`DEBUG: Found user. App User ID: ${userId}`);


    // Handle the /start command separately
    if (text === '/start') {
        const welcomeMessage = "Hello! I'm your AI assistant, Zenith Flow. I can help you manage your goals. Try asking me to 'create a new goal' or 'show me my current tasks'.";
        await sendMessage(chatId, welcomeMessage);
        chatHistories[userId] = []; // Clear history on start
        console.log(`DEBUG: Handled /start command for user ${userId}. History cleared.`);
        return NextResponse.json({ status: 'ok' });
    }

    // Send a "typing..." action to give user feedback
    await fetch(`${TELEGRAM_API_URL}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    });
    
    try {
        if (!chatHistories[userId]) {
            chatHistories[userId] = [];
        }
        const userHistory = chatHistories[userId];

        // Add current user message to history
        userHistory.push({ role: 'user', content: text });
        console.log(`DEBUG: Added user message to history. History length: ${userHistory.length}`);
        
        let loopCount = 0; // Safety break
        let currentMessageForAI = text;

        while (loopCount < 5) {
            loopCount++;
            console.log(`DEBUG: Loop ${loopCount}. Calling AI...`);
            
            const aiResponse: TelegramChatOutput = await telegramChat({ 
                message: currentMessageForAI, 
                userId: userId,
                history: userHistory, 
            });
            
            console.log("DEBUG: AI responded with:", JSON.stringify(aiResponse));

            if (aiResponse.reply) {
                 // Add AI's text response to history before tool request
                 userHistory.push({ role: 'assistant', content: aiResponse.reply, toolRequest: aiResponse.toolRequest });
                 console.log(`DEBUG: Added assistant response to history. History length: ${userHistory.length}`);
            } else if (aiResponse.toolRequest) {
                // Handle cases where model asks for tool without text
                userHistory.push({ role: 'assistant', content: "", toolRequest: aiResponse.toolRequest });
                console.log(`DEBUG: Added assistant tool request (no text) to history. History length: ${userHistory.length}`);
            }

            if (aiResponse.toolRequest) {
                console.log("[DEBUG] Tool requested:", aiResponse.toolRequest.name);
                const toolResult = await callTool(aiResponse.toolRequest, userId);
                const toolResultContent = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);
                
                // Add tool result to history
                userHistory.push({ role: 'tool', content: toolResultContent, toolResult: { name: aiResponse.toolRequest.name, result: toolResult } });
                console.log(`DEBUG: Added tool result to history. History length: ${userHistory.length}`);
                
                // The message for the next AI loop is the result of the tool
                currentMessageForAI = toolResultContent; 
                // Continue loop
            } else {
                console.log("[DEBUG] No tool requested. This is the final response.");
                await sendMessage(chatId, aiResponse.reply);
                break; // Exit loop
            }
        }
         if (loopCount >= 5) {
            console.warn("DEBUG: Max loop count reached. Exiting.");
            await sendMessage(chatId, "Sorry, something went wrong while processing your request.");
        }

    } catch (e: any) {
        console.error("DEBUG: Error in main processing loop:", e);
        await sendMessage(chatId, "Sorry, I encountered an error. Please try again later.");
    }
    
    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('DEBUG: Top-level error in POST handler:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
