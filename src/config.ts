import "dotenv/config";

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: process.env.TELEGRAM_CHAT_ID || "",
  },

  search: {
    keywords: [
      "desenvolvedor javascript",
      "desenvolvedor typescript",
      "desenvolvedor node",
      "desenvolvedor frontend",
      "desenvolvedor fullstack",
      "developer junior javascript",
    ],
    locations: ["Florianópolis, Santa Catarina, Brasil"],
    allowedCities: [
      "florianópolis",
      "florianopolis",
      "palhoça",
      "palhoca",
      "são josé",
      "sao jose",
      "biguaçu",
      "biguacu",
      "santo amaro da imperatriz",
      "santo amaro",
      "governador celso ramos",
      "antônio carlos",
      "antonio carlos",
    ],
    remoteKeywords: [
      "remoto",
      "remote",
      "remote work",
      "trabalho remoto",
      "home office",
      "anywhere",
    ],
    levels: [
      "junior",
      "júnior",
      "estágio",
      "estagiário",
      "trainee",
      "entry level",
      "auxiliar",
    ],
  },

  intervalMinutes: Number(process.env.SEARCH_INTERVAL) || 30,
  dataDir: "./data",
};
