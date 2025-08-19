
import { NextRequest, NextResponse } from 'next/server';
import { telegramChat } from '@/ai/flows/telegram-chat';
import { createGoal, findGoals } from '@/ai/tools/goal-tools';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// Function to send a message back to the user
async function sendMessage(chatId: number, text: string) {
  if (!text) return; // Don't send empty messages
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
        return NextResponse.json({ status: 'ok' });
    }
    
    try {
        // Send a "typing..." action to give user feedback
        await fetch(`${TELEGRAM_API_URL}/sendChatAction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
        });
        
        // Let's simplify and not use history for now for more reliability.
        // We will just send the last message.
        
        let aiResponse = await telegramChat({ message: text, userId: userId });

        // This loop is for a more advanced agent that might need multiple tool calls.
        // For now, it will likely run once or not at all.
        while (aiResponse.toolRequest) {
            const toolRequest = aiResponse.toolRequest;
            
            // It's often good practice to let the user know what the bot is doing.
            // await sendMessage(chatId, `Running tool: ${toolRequest.name}...`);

            const toolResult = await callTool(toolRequest, userId);
            
            // To continue the conversation, we'd need to send the tool result back to the AI.
            // This requires history support, which we've simplified for now.
            // For a single tool call, we can just format the result and send it.
            
            // If the tool call itself returns a string, we can send it directly.
            if (typeof toolResult === 'string') {
                 await sendMessage(chatId, toolResult);
                 return NextResponse.json({ status: 'ok' });
            }
            // If the tool returns an object, we might want to format it.
            // Example: A new goal was created.
            if (toolRequest.name === 'createGoal' && toolResult.id) {
                await sendMessage(chatId, `✅ Goal created: "${toolResult.title}"`);
                return NextResponse.json({ status: 'ok' });
            }
            
            // If we get here, the tool call logic needs to be expanded.
            // For now, we'll just send the AI's initial text if any.
            await sendMessage(chatId, aiResponse.reply || "I've processed your request.");
            return NextResponse.json({ status: 'ok' });
        }
        
        // Send the final reply back to the user
        await sendMessage(chatId, aiResponse.reply);

    } catch (e: any) {
        console.error("Error processing message with AI:", e);
        await sendMessage(chatId, "Sorry, I encountered an error. Please try again later.");
    }
    
    // Respond to Telegram to acknowledge receipt of the update
    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
