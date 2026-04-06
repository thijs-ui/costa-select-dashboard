-- RLS policies voor web_chats
-- Voer dit uit in Supabase Dashboard > SQL Editor

ALTER TABLE web_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own chats"
  ON web_chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chats"
  ON web_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats"
  ON web_chats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats"
  ON web_chats FOR DELETE
  USING (auth.uid() = user_id);
