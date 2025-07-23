-- Create ai_suggestions table for storing AI-generated onboarding suggestions
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('bio', 'services', 'highlights')),
    suggestion jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Ensure one suggestion per user per type
    UNIQUE(user_id, type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_type ON ai_suggestions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created_at ON ai_suggestions(created_at);

-- Enable RLS
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own suggestions
CREATE POLICY "Users can view their own AI suggestions" ON ai_suggestions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI suggestions" ON ai_suggestions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI suggestions" ON ai_suggestions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI suggestions" ON ai_suggestions
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_suggestions_updated_at 
    BEFORE UPDATE ON ai_suggestions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();