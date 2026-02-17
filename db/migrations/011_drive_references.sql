-- Migration 011: Google Drive references for agent memory

ALTER TABLE agents ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS drive_file_ids JSONB DEFAULT '{}';

DO $$ BEGIN RAISE NOTICE 'Migration 011 completed: Drive references added to agents'; END $$;
