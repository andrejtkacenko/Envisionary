import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "envisionary_backend.settings")
django.setup()

from telegram.ext import Application, CommandHandler
import aiohttp
from dotenv import load_dotenv
from django.contrib.auth.models import User
from api.models import UserProfile

load_dotenv()

async def start(update, context):
    await update.message.reply_text("Добро пожаловать в Envisionary Bot! Введите /new_task <задача> для создания задачи.")

async def new_task(update, context):
    user_id = update.message.from_user.id
    try:
        user_profile = UserProfile.objects.get(telegram_id=str(user_id))
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://localhost:8000/api/tasks/",
                json={
                    "title": update.message.text.replace("/new_task ", ""),
                    "description": "",
                    "status": "todo"
                },
                headers={"Authorization": f"Bearer {user_profile.user.google_token.access_token}"},
            ) as response:
                if response.status == 201:
                    await update.message.reply_text("Задача создана!")
                else:
                    await update.message.reply_text("Ошибка при создании задачи.")
    except UserProfile.DoesNotExist:
        await update.message.reply_text("Сначала свяжите Telegram с аккаунтом Envisionary.")
    except Exception as e:
        await update.message.reply_text(f"Ошибка: {str(e)}")

def main():
    app = Application.builder().token(os.getenv("TELEGRAM_TOKEN")).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("new_task", new_task))
    app.run_polling()

if __name__ == "__main__":
    main()