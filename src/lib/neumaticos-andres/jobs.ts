import { randomUUID } from 'crypto';

export type NaJobType = 'import-catalog' | 'sync-stock';
export type NaJobStatus = 'running' | 'done' | 'error';

export type NaJob = {
  id: string;
  type: NaJobType;
  status: NaJobStatus;
  startedAt: string;
  finishedAt: string | null;
  logs: string[];
  result: Record<string, unknown> | null;
  error: string | null;
};

type Store = {
  jobs: Map<string, NaJob>;
  runningByType: Map<NaJobType, string>;
};

const g = globalThis as typeof globalThis & { __mecanidocNaJobs?: Store };

function store(): Store {
  if (!g.__mecanidocNaJobs) {
    g.__mecanidocNaJobs = { jobs: new Map(), runningByType: new Map() };
  }
  return g.__mecanidocNaJobs;
}

function pruneOldJobs() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of store().jobs) {
    const ts = Date.parse(job.finishedAt || job.startedAt);
    if (Number.isFinite(ts) && ts < cutoff && job.status !== 'running') {
      store().jobs.delete(id);
    }
  }
}

export function getNaJob(id: string): NaJob | null {
  return store().jobs.get(id) || null;
}

export function getRunningNaJob(type: NaJobType): NaJob | null {
  const id = store().runningByType.get(type);
  if (!id) return null;
  const job = store().jobs.get(id);
  if (!job || job.status !== 'running') {
    store().runningByType.delete(type);
    return null;
  }
  return job;
}

export function createNaJob(type: NaJobType): NaJob {
  pruneOldJobs();
  const running = getRunningNaJob(type);
  if (running) return running;

  const job: NaJob = {
    id: randomUUID(),
    type,
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    logs: ['A iniciar…'],
    result: null,
    error: null,
  };
  store().jobs.set(job.id, job);
  store().runningByType.set(type, job.id);
  return job;
}

export function appendNaJobLogs(id: string, lines: string[]) {
  const job = store().jobs.get(id);
  if (!job) return;
  job.logs = [...job.logs, ...lines.filter(Boolean)].slice(-80);
}

export function setNaJobLogs(id: string, lines: string[]) {
  const job = store().jobs.get(id);
  if (!job) return;
  job.logs = lines.slice(-80);
}

export function finishNaJob(id: string, result: Record<string, unknown>) {
  const job = store().jobs.get(id);
  if (!job) return;
  job.status = 'done';
  job.result = result;
  job.finishedAt = new Date().toISOString();
  if (Array.isArray(result.logs)) {
    job.logs = (result.logs as string[]).slice(-80);
  }
  store().runningByType.delete(job.type);
}

export function failNaJob(id: string, error: string) {
  const job = store().jobs.get(id);
  if (!job) return;
  job.status = 'error';
  job.error = error;
  job.finishedAt = new Date().toISOString();
  job.logs = [...job.logs, error].slice(-80);
  store().runningByType.delete(job.type);
}

export function publicNaJob(job: NaJob) {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    logs: job.logs,
    result: job.result,
    error: job.error,
  };
}
