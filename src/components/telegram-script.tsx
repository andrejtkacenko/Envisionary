
"use client";

import Script from "next/script";

export const TelegramScript = () => {
  return (
    <Script
      src="https://telegram.org/js/telegram-web-app.js"
      strategy="beforeInteractive"
    />
  );
};
