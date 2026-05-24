import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { config } from "./config.js";

export interface UserSettings {
  period: "24h" | "48h" | "7d";
  workMode: ("presencial" | "hibrido")[];
}

const SETTINGS_PATH = `${config.dataDir}/settings.json`;

const defaults: UserSettings = {
  period: "24h",
  workMode: ["presencial", "hibrido"],
};

function ensureDir(): void {
  if (!existsSync(config.dataDir)) {
    mkdirSync(config.dataDir, { recursive: true });
  }
}

export function getSettings(): UserSettings {
  ensureDir();
  try {
    return { ...defaults, ...JSON.parse(readFileSync(SETTINGS_PATH, "utf-8")) };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(settings: UserSettings): void {
  ensureDir();
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export function getPeriodSeconds(period: UserSettings["period"]): number {
  switch (period) {
    case "24h":
      return 86400;
    case "48h":
      return 172800;
    case "7d":
      return 604800;
  }
}

export function getPeriodLabel(period: UserSettings["period"]): string {
  switch (period) {
    case "24h":
      return "Últimas 24 horas";
    case "48h":
      return "Últimas 48 horas";
    case "7d":
      return "Últimos 7 dias";
  }
}

export function getWorkModeLabel(modes: ("presencial" | "hibrido")[]): string {
  if (modes.length === 0) return "Nenhum (adicione ao menos um!)";
  return modes.map((m) => (m === "presencial" ? "Presencial" : "Híbrido")).join(" + ");
}
