import { Job, Scraper, SearchParams } from "../types.js";
import { config } from "../config.js";

const BASE_URL = "https://portal.api.gupy.io/api/job";

interface GupyJob {
  id: number;
  name: string;
  companyName?: string;
  careerPageName?: string;
  city?: string;
  state?: string;
  isRemoteWork?: boolean;
  jobUrl?: string;
  publishedDate?: string;
  careerPageUrl?: string;
  workplaceType?: string;
}

interface GupyResponse {
  data?: GupyJob[];
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function matchesWorkMode(
  job: GupyJob,
  modes: SearchParams["workModes"]
): boolean {
  if (job.isRemoteWork && !modes.includes("hibrido")) return false;
  if (job.isRemoteWork === false) return modes.includes("presencial");
  return true;
}

function isWithinPeriod(publishedDate: string | undefined, periodSeconds: number): boolean {
  if (!publishedDate) return true;
  const published = new Date(publishedDate).getTime();
  const cutoff = Date.now() - periodSeconds * 1000;
  return published >= cutoff;
}

async function fetchGupy(keyword: string): Promise<Job[]> {
  const params = new URLSearchParams({
    name: keyword,
    state: "Santa Catarina",
    limit: "30",
    offset: "0",
  });

  const res = await fetch(`${BASE_URL}?${params}`, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as GupyResponse;
  if (!data.data) return [];

  return data.data.map((job) => ({
    id: `gupy-${job.id}`,
    title: job.name,
    company: job.companyName || job.careerPageName || "Empresa na Gupy",
    location: [job.city, job.state].filter(Boolean).join(", "),
    url: job.jobUrl || `https://portal.gupy.io/job/${job.id}`,
    source: "Gupy",
    postedAt: job.publishedDate,
    _raw: job,
  }));
}

export const gupyScraper: Scraper = {
  name: "Gupy",

  async search(params: SearchParams): Promise<Job[]> {
    const allJobs: { job: Job; raw: GupyJob }[] = [];

    const searchTerms = [
      "desenvolvedor junior",
      "estagio desenvolvimento",
      "javascript",
      "typescript",
      "frontend junior",
      "fullstack junior",
      "node junior",
    ];

    for (const term of searchTerms) {
      try {
        const res = await fetchGupyRaw(term);
        allJobs.push(...res);
        await delay(1500 + Math.random() * 1500);
      } catch {
        // source unavailable, continue
      }
    }

    const filtered = allJobs
      .filter((r) => matchesWorkMode(r.raw, params.workModes))
      .filter((r) => isWithinPeriod(r.raw.publishedDate, params.periodSeconds))
      .map((r) => r.job);

    const seen = new Set<string>();
    return filtered.filter((j) => {
      if (seen.has(j.id)) return false;
      seen.add(j.id);
      return true;
    });
  },
};

async function fetchGupyRaw(
  keyword: string
): Promise<{ job: Job; raw: GupyJob }[]> {
  const params = new URLSearchParams({
    name: keyword,
    state: "Santa Catarina",
    limit: "30",
    offset: "0",
  });

  const res = await fetch(`${BASE_URL}?${params}`, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as GupyResponse;
  if (!data.data) return [];

  return data.data.map((raw) => ({
    raw,
    job: {
      id: `gupy-${raw.id}`,
      title: raw.name,
      company: raw.companyName || raw.careerPageName || "Empresa na Gupy",
      location: [raw.city, raw.state].filter(Boolean).join(", "),
      url: raw.jobUrl || `https://portal.gupy.io/job/${raw.id}`,
      source: "Gupy",
      postedAt: raw.publishedDate,
    },
  }));
}
