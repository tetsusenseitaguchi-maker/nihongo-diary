-- Add entry_type column to distinguish vocabulary words from grammar patterns
ALTER TABLE public.vocabulary_entries
ADD COLUMN IF NOT EXISTS entry_type text NOT NULL DEFAULT 'word';

-- Back-fill existing rows
UPDATE public.vocabulary_entries SET entry_type = 'word' WHERE entry_type = 'word';

notify pgrst, 'reload schema';
