export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  postedAt?: string;
}

export interface SearchParams {
  periodSeconds: number;
  workModes: ("presencial" | "hibrido")[];
}

export interface Scraper {
  name: string;
  search(params: SearchParams): Promise<Job[]>;
}
