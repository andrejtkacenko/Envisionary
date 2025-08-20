
import { Telegraf, type Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { type NextRequest, NextResponse } from 'next/server';
import { telegramChat, TelegramChatInput, TelegramChatOutput } from '@/ai/flows/telegram-chat';
import { findUserByTelegramId } from '@/lib/goals-service';

// This is a map to store chat histories in memory.
// In a production app, you'd want to use a database for this.
const chatHistories = new Map<string, any[]>();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is not set in environment variables!');
  // We don't throw an error here to allow the app to build,
  // but the bot will not work.
}

const bot = new Telegraf(BOT_TOKEN);

// Function to call a Genkit tool
const callTool = async (toolRequest: any, userId: string): Promise<any> => {
  const { createGoal, findGoals } = await import('@/ai/tools/goal-tools');
  const toolName = toolRequest.name;
  const args = toolRequest.input;
  args.userId = userId;

  console.log(`[Telegram] Calling tool: ${toolName} with args:`, args);

  switch (toolName) {
    case 'createGoal':
      return await createGoal(args);
    case 'findGoals':
      return await findGoals(args);
    default:
      throw new Error(`[Telegram] Unknown tool: ${toolName}`);
  }
};


// Handler for all text messages
bot.on(message('text'), async (ctx) => {
  const telegramUserId = ctx.from.id.toString();
  const messageText = ctx.message.text;

  await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

  try {
    const user = await findUserByTelegramId(telegramUserId);
    if (!user) {
      await ctx.reply("I don't recognize you. Please link your account in the Zenith Flow web app first.");
      return;
    }

    let history = chatHistories.get(telegramUserId) || [];

    const flowInput: TelegramChatInput = {
      message: messageText,
      userId: user.uid,
      history: history,
    };
    
    let flowResult: TelegramChatOutput;
    try {
        flowResult = await telegramChat(flowInput);
    } catch (e: any) {
        console.error("[Telegram] Flow execution error:", e);
        await ctx.reply("Sorry, I had trouble processing that. Please try again.");
        return;
    }

    // Update history with the user's message
    history.push({ role: 'user', content: messageText });

    // Handle tool calls if requested
    if (flowResult.toolRequest) {
      if (flowResult.reply) {
        await ctx.reply(flowResult.reply); // Send any text response before tool call
      }
      const toolResult = await callTool(flowResult.toolRequest, user.uid);

      // We need to send the tool result back to the model for a final response
      const followUpHistory = [
          ...history,
          { role: 'assistant', content: flowResult.reply, toolRequest: flowResult.toolRequest },
          { role: 'tool', content: `Tool ${flowResult.toolRequest.name} called successfully.`, toolResult: { name: flowResult.toolRequest.name, result: toolResult } }
      ];
      
      const finalResult = await telegramChat({
          message: `Tool result for ${flowResult.toolRequest.name}: ${JSON.stringify(toolResult)}`,
          userId: user.uid,
          history: followUpHistory,
      });

      await ctx.reply(finalResult.reply);
      history.push({ role: 'assistant', content: finalResult.reply });

    } else {
      await ctx.reply(flowResult.reply);
      history.push({ role: 'assistant', content: flowResult.reply });
    }

    // Store the updated history
    chatHistories.set(telegramUserId, history);

  } catch (error: any) {
    console.error('[Telegram] Error processing message:', error);
    await ctx.reply('An unexpected error occurred. I have logged the issue.');
  }
});

// This function handles the incoming webhook requests from Telegram.
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('[Telegram] Received webhook payload:', JSON.stringify(payload, null, 2));
    await bot.handleUpdate(payload);
    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('[Telegram] Webhook POST error:', error.message);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}

// This function can be used to set the webhook (e.g., on app startup or via a specific route).
async function setupWebhook() {
  if (!BOT_TOKEN) {
    console.error('Cannot set webhook because TELEGRAM_BOT_TOKEN is not defined.');
    return;
  }
  // Vercel provides this environment variable with the deployment URL.
  // For local dev, you'd need to use a tool like ngrok and set this variable manually.
  const webhookUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/api/telegram/webhook`
    : process.env.PUBLIC_URL; // Fallback for other environments

  if (!webhookUrl) {
    console.error('Could not determine the webhook URL. Set VERCEL_URL or PUBLIC_URL.');
    return;
  }
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${webhookUrl}`);
    const result = await response.json();
    if (result.ok) {
      console.log(`[Telegram] Webhook set successfully to: ${webhookUrl}`);
    } else {
      console.error(`[Telegram] Failed to set webhook:`, result.description);
    }
  } catch (error: any) {
      console.error(`[Telegram] Error setting webhook:`, error.message);
  }
}


// Automatically set the webhook when this module is loaded (e.g., on server startup).
// This is more reliable for serverless environments.
if (process.env.NODE_ENV === 'production') {
    setupWebhook();
}


// Handle GET requests for simple diagnostics
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('setup_webhook') === 'true') {
     await setupWebhook();
     return NextResponse.json({ message: "Webhook setup attempt finished. Check server logs." });
  }
  return NextResponse.json({ message: "Bot is running. Use POST for updates." });
}
