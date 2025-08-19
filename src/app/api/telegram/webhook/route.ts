
import { NextRequest, NextResponse } from 'next/server';
import { telegramChat, TelegramChatInput, TelegramChatOutput } from '@/ai/flows/telegram-chat';
import { createGoal, findGoals } from '@/ai/tools/goal-tools';
import { findUserByTelegramId } from '@/lib/goals-service';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// This represents a very simple in-memory store for chat histories.
// In a production app, you'd want to use a database like Firestore or Redis.
const chatHistories: Record<string, any[]> = {};


// Function to send a message back to the user
async function sendMessage(chatId: number, text: string) {
  // Prevent sending empty messages
  if (!text || !text.trim()) {
    console.log("Aborted sending empty message.");
    return; 
  }
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
    }
  } catch (error) {
    console.error('Failed to send message via fetch:', error);
  }
}

// Function to call the appropriate tool based on the model's request
async function callTool(toolRequest: any, userId: string): Promise<any> {
    const toolName = toolRequest.name;
    const args = toolRequest.input;
    args.userId = userId;

    console.log(`Attempting to call tool: ${toolName} with args:`, args);

    switch (toolName) {
        case 'createGoal':
            return await createGoal(args);
        case 'findGoals':
            return await findGoals(args);
        default:
            console.error(`Unknown tool requested: ${toolName}`);
            throw new Error(`Unknown tool: ${toolName}`);
    }
}

export async function POST(req: NextRequest) {
  console.log("Received a request on /api/telegram/webhook");
  if (!TELEGRAM_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not set.");
    // Do not send a message here, as we can't authenticate.
    return NextResponse.json({ error: "Bot not configured." }, { status: 500 });
  }

  try {
    const body = await req.json();
    console.log('Parsed request body:', JSON.stringify(body, null, 2));

    const message = body.message || body.edited_message;

    if (!message || !message.text) {
        console.log("Update is not a message with text. Ignoring.");
        return NextResponse.json({ status: 'ok' });
    }
    
    const chatId = message.chat.id;
    const telegramId = message.from.id.toString();
    const userText = message.text;

    // Special case for the /start command
    if (userText === '/start') {
        chatHistories[telegramId] = []; // Clear history
        await sendMessage(chatId, "Welcome to Zenith Flow! Please link your account on the website to start managing your goals.");
        return NextResponse.json({ status: 'ok' });
    }
    
    // Find the app user associated with this Telegram ID
    const appUser = await findUserByTelegramId(telegramId);
    
    if (!appUser) {
        await sendMessage(chatId, `Please link your account first. Open the Zenith Flow app and enter this command in your profile: /connect ${telegramId}`);
        return NextResponse.json({ status: 'ok' });
    }

    // Retrieve or initialize chat history
    const history = chatHistories[telegramId] || [];

    const input: TelegramChatInput = {
      message: userText,
      userId: appUser.uid,
      history: history,
    };
    
    let aiResponse = await telegramChat(input);

    // If the AI wants to call a tool
    if (aiResponse.toolRequest) {
        console.log("AI requested a tool:", aiResponse.toolRequest.name);
        
        // Add the model's message and tool request to history
        history.push({ role: 'assistant', content: aiResponse.reply, toolRequest: aiResponse.toolRequest });
        
        const toolResult = await callTool(aiResponse.toolRequest, appUser.uid);
        console.log("Tool execution result:", toolResult);

        // Add the tool result to history
        history.push({ role: 'tool', content: `Result for ${aiResponse.toolRequest.name}`, toolResult: { name: aiResponse.toolRequest.name, result: toolResult } });

        // Call the AI again with the updated history including the tool result
        const secondInput: TelegramChatInput = {
            message: "Okay, what now?", // The message here is less important than the history
            userId: appUser.uid,
            history: history,
        };
        aiResponse = await telegramChat(secondInput);
    }
    
    // Add the final AI response to history
    history.push({ role: 'assistant', content: aiResponse.reply });
    chatHistories[telegramId] = history; // Save updated history

    // Send the final response to the user
    await sendMessage(chatId, aiResponse.reply);
    
    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('Error in POST handler:', error);
    // Avoid sending a message back on failure to prevent loops
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
