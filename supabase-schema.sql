-- =============================================
-- EduFix - Supabase Database Schema
-- =============================================

-- 1. Institutions table
CREATE TABLE institutions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default institution (UADE)
INSERT INTO institutions (id, name, address)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Universidad UADE',
  'Lima 717, Buenos Aires, Argentina'
);

-- 2. Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'staff', 'user')),
  institution_id UUID REFERENCES institutions(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Incidents table
CREATE TABLE incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' 
    CHECK (category IN ('infrastructure','equipment','cleaning','electrical','plumbing','security','other')),
  priority TEXT NOT NULL DEFAULT 'medium' 
    CHECK (priority IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending','in_progress','resolved','cancelled')),
  location TEXT,
  photo_url TEXT,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES institutions(id) NOT NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 4. Notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Institutions: everyone can read
CREATE POLICY "Institutions are viewable by authenticated users"
  ON institutions FOR SELECT TO authenticated USING (true);

-- Profiles: users can read all profiles in their institution, update own
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Incidents: read all in same institution, insert as reporter, update staff/admin
CREATE POLICY "Users can view incidents in their institution"
  ON incidents FOR SELECT TO authenticated
  USING (
    institution_id = (
      SELECT institution_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create incidents"
  ON incidents FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Staff and admins can update incidents"
  ON incidents FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('staff', 'admin')
    )
  );

-- Notifications: users can only see their own
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can mark own notifications as read"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- Storage bucket for incident photos
-- =============================================

-- Run this in Supabase Dashboard > Storage > Create bucket:
-- Bucket name: incident-photos
-- Public: true
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- Storage policy (after creating bucket):
-- CREATE POLICY "Authenticated users can upload photos"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'incident-photos');

-- CREATE POLICY "Anyone can view incident photos"
--   ON storage.objects FOR SELECT USING (bucket_id = 'incident-photos');

-- =============================================
-- Helper: auto-create profile on signup
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
