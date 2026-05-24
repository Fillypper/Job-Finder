import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { config } from "./config.js";
import { Job } from "./types.js";

interface StorageData {
  seenIds: string[];
  lastRun?: string;
  totalFound: number;
}

const STORAGE_PATH = `${config.dataDir}/seen-jobs.json`;

function ensureDir(): void {
  if (!existsSync(config.dataDir)) {
    mkdirSync(config.dataDir, { recursive: true });
  }
}

function load(): StorageData {
  ensureDir();
  try {
    const raw = readFileSync(STORAGE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { seenIds: [], totalFound: 0 };
  }
}

function save(data: StorageData): void {
  ensureDir();
  writeFileSync(STORAGE_PATH, JSON.stringify(data, null, 2));
}

export function filterNewJobs(jobs: Job[]): Job[] {
  const data = load();
  const seenSet = new Set(data.seenIds);
  return jobs.filter((job) => !seenSet.has(job.id));
}

export function markAsSeen(jobs: Job[]): void {
  const data = load();
  const seenSet = new Set(data.seenIds);

  for (const job of jobs) {
    seenSet.add(job.id);
  }

  // keep only last 5000 IDs to avoid unbounded growth
  const allIds = Array.from(seenSet);
  data.seenIds = allIds.slice(-5000);
  data.lastRun = new Date().toISOString();
  data.totalFound = data.totalFound + jobs.length;
  save(data);
}

export function getStats(): { seenCount: number; lastRun?: string; totalFound: number } {
  const data = load();
  return {
    seenCount: data.seenIds.length,
    lastRun: data.lastRun,
    totalFound: data.totalFound,
  };
}
