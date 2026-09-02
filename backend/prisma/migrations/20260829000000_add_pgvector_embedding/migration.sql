-- Optional: enables semantic search for the AI mentor chatbot (searchSimilarOpportunities).
-- Safe to run on any Postgres instance that supports the pgvector extension
-- (e.g. Supabase, Neon, self-hosted Postgres with pgvector installed).
-- If the extension is unavailable, vectorStore.service.ts degrades gracefully
-- and the app continues to work without semantic search.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "embedding" vector(384);
