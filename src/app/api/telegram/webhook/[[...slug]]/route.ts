
import { Telegraf, type Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { type NextRequest, NextResponse } from 'next/server';
import { telegramChat, type TelegramChatInput, type TelegramChatOutput } from '@/ai/flows/telegram-chat';
import { findUserByTelegramId } from '@/lib/goals-service';

// This is a makeshift "session" storage. In a real production app, you'd use a database.
const chatHistories: Record<string, any[]> = {};

// Ensure the bot token is set
const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  // We don't throw an error during build time anymore.
  // Instead, we'll log an error if the token is missing at runtime.
  console.error("TELEGRAM_BOT_TOKEN is not set in environment variables");
}

const bot = new Telegraf(botToken || "dummy_token_for_init");

// --- Bot Command Handlers ---

bot.start((ctx) => {
  chatHistories[ctx.from.id] = []; // Clear history on /start
  console.log(`[Bot] /start command received from ${ctx.from.id}`);
  return ctx.reply('Welcome! I am your AI assistant. Tell me about your goals or ask me anything.');
});

bot.help((ctx) => {
  console.log(`[Bot] /help command received from ${ctx.from.id}`);
  return ctx.reply('You can send me a message, and I will try to help you manage your goals. For example: "Create a new goal to learn piano" or "What are my current goals?"');
});

// --- Main Message Handler ---

bot.on(message('text'), async (ctx) => {
  const telegramUserId = ctx.from.id.toString();
  const userText = ctx.message.text;
  console.log(`[Bot] Text message received from ${telegramUserId}: "${userText}"`);

  // Show a "typing..." indicator
  await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

  try {
    // 1. Find the user in our database by their Telegram ID
    console.log(`[Bot] Searching for user with Telegram ID: ${telegramUserId}`);
    const appUser = await findUserByTelegramId(telegramUserId);
    if (!appUser) {
      console.log(`[Bot] User not found for Telegram ID: ${telegramUserId}. Sending connection instructions.`);
      const linkCommand = `/connect ${telegramUserId}`;
      await ctx.reply(`Welcome! To get started, please link your Telegram account with the Zenith Flow app. Open the app, go to the AI Coach page, and paste the following command into the connection input field:\n\n\`${linkCommand}\`\n\nThis is a one-time step to secure your account.`);
      return;
    }
    console.log(`[Bot] Found app user: ${appUser.uid}`);

    // 2. Get chat history or start a new one
    const history = chatHistories[telegramUserId] || [];
    console.log(`[Bot] History length: ${history.length}`);

    // 3. Call the AI flow
    let aiResponse: TelegramChatOutput;
    let toolResult: any;
    
    // First call to the AI
    console.log('[Bot] Calling AI flow (first pass)...');
    aiResponse = await telegramChat({
      message: userText,
      userId: appUser.uid,
      history: history,
    });
    
    // Check if the AI requested a tool call
    if (aiResponse.toolRequest) {
      console.log(`[Bot] AI requested tool: ${aiResponse.toolRequest.name}`);
      // In a real app, you would call the actual tool function here.
      // For now, we simulate a simple response based on the tool name.
      if (aiResponse.toolRequest.name === 'createGoal') {
         toolResult = { name: 'createGoal', result: `Goal '${aiResponse.toolRequest.input.title}' created successfully.` };
      } else if (aiResponse.toolRequest.name === 'findGoals') {
         toolResult = { name: 'findGoals', result: `Found goals related to '${aiResponse.toolRequest.input.query}'` };
      } else {
         toolResult = { name: aiResponse.toolRequest.name, result: 'Tool executed successfully.' };
      }

      // Add the tool request and result to history
      history.push({ role: 'assistant', content: aiResponse.reply, toolRequest: aiResponse.toolRequest });
      history.push({ role: 'tool', content: 'Tool call result', toolResult: toolResult });
      
      // Call the AI *again* with the tool's result
      console.log('[Bot] Calling AI flow (second pass with tool result)...');
      const finalAiResponse = await telegramChat({
          message: userText, // The message might not be needed here, but keeping for context
          userId: appUser.uid,
          history: history,
      });

      aiResponse.reply = finalAiResponse.reply;

    } else {
        console.log('[Bot] No tool request from AI.');
    }

    // 4. Save history and send the final reply
    history.push({ role: 'user', content: userText });
    history.push({ role: 'assistant', content: aiResponse.reply });
    chatHistories[telegramUserId] = history;
    console.log(`[Bot] Replying to user: ${aiResponse.reply}`);
    await ctx.reply(aiResponse.reply);

  } catch (error) {
    console.error('[Bot] Error processing message:', error);
    await ctx.reply('Sorry, I encountered an error. Please try again later.');
  }
});


// --- Webhook Handlers ---

// This handler is for Vercel, which exposes the bot as a serverless function.
export async function POST(req: NextRequest) {
  console.log('[Webhook] POST request received.');
  if (!botToken) {
    console.error("[Webhook] Fatal: TELEGRAM_BOT_TOKEN is not configured.");
    // Return 200 OK even on error, so Telegram doesn't retry.
    return NextResponse.json({ status: 'ok', message: 'Bot not configured, but received.' });
  }

  try {
    const body = await req.json();
    console.log('[Webhook] Request body parsed successfully.');
    
    // IMPORTANT: Acknowledge the request immediately to avoid Telegram retries
    // And then process the update in the background.
    bot.handleUpdate(body).catch(err => console.error('[Webhook] Error handling update asynchronously:', err));
    
    console.log('[Webhook] Immediately returning 200 OK to Telegram.');
    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('[Webhook] Error in POST handler:', error);
    // Still return 200 OK.
    return NextResponse.json({ status: 'ok', message: 'Error processing, but received.' });
  }
}

// A simple GET handler to confirm the endpoint is live.
export async function GET(req: NextRequest) {
  console.log('[Webhook] GET request received. Endpoint is live.');
  return NextResponse.json({ status: "ok", message: "Bot is running. Use POST for updates." });
}
