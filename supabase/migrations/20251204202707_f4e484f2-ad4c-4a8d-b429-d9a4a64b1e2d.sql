-- Create sheets table for daily lead batches
CREATE TABLE public.sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sheets
ALTER TABLE public.sheets ENABLE ROW LEVEL SECURITY;

-- RLS policies for sheets
CREATE POLICY "Users can view their own sheets" ON public.sheets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sheets" ON public.sheets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sheets" ON public.sheets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sheets" ON public.sheets FOR DELETE USING (auth.uid() = user_id);

-- Add new columns to prospects table
ALTER TABLE public.prospects 
ADD COLUMN sheet_id UUID REFERENCES public.sheets(id) ON DELETE SET NULL,
ADD COLUMN batch_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN city TEXT,
ADD COLUMN age INTEGER,
ADD COLUMN date_of_birth DATE,
ADD COLUMN why_need TEXT,
ADD COLUMN enrollment_status TEXT DEFAULT 'Not Enrolled';

-- Create todos table for reminders
CREATE TABLE public.todos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on todos
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- RLS policies for todos
CREATE POLICY "Users can view their own todos" ON public.todos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own todos" ON public.todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own todos" ON public.todos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own todos" ON public.todos FOR DELETE USING (auth.uid() = user_id);

-- Trigger for todos updated_at
CREATE TRIGGER update_todos_updated_at
BEFORE UPDATE ON public.todos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create activity_logs table for tracking changes
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_logs
CREATE POLICY "Users can view their own activity logs" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own activity logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create custom_options table for user-configurable dropdowns
CREATE TABLE public.custom_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  option_type TEXT NOT NULL,
  option_value TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, option_type, option_value)
);

-- Enable RLS on custom_options
ALTER TABLE public.custom_options ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_options
CREATE POLICY "Users can view their own custom options" ON public.custom_options FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own custom options" ON public.custom_options FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own custom options" ON public.custom_options FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own custom options" ON public.custom_options FOR DELETE USING (auth.uid() = user_id);