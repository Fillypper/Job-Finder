import { config } from "./config.js";
import { Job } from "./types.js";
import {
  getSettings,
  saveSettings,
  getPeriodLabel,
  getWorkModeLabel,
  UserSettings,
} from "./settings.js";
import { getStats } from "./storage.js";

const API = `https://api.telegram.org/bot${config.telegram.botToken}`;
let lastUpdateId = 0;
let searchHandler: (() => Promise<Job[]>) | null = null;
let lastJobs: Job[] = [];

// ── Telegram API helpers ──

async function send(
  chatId: string | number,
  text: string,
  markup?: object
): Promise<void> {
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(markup ? { reply_markup: markup } : {}),
    }),
  });
}

async function editMessage(
  chatId: string | number,
  messageId: number,
  text: string,
  markup?: object
): Promise<void> {
  await fetch(`${API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(markup ? { reply_markup: markup } : {}),
    }),
  });
}

async function answerCallback(callbackId: string, text?: string): Promise<void> {
  await fetch(`${API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackId,
      text,
    }),
  });
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Menus ──

function mainMenuMarkup() {
  return {
    inline_keyboard: [
      [{ text: "🔍 Buscar Vagas", callback_data: "search" }],
      [{ text: "📋 Ver Vagas", callback_data: "list" }],
      [{ text: "⚙️ Configurar", callback_data: "config" }],
      [{ text: "📊 Status", callback_data: "status" }],
    ],
  };
}

function configMenuMarkup() {
  const s = getSettings();
  return {
    inline_keyboard: [
      [
        {
          text: `⏰ Período: ${getPeriodLabel(s.period)}`,
          callback_data: "config_period",
        },
      ],
      [
        {
          text: `🏢 Modo: ${getWorkModeLabel(s.workMode)}`,
          callback_data: "config_workmode",
        },
      ],
      [{ text: "◀️ Voltar", callback_data: "menu" }],
    ],
  };
}

function periodMenuMarkup() {
  const s = getSettings();
  const check = (p: string) => (s.period === p ? " ✅" : "");
  return {
    inline_keyboard: [
      [{ text: `24 horas${check("24h")}`, callback_data: "period_24h" }],
      [{ text: `48 horas${check("48h")}`, callback_data: "period_48h" }],
      [{ text: `7 dias${check("7d")}`, callback_data: "period_7d" }],
      [{ text: "◀️ Voltar", callback_data: "config" }],
    ],
  };
}

function workModeMenuMarkup() {
  const s = getSettings();
  const check = (m: "presencial" | "hibrido") =>
    s.workMode.includes(m) ? " ✅" : "";
  return {
    inline_keyboard: [
      [
        {
          text: `🏢 Presencial${check("presencial")}`,
          callback_data: "toggle_presencial",
        },
      ],
      [
        {
          text: `🔀 Híbrido${check("hibrido")}`,
          callback_data: "toggle_hibrido",
        },
      ],
      [{ text: "◀️ Voltar", callback_data: "config" }],
    ],
  };
}

// ── Format jobs ──

function formatJobList(jobs: Job[]): string {
  if (jobs.length === 0) return "Nenhuma vaga encontrada.";

  return jobs
    .map(
      (job, i) =>
        `<b>${i + 1}. ${escapeHtml(job.title)}</b>\n` +
        `🏢 ${escapeHtml(job.company)}\n` +
        `📍 ${escapeHtml(job.location)}\n` +
        `📌 ${job.source}${job.postedAt ? ` • ${job.postedAt}` : ""}\n` +
        `🔗 <a href="${job.url}">Aplicar</a>`
    )
    .join("\n─────────────\n");
}

// ── Handlers ──

async function handleCommand(
  chatId: string | number,
  text: string
): Promise<void> {
  const cmd = text.toLowerCase().trim();

  if (cmd === "/start" || cmd === "/menu") {
    const s = getSettings();
    await send(
      chatId,
      `🔍 <b>Job Hunter Bot</b>\n\n` +
        `📍 Grande Florianópolis\n` +
        `⏰ ${getPeriodLabel(s.period)}\n` +
        `🏢 ${getWorkModeLabel(s.workMode)}\n\n` +
        `Escolha uma opção:`,
      mainMenuMarkup()
    );
  } else if (cmd === "/vagas") {
    await handleList(chatId);
  } else if (cmd === "/buscar") {
    await handleSearch(chatId);
  } else if (cmd === "/status") {
    await handleStatus(chatId);
  } else {
    await send(
      chatId,
      "Comandos:\n/menu - Menu principal\n/buscar - Buscar vagas\n/vagas - Ver vagas\n/status - Estatísticas"
    );
  }
}

async function handleSearch(chatId: string | number): Promise<void> {
  await send(chatId, "🔍 Buscando vagas...");
  if (searchHandler) {
    const jobs = await searchHandler();
    lastJobs = jobs;
  }
}

async function handleList(chatId: string | number): Promise<void> {
  if (lastJobs.length === 0) {
    await send(
      chatId,
      "Nenhuma vaga na lista. Use /buscar primeiro.",
      mainMenuMarkup()
    );
    return;
  }

  const chunks: Job[][] = [];
  for (let i = 0; i < lastJobs.length; i += 5) {
    chunks.push(lastJobs.slice(i, i + 5));
  }

  for (let i = 0; i < chunks.length; i++) {
    const header =
      i === 0
        ? `📋 <b>${lastJobs.length} vaga${lastJobs.length > 1 ? "s" : ""}</b>\n\n`
        : "";
    await send(chatId, header + formatJobList(chunks[i]));
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

async function handleStatus(chatId: string | number): Promise<void> {
  const stats = getStats();
  const s = getSettings();
  await send(
    chatId,
    `📊 <b>Status</b>\n\n` +
      `📋 Vagas rastreadas: ${stats.seenCount}\n` +
      `🔢 Total encontradas: ${stats.totalFound}\n` +
      `🕐 Última busca: ${stats.lastRun || "nunca"}\n` +
      `⏰ Período: ${getPeriodLabel(s.period)}\n` +
      `🏢 Modo: ${getWorkModeLabel(s.workMode)}\n` +
      `🔄 Intervalo: ${config.intervalMinutes} min`,
    mainMenuMarkup()
  );
}

async function handleCallback(
  callbackId: string,
  chatId: string | number,
  messageId: number,
  data: string
): Promise<void> {
  switch (data) {
    case "menu": {
      const s = getSettings();
      await editMessage(
        chatId,
        messageId,
        `🔍 <b>Job Hunter Bot</b>\n\n` +
          `📍 Grande Florianópolis\n` +
          `⏰ ${getPeriodLabel(s.period)}\n` +
          `🏢 ${getWorkModeLabel(s.workMode)}\n\n` +
          `Escolha uma opção:`,
        mainMenuMarkup()
      );
      await answerCallback(callbackId);
      break;
    }

    case "search":
      await answerCallback(callbackId, "Buscando...");
      await handleSearch(chatId);
      break;

    case "list":
      await answerCallback(callbackId);
      await handleList(chatId);
      break;

    case "status":
      await answerCallback(callbackId);
      await handleStatus(chatId);
      break;

    case "config":
      await editMessage(
        chatId,
        messageId,
        "⚙️ <b>Configurações</b>\n\nEscolha o que ajustar:",
        configMenuMarkup()
      );
      await answerCallback(callbackId);
      break;

    case "config_period":
      await editMessage(
        chatId,
        messageId,
        "⏰ <b>Período de busca</b>\n\nVagas publicadas nas últimas:",
        periodMenuMarkup()
      );
      await answerCallback(callbackId);
      break;

    case "config_workmode":
      await editMessage(
        chatId,
        messageId,
        "🏢 <b>Modo de trabalho</b>\n\nSelecione os modos desejados:",
        workModeMenuMarkup()
      );
      await answerCallback(callbackId);
      break;

    case "period_24h":
    case "period_48h":
    case "period_7d": {
      const period = data.replace("period_", "") as UserSettings["period"];
      const s = getSettings();
      s.period = period;
      saveSettings(s);
      await editMessage(
        chatId,
        messageId,
        `⏰ <b>Período de busca</b>\n\n✅ Alterado para: ${getPeriodLabel(period)}`,
        periodMenuMarkup()
      );
      await answerCallback(callbackId, `✅ ${getPeriodLabel(period)}`);
      break;
    }

    case "toggle_presencial":
    case "toggle_hibrido": {
      const mode = data.replace("toggle_", "") as "presencial" | "hibrido";
      const s = getSettings();
      if (s.workMode.includes(mode)) {
        if (s.workMode.length > 1) {
          s.workMode = s.workMode.filter((m) => m !== mode);
        } else {
          await answerCallback(callbackId, "⚠️ Mantenha ao menos um modo!");
          return;
        }
      } else {
        s.workMode.push(mode);
      }
      saveSettings(s);
      await editMessage(
        chatId,
        messageId,
        "🏢 <b>Modo de trabalho</b>\n\nSelecione os modos desejados:",
        workModeMenuMarkup()
      );
      await answerCallback(callbackId, `✅ ${getWorkModeLabel(s.workMode)}`);
      break;
    }
  }
}

// ── Polling ──

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
  };
  callback_query?: {
    id: string;
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  };
}

async function pollOnce(): Promise<void> {
  try {
    const res = await fetch(
      `${API}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return;

    const data = (await res.json()) as { result?: TelegramUpdate[] };
    if (!data.result) return;

    for (const update of data.result) {
      lastUpdateId = update.update_id;

      if (update.message?.text) {
        await handleCommand(update.message.chat.id, update.message.text);
      }

      if (update.callback_query?.data && update.callback_query.message) {
        await handleCallback(
          update.callback_query.id,
          update.callback_query.message.chat.id,
          update.callback_query.message.message_id,
          update.callback_query.data
        );
      }
    }
  } catch {
    // network error, retry on next poll
  }
}

// ── Public API ──

export function setSearchHandler(fn: () => Promise<Job[]>): void {
  searchHandler = fn;
}

export function setLastJobs(jobs: Job[]): void {
  lastJobs = jobs;
}

export async function notifyNewJobs(jobs: Job[]): Promise<void> {
  if (jobs.length === 0) return;

  const chunks: Job[][] = [];
  for (let i = 0; i < jobs.length; i += 5) {
    chunks.push(jobs.slice(i, i + 5));
  }

  for (let i = 0; i < chunks.length; i++) {
    const header =
      i === 0
        ? `🔔 <b>${jobs.length} vaga${jobs.length > 1 ? "s" : ""} nova${jobs.length > 1 ? "s" : ""}!</b>\n\n`
        : "";
    await send(config.telegram.chatId, header + formatJobList(chunks[i]));
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

export async function sendStatus(message: string): Promise<void> {
  await send(config.telegram.chatId, message);
}

export function startPolling(): void {
  console.log("  📱 Telegram bot ativo — mande /menu pro bot");

  async function loop() {
    while (true) {
      await pollOnce();
    }
  }

  loop().catch(console.error);
}

export async function getUpdates(): Promise<
  Array<{ chat: { id: number }; text?: string }>
> {
  const res = await fetch(`${API}/getUpdates`);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    result?: Array<{ message?: { chat: { id: number }; text?: string } }>;
  };
  return (data.result || [])
    .map((r) => r.message)
    .filter(Boolean) as Array<{ chat: { id: number }; text?: string }>;
}
