-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create favorites table
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id TEXT NOT NULL,
  station_name TEXT NOT NULL,
  station_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create listening history table
CREATE TABLE public.listening_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id TEXT NOT NULL,
  station_name TEXT NOT NULL,
  station_data JSONB NOT NULL,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create custom folders table
CREATE TABLE public.custom_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create folder stations junction table
CREATE TABLE public.folder_stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id UUID NOT NULL REFERENCES public.custom_folders(id) ON DELETE CASCADE,
  station_id TEXT NOT NULL,
  station_data JSONB NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alarms table
CREATE TABLE public.alarms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id TEXT NOT NULL,
  station_data JSONB NOT NULL,
  alarm_time TIME NOT NULL,
  days_of_week INTEGER[] NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sleep timer settings table
CREATE TABLE public.sleep_timer_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_station_id TEXT,
  last_station_data JSONB,
  default_duration_minutes INTEGER DEFAULT 30,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_timer_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Favorites policies
CREATE POLICY "Users can view their own favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Listening history policies
CREATE POLICY "Users can view their own history"
  ON public.listening_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own history"
  ON public.listening_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own history"
  ON public.listening_history FOR DELETE
  USING (auth.uid() = user_id);

-- Custom folders policies
CREATE POLICY "Users can view their own folders"
  ON public.custom_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
  ON public.custom_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON public.custom_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON public.custom_folders FOR DELETE
  USING (auth.uid() = user_id);

-- Folder stations policies
CREATE POLICY "Users can view stations in their folders"
  ON public.folder_stations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.custom_folders
    WHERE custom_folders.id = folder_stations.folder_id
    AND custom_folders.user_id = auth.uid()
  ));

CREATE POLICY "Users can add stations to their folders"
  ON public.folder_stations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.custom_folders
    WHERE custom_folders.id = folder_stations.folder_id
    AND custom_folders.user_id = auth.uid()
  ));

CREATE POLICY "Users can remove stations from their folders"
  ON public.folder_stations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.custom_folders
    WHERE custom_folders.id = folder_stations.folder_id
    AND custom_folders.user_id = auth.uid()
  ));

-- Alarms policies
CREATE POLICY "Users can view their own alarms"
  ON public.alarms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alarms"
  ON public.alarms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alarms"
  ON public.alarms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alarms"
  ON public.alarms FOR DELETE
  USING (auth.uid() = user_id);

-- Sleep timer settings policies
CREATE POLICY "Users can view their own sleep timer settings"
  ON public.sleep_timer_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sleep timer settings"
  ON public.sleep_timer_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sleep timer settings"
  ON public.sleep_timer_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_station_id ON public.favorites(station_id);
CREATE INDEX idx_history_user_id ON public.listening_history(user_id);
CREATE INDEX idx_history_played_at ON public.listening_history(played_at DESC);
CREATE INDEX idx_folders_user_id ON public.custom_folders(user_id);
CREATE INDEX idx_folder_stations_folder_id ON public.folder_stations(folder_id);
CREATE INDEX idx_alarms_user_id ON public.alarms(user_id);
CREATE INDEX idx_sleep_timer_user_id ON public.sleep_timer_settings(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON public.custom_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alarms_updated_at
  BEFORE UPDATE ON public.alarms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sleep_timer_updated_at
  BEFORE UPDATE ON public.sleep_timer_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();