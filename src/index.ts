import cron from "node-cron";
import { config } from "./config.js";
import { linkedInScraper } from "./scrapers/linkedin.js";
import { gupyScraper } from "./scrapers/gupy.js";
import {
  notifyNewJobs,
  sendStatus,
  setSearchHandler,
  setLastJobs,
  startPolling,
} from "./telegram.js";
import { filterNewJobs, markAsSeen, getStats } from "./storage.js";
import { getSettings, getPeriodSeconds, getPeriodLabel, getWorkModeLabel } from "./settings.js";
import { Scraper, Job, SearchParams } from "./types.js";

const scrapers: Scraper[] = [linkedInScraper, gupyScraper];
const isOnce = process.argv.includes("--once");
const isList = process.argv.includes("--list");
const hasTelegram = Boolean(config.telegram.botToken && config.telegram.chatId);

function isInRegion(job: Job): boolean {
  const loc = job.location.toLowerCase();
  return config.search.allowedCities.some((city) => loc.includes(city));
}

function isRemote(job: Job): boolean {
  const text = `${job.title} ${job.location}`.toLowerCase();
  return config.search.remoteKeywords.some((kw) => text.includes(kw));
}

function isRelevant(job: Job, workModes: ("presencial" | "hibrido")[]): boolean {
  if (!isInRegion(job)) return false;

  if (isRemote(job)) return false;

  const text = `${job.title} ${job.location}`.toLowerCase();
  const hasLevel = config.search.levels.some((l) => text.includes(l));
  const isBroad =
    text.includes("desenvolvedor") ||
    text.includes("developer") ||
    text.includes("engenheiro") ||
    text.includes("programador");
  return hasLevel || isBroad;
}

function printJobs(jobs: Job[]): void {
  jobs.forEach((j, i) => {
    console.log(`\n  [${i + 1}] ${j.title}`);
    console.log(`      🏢 ${j.company}`);
    console.log(`      📍 ${j.location}`);
    console.log(`      📌 ${j.source}${j.postedAt ? ` • ${j.postedAt}` : ""}`);
    console.log(`      🔗 ${j.url}`);
  });
  console.log("");
}

async function runSearch(): Promise<Job[]> {
  const settings = getSettings();
  const params: SearchParams = {
    periodSeconds: getPeriodSeconds(settings.period),
    workModes: settings.workMode,
  };

  const timestamp = new Date().toLocaleString("pt-BR");
  console.log(`\n[${timestamp}] Buscando vagas...`);
  console.log(`  ⏰ ${getPeriodLabel(settings.period)} | 🏢 ${getWorkModeLabel(settings.workMode)}`);

  const allJobs: Job[] = [];

  for (const scraper of scrapers) {
    try {
      console.log(`  → ${scraper.name}...`);
      const jobs = await scraper.search(params);
      console.log(`    ${jobs.length} vagas encontradas`);
      allJobs.push(...jobs);
    } catch (err) {
      console.log(`    ⚠ ${scraper.name} falhou: ${err}`);
    }
  }

  const relevant = allJobs.filter((j) => isRelevant(j, settings.workMode));
  const newJobs = filterNewJobs(relevant);

  console.log(
    `  Total: ${allJobs.length} | Relevantes: ${relevant.length} | Novas: ${newJobs.length}`
  );

  setLastJobs(relevant);

  if (isList) {
    console.log(`\n  === Todas as vagas relevantes ===`);
    printJobs(relevant);
    return relevant;
  }

  if (newJobs.length > 0) {
    markAsSeen(newJobs);
    printJobs(newJobs);
    if (hasTelegram) {
      try {
        await notifyNewJobs(newJobs);
        console.log(`  ✅ Enviadas pro Telegram!`);
      } catch (err) {
        console.log(`  ⚠ Telegram falhou: ${err}`);
      }
    }
  } else {
    console.log("  Nenhuma vaga nova desta vez.");
  }

  return relevant;
}

async function main(): Promise<void> {
  const settings = getSettings();

  console.log("╔══════════════════════════════════════╗");
  console.log("║       🔍 JOB HUNTER BOT             ║");
  console.log("╚══════════════════════════════════════╝");
  console.log("");
  console.log(`📍 Região: Palhoça / Grande Florianópolis`);
  console.log(`🎯 Keywords: JavaScript, TypeScript, Node.js`);
  console.log(`📊 Níveis: Júnior, Estágio, Trainee`);
  console.log(`⏰ Período: ${getPeriodLabel(settings.period)}`);
  console.log(`🏢 Modo: ${getWorkModeLabel(settings.workMode)}`);

  if (!hasTelegram) {
    console.log("");
    console.log("⚠ Telegram não configurado. Rode 'npm run setup'.");
  }

  const stats = getStats();
  if (stats.lastRun) {
    console.log(`\nÚltima busca: ${stats.lastRun}`);
    console.log(`Total de vagas já encontradas: ${stats.totalFound}`);
  }

  if (isOnce) {
    console.log("\nModo: busca única");
    await runSearch();
    return;
  }

  // Register search handler for Telegram bot commands
  setSearchHandler(runSearch);

  console.log(`\nModo: monitoramento contínuo (a cada ${config.intervalMinutes} min)`);

  await runSearch();

  const cronExpr = `*/${config.intervalMinutes} * * * *`;
  cron.schedule(cronExpr, runSearch);

  if (hasTelegram) {
    startPolling();
    await sendStatus(
      `✅ <b>Job Hunter Bot iniciado!</b>\n\n` +
        `🔄 Buscando a cada ${config.intervalMinutes} min\n` +
        `📍 Grande Florianópolis\n` +
        `⏰ ${getPeriodLabel(settings.period)}\n` +
        `🏢 ${getWorkModeLabel(settings.workMode)}\n\n` +
        `Mande /menu pra ver as opções.`
    );
  }

  console.log(`\n⏳ Próxima busca em ${config.intervalMinutes} min...`);
  console.log(`📱 Controle o bot pelo Telegram — mande /menu\n`);
}

main().catch(console.error);
