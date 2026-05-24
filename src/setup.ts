import "dotenv/config";
import { getUpdates } from "./telegram.js";

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.log("❌ TELEGRAM_BOT_TOKEN não configurado no .env");
    console.log("");
    console.log("Passos:");
    console.log("1. Abra o Telegram e busque @BotFather");
    console.log("2. Envie /newbot e siga as instruções");
    console.log("3. Copie o token e cole no arquivo .env");
    console.log("4. Rode este script novamente: npm run setup");
    process.exit(1);
  }

  console.log("✅ Token configurado!");
  console.log("");
  console.log("Agora mande qualquer mensagem pro seu bot no Telegram...");
  console.log("Esperando mensagem...");
  console.log("");

  for (let i = 0; i < 60; i++) {
    const messages = await getUpdates();

    if (messages.length > 0) {
      const chatId = messages[messages.length - 1].chat.id;
      console.log("─────────────────────────────────");
      console.log(`✅ Seu CHAT ID: ${chatId}`);
      console.log("─────────────────────────────────");
      console.log("");
      console.log(`Cole no .env: TELEGRAM_CHAT_ID=${chatId}`);
      console.log("");
      console.log("Depois rode: npm run dev");
      process.exit(0);
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("⏰ Timeout. Mande uma mensagem pro bot e rode novamente.");
}

main();
