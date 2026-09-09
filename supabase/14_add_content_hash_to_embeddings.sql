-- BridgeX Migration 14: Add content_hash to student_embeddings
-- Run this in Supabase SQL Editor (or via supabase db push).
-- Safe to re-run: ADD COLUMN IF NOT EXISTS is a no-op if column exists.
--
-- Root cause: embedding_service.py and repository.py both expect
-- student_embeddings.content_hash (sha256 of profile document text)
-- to implement skip-if-unchanged embedding caching. This column was
-- defined in 07_ai_embeddings.sql but was missing from the deployed DB.
--
-- Existing rows receive DEFAULT empty string. On next pipeline run
-- the backend sees mismatch (empty != new sha256) and regenerates
-- the embedding, which is the correct recovery behaviour.

ALTER TABLE public.student_embeddings
    ADD COLUMN IF NOT EXISTS content_hash TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.student_embeddings.content_hash IS
    'sha256 hex digest of the profile document text that produced this
     embedding. Backend skips the AI embedding call when this matches
     the freshly-computed hash. Empty string = legacy row, will re-embed
     on next resume intelligence run.';
