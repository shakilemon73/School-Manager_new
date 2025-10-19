-- QUICK FIX: Enable RLS with user_metadata.school_id matching
-- Execute this in Supabase SQL Editor to fix the data loading issue

-- Helper function to get school ID from user metadata
CREATE OR REPLACE FUNCTION get_user_school_id_from_metadata()
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE(
        NULLIF((auth.jwt() -> 'user_metadata' ->> 'school_id'), '')::INTEGER,
        NULLIF((auth.jwt() -> 'app_metadata' ->> 'school_id'), '')::INTEGER
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable RLS on critical tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can access their school" ON schools;
DROP POLICY IF EXISTS "Users can access students in their school" ON students;
DROP POLICY IF EXISTS "Users can access teachers in their school" ON teachers;
DROP POLICY IF EXISTS "Users can access backups in their school" ON backups;
DROP POLICY IF EXISTS "Users can access staff in their school" ON staff;
DROP POLICY IF EXISTS "Users can access parents in their school" ON parents;
DROP POLICY IF EXISTS "Users can access classes in their school" ON classes;
DROP POLICY IF EXISTS "Users can access attendance in their school" ON attendance;

-- Create policies for schools table
CREATE POLICY "Users can access their school" ON schools
    FOR ALL USING (id = get_user_school_id_from_metadata());

-- Create policies for students table
CREATE POLICY "Users can access students in their school" ON students
    FOR ALL USING (school_id = get_user_school_id_from_metadata());

-- Create policies for teachers table
CREATE POLICY "Users can access teachers in their school" ON teachers
    FOR ALL USING (school_id = get_user_school_id_from_metadata());

-- Create policies for backups table
CREATE POLICY "Users can access backups in their school" ON backups
    FOR ALL USING (school_id = get_user_school_id_from_metadata());

-- Create policies for staff table
CREATE POLICY "Users can access staff in their school" ON staff
    FOR ALL USING (school_id = get_user_school_id_from_metadata());

-- Create policies for parents table
CREATE POLICY "Users can access parents in their school" ON parents
    FOR ALL USING (school_id = get_user_school_id_from_metadata());

-- Create policies for classes table
CREATE POLICY "Users can access classes in their school" ON classes
    FOR ALL USING (school_id = get_user_school_id_from_metadata());

-- Create policies for attendance table
CREATE POLICY "Users can access attendance in their school" ON attendance
    FOR ALL USING (school_id = get_user_school_id_from_metadata());

-- Verify the setup
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
