import * as cheerio from "cheerio";
import { Job, Scraper, SearchParams } from "../types.js";
import { config } from "../config.js";

const BASE_URL =
  "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function workModeToFilter(modes: SearchParams["workModes"]): string {
  const map: Record<string, string> = { presencial: "1", hibrido: "3" };
  return modes.map((m) => map[m]).filter(Boolean).join(",");
}

async function fetchJobs(
  keyword: string,
  location: string,
  params_: SearchParams
): Promise<Job[]> {
  const params = new URLSearchParams({
    keywords: keyword,
    location,
    f_E: "1,2",
    f_TPR: `r${params_.periodSeconds}`,
    f_WT: workModeToFilter(params_.workModes),
    sortBy: "DD",
    start: "0",
  });

  const res = await fetch(`${BASE_URL}?${params}`, {
    headers: {
      "User-Agent": randomUA(),
      Accept: "text/html",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
  });

  if (!res.ok) return [];

  const html = await res.text();
  const $ = cheerio.load(html);
  const jobs: Job[] = [];

  $("li").each((_, el) => {
    const title = $(el).find(".base-search-card__title").text().trim();
    const company = $(el).find(".base-search-card__subtitle").text().trim();
    const jobLocation = $(el)
      .find(".job-search-card__location")
      .text()
      .trim();
    const url =
      $(el).find(".base-card__full-link").attr("href")?.split("?")[0] || "";
    const postedAt = $(el).find("time").attr("datetime") || "";

    if (!title || !url) return;

    const id = url.match(/(\d+)\/?$/)?.[1] || url;
    jobs.push({
      id: `li-${id}`,
      title,
      company,
      location: jobLocation,
      url,
      source: "LinkedIn",
      postedAt,
    });
  });

  return jobs;
}

export const linkedInScraper: Scraper = {
  name: "LinkedIn",

  async search(params: SearchParams): Promise<Job[]> {
    const allJobs: Job[] = [];

    for (const keyword of config.search.keywords) {
      for (const location of config.search.locations) {
        try {
          const jobs = await fetchJobs(keyword, location, params);
          allJobs.push(...jobs);
          await delay(2000 + Math.random() * 2000);
        } catch {
          // source unavailable, continue
        }
      }
    }

    const seen = new Set<string>();
    return allJobs.filter((j) => {
      if (seen.has(j.id)) return false;
      seen.add(j.id);
      return true;
    });
  },
};
