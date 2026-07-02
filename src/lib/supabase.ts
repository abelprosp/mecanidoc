import { createBrowserDbClient } from '@/lib/db/client-browser';

/** Cliente browser — PostgreSQL via /api/db (substitui Supabase). */
export const createClient = () => createBrowserDbClient();
