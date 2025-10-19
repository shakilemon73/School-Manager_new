-- ========================================================================
-- COMPREHENSIVE SUPABASE RLS (ROW LEVEL SECURITY) SETUP
-- Multi-Tenant Bengali School Management System
-- ========================================================================
-- 
-- INSTRUCTIONS:
-- 1. Open your Supabase project dashboard
-- 2. Go to SQL Editor
-- 3. Copy and paste this ENTIRE file
-- 4. Click "Run" to execute
-- 
-- This will enable database-level security that prevents users from
-- accessing data from other schools, even if application code has bugs.
-- ========================================================================

-- ========================================================================
-- STEP 1: Create user_school_memberships table
-- ========================================================================
-- This table maps which users have access to which schools

CREATE TABLE IF NOT EXISTS user_school_memberships (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'staff', 'teacher', 'student', 'parent')),
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, school_id, role)
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_user_school_memberships_user_id ON user_school_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_school_memberships_school_id ON user_school_memberships(school_id);
CREATE INDEX IF NOT EXISTS idx_user_school_memberships_role ON user_school_memberships(role);
CREATE INDEX IF NOT EXISTS idx_user_school_memberships_active ON user_school_memberships(user_id, school_id, is_active);

-- Enable RLS on user_school_memberships itself
ALTER TABLE user_school_memberships ENABLE ROW LEVEL SECURITY;

-- Users can only see their own memberships
DROP POLICY IF EXISTS "Users can view their own school memberships" ON user_school_memberships;
CREATE POLICY "Users can view their own school memberships" ON user_school_memberships
    FOR SELECT USING (auth.uid() = user_id);

-- ========================================================================
-- STEP 2: Create Helper Functions for Security Checks
-- ========================================================================

-- Check if user has access to a school
CREATE OR REPLACE FUNCTION user_has_school_access(target_school_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check user's metadata first (for users without memberships table)
    IF (auth.jwt()->>'user_metadata')::jsonb->>'school_id' IS NOT NULL THEN
        RETURN ((auth.jwt()->>'user_metadata')::jsonb->>'school_id')::INTEGER = target_school_id;
    END IF;
    
    -- Otherwise check user_school_memberships table
    RETURN EXISTS (
        SELECT 1 FROM user_school_memberships 
        WHERE user_id = auth.uid() 
        AND school_id = target_school_id 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has admin access to a school
CREATE OR REPLACE FUNCTION user_has_admin_access(target_school_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_school_memberships 
        WHERE user_id = auth.uid() 
        AND school_id = target_school_id 
        AND role IN ('super_admin', 'admin')
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has a specific role in a school
CREATE OR REPLACE FUNCTION user_has_role_in_school(target_school_id INTEGER, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_school_memberships 
        WHERE user_id = auth.uid() 
        AND school_id = target_school_id 
        AND role = required_role
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's school ID from metadata
CREATE OR REPLACE FUNCTION get_user_school_id()
RETURNS INTEGER AS $$
DECLARE
    current_school_id INTEGER;
BEGIN
    -- Try to get from user metadata first
    current_school_id := ((auth.jwt()->>'user_metadata')::jsonb->>'school_id')::INTEGER;
    
    IF current_school_id IS NOT NULL THEN
        RETURN current_school_id;
    END IF;
    
    -- Otherwise get from memberships table
    SELECT school_id INTO current_school_id 
    FROM user_school_memberships 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    LIMIT 1;
    
    RETURN current_school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================
-- STEP 3: Enable RLS on All Tables
-- ========================================================================

-- Core Management Tables
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance ENABLE ROW LEVEL SECURITY;

-- Academic Tables
ALTER TABLE IF EXISTS academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exam_results ENABLE ROW LEVEL SECURITY;

-- Library Tables
ALTER TABLE IF EXISTS library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS library_borrowed_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS books ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS book_issues ENABLE ROW LEVEL SECURITY;

-- Financial Tables
ALTER TABLE IF EXISTS fee_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fee_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_transactions ENABLE ROW LEVEL SECURITY;

-- Inventory Tables
ALTER TABLE IF EXISTS inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory_categories ENABLE ROW LEVEL SECURITY;

-- Transport Tables
ALTER TABLE IF EXISTS transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transport_student_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transport_assignments ENABLE ROW LEVEL SECURITY;

-- Document & Template Tables
ALTER TABLE IF EXISTS document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admission_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS id_card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS id_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admit_card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admit_card_history ENABLE ROW LEVEL SECURITY;

-- Notification & Calendar Tables
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;

-- School Management Tables
ALTER TABLE IF EXISTS school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS school_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS credit_usage_logs ENABLE ROW LEVEL SECURITY;

-- Other Tables
ALTER TABLE IF EXISTS student_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS video_conferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS periods ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- STEP 4: Create RLS Policies for Core Tables
-- ========================================================================

-- Students Table Policies
DROP POLICY IF EXISTS "Users can view students in their schools" ON students;
DROP POLICY IF EXISTS "Users can insert students in their schools" ON students;
DROP POLICY IF EXISTS "Users can update students in their schools" ON students;
DROP POLICY IF EXISTS "Users can delete students in their schools" ON students;

CREATE POLICY "Users can view students in their schools" ON students
    FOR SELECT USING (user_has_school_access(school_id));

CREATE POLICY "Users can insert students in their schools" ON students
    FOR INSERT WITH CHECK (user_has_school_access(school_id));

CREATE POLICY "Users can update students in their schools" ON students
    FOR UPDATE USING (user_has_school_access(school_id)) 
    WITH CHECK (user_has_school_access(school_id));

CREATE POLICY "Users can delete students in their schools" ON students
    FOR DELETE USING (user_has_admin_access(school_id));

-- Teachers Table Policies
DROP POLICY IF EXISTS "Users can view teachers in their schools" ON teachers;
DROP POLICY IF EXISTS "Users can insert teachers in their schools" ON teachers;
DROP POLICY IF EXISTS "Users can update teachers in their schools" ON teachers;
DROP POLICY IF EXISTS "Users can delete teachers in their schools" ON teachers;

CREATE POLICY "Users can view teachers in their schools" ON teachers
    FOR SELECT USING (user_has_school_access(school_id));

CREATE POLICY "Users can insert teachers in their schools" ON teachers
    FOR INSERT WITH CHECK (user_has_admin_access(school_id));

CREATE POLICY "Users can update teachers in their schools" ON teachers
    FOR UPDATE USING (user_has_school_access(school_id)) 
    WITH CHECK (user_has_school_access(school_id));

CREATE POLICY "Users can delete teachers in their schools" ON teachers
    FOR DELETE USING (user_has_admin_access(school_id));

-- Staff Table Policies
DROP POLICY IF EXISTS "Users can view staff in their schools" ON staff;
DROP POLICY IF EXISTS "Users can insert staff in their schools" ON staff;
DROP POLICY IF EXISTS "Users can update staff in their schools" ON staff;
DROP POLICY IF EXISTS "Users can delete staff in their schools" ON staff;

CREATE POLICY "Users can view staff in their schools" ON staff
    FOR SELECT USING (user_has_school_access(school_id));

CREATE POLICY "Users can insert staff in their schools" ON staff
    FOR INSERT WITH CHECK (user_has_admin_access(school_id));

CREATE POLICY "Users can update staff in their schools" ON staff
    FOR UPDATE USING (user_has_school_access(school_id)) 
    WITH CHECK (user_has_school_access(school_id));

CREATE POLICY "Users can delete staff in their schools" ON staff
    FOR DELETE USING (user_has_admin_access(school_id));

-- Parents Table Policies
DROP POLICY IF EXISTS "Users can view parents in their schools" ON parents;
DROP POLICY IF EXISTS "Users can insert parents in their schools" ON parents;
DROP POLICY IF EXISTS "Users can update parents in their schools" ON parents;
DROP POLICY IF EXISTS "Users can delete parents in their schools" ON parents;

CREATE POLICY "Users can view parents in their schools" ON parents
    FOR SELECT USING (user_has_school_access(school_id));

CREATE POLICY "Users can insert parents in their schools" ON parents
    FOR INSERT WITH CHECK (user_has_school_access(school_id));

CREATE POLICY "Users can update parents in their schools" ON parents
    FOR UPDATE USING (user_has_school_access(school_id)) 
    WITH CHECK (user_has_school_access(school_id));

CREATE POLICY "Users can delete parents in their schools" ON parents
    FOR DELETE USING (user_has_admin_access(school_id));

-- Classes Table Policies
DROP POLICY IF EXISTS "Users can view classes in their schools" ON classes;
DROP POLICY IF EXISTS "Users can insert classes in their schools" ON classes;
DROP POLICY IF EXISTS "Users can update classes in their schools" ON classes;
DROP POLICY IF EXISTS "Users can delete classes in their schools" ON classes;

CREATE POLICY "Users can view classes in their schools" ON classes
    FOR SELECT USING (user_has_school_access(school_id));

CREATE POLICY "Users can insert classes in their schools" ON classes
    FOR INSERT WITH CHECK (user_has_admin_access(school_id));

CREATE POLICY "Users can update classes in their schools" ON classes
    FOR UPDATE USING (user_has_school_access(school_id)) 
    WITH CHECK (user_has_school_access(school_id));

CREATE POLICY "Users can delete classes in their schools" ON classes
    FOR DELETE USING (user_has_admin_access(school_id));

-- Attendance Table Policies
DROP POLICY IF EXISTS "Users can view attendance in their schools" ON attendance;
DROP POLICY IF EXISTS "Users can insert attendance in their schools" ON attendance;
DROP POLICY IF EXISTS "Users can update attendance in their schools" ON attendance;
DROP POLICY IF EXISTS "Users can delete attendance in their schools" ON attendance;

CREATE POLICY "Users can view attendance in their schools" ON attendance
    FOR SELECT USING (user_has_school_access(school_id));

CREATE POLICY "Users can insert attendance in their schools" ON attendance
    FOR INSERT WITH CHECK (user_has_school_access(school_id));

CREATE POLICY "Users can update attendance in their schools" ON attendance
    FOR UPDATE USING (user_has_school_access(school_id)) 
    WITH CHECK (user_has_school_access(school_id));

CREATE POLICY "Users can delete attendance in their schools" ON attendance
    FOR DELETE USING (user_has_admin_access(school_id));

-- Academic Years Table Policies
DROP POLICY IF EXISTS "Users can view academic years in their schools" ON academic_years;
DROP POLICY IF EXISTS "Users can insert academic years in their schools" ON academic_years;
DROP POLICY IF EXISTS "Users can update academic years in their schools" ON academic_years;
DROP POLICY IF EXISTS "Users can delete academic years in their schools" ON academic_years;

CREATE POLICY "Users can view academic years in their schools" ON academic_years
    FOR SELECT USING (user_has_school_access(school_id));

CREATE POLICY "Users can insert academic years in their schools" ON academic_years
    FOR INSERT WITH CHECK (user_has_admin_access(school_id));

CREATE POLICY "Users can update academic years in their schools" ON academic_years
    FOR UPDATE USING (user_has_school_access(school_id)) 
    WITH CHECK (user_has_school_access(school_id));

CREATE POLICY "Users can delete academic years in their schools" ON academic_years
    FOR DELETE USING (user_has_admin_access(school_id));

-- Academic Terms Table Policies
DROP POLICY IF EXISTS "Users can view academic terms in their schools" ON academic_terms;
DROP POLICY IF EXISTS "Users can insert academic terms in their schools" ON academic_terms;
DROP POLICY IF EXISTS "Users can update academic terms in their schools" ON academic_terms;
DROP POLICY IF EXISTS "Users can delete academic terms in their schools" ON academic_terms;

CREATE POLICY "Users can view academic terms in their schools" ON academic_terms
    FOR SELECT USING (user_has_school_access(school_id));

CREATE POLICY "Users can insert academic terms in their schools" ON academic_terms
    FOR INSERT WITH CHECK (user_has_admin_access(school_id));

CREATE POLICY "Users can update academic terms in their schools" ON academic_terms
    FOR UPDATE USING (user_has_school_access(school_id)) 
    WITH CHECK (user_has_school_access(school_id));

CREATE POLICY "Users can delete academic terms in their schools" ON academic_terms
    FOR DELETE USING (user_has_admin_access(school_id));

-- Library Books Table Policies
DROP POLICY IF EXISTS "Users can view library books in their schools" ON library_books;
DROP POLICY IF EXISTS "Users can insert library books in their schools" ON library_books;
DROP POLICY IF EXISTS "Users can update library books in their schools" ON library_books;
DROP POLICY IF EXISTS "Users can delete library books in their schools" ON library_books;

CREATE POLICY "Users can view library books in their schools" ON library_books
    FOR SELECT USING (user_has_school_access(school_id));

CREATE POLICY "Users can insert library books in their schools" ON library_books
    FOR INSERT WITH CHECK (user_has_school_access(school_id));

CREATE POLICY "Users can update library books in their schools" ON library_books
    FOR UPDATE USING (user_has_school_access(school_id)) 
    WITH CHECK (user_has_school_access(school_id));

CREATE POLICY "Users can delete library books in their schools" ON library_books
    FOR DELETE USING (user_has_admin_access(school_id));

-- Library Borrowed Books Table Policies
DROP POLICY IF EXISTS "Users can view library borrowed books in their schools" ON library_borrowed_books;
DROP POLICY IF EXISTS "Users can insert library borrowed books in their schools" ON library_borrowed_books;
DROP POLICY IF EXISTS "Users can update library borrowed books in their schools" ON library_borrowed_books;
DROP POLICY IF EXISTS "Users can delete library borrowed books in their schools" ON library_borrowed_books;

CREATE POLICY "Users can view library borrowed books in their schools" ON library_borrowed_books
    FOR SELECT USING (user_has_school_access(school_id));

CREATE POLICY "Users can insert library borrowed books in their schools" ON library_borrowed_books
    FOR INSERT WITH CHECK (user_has_school_access(school_id));

CREATE POLICY "Users can update library borrowed books in their schools" ON library_borrowed_books
    FOR UPDATE USING (user_has_school_access(school_id)) 
    WITH CHECK (user_has_school_access(school_id));

CREATE POLICY "Users can delete library borrowed books in their schools" ON library_borrowed_books
    FOR DELETE USING (user_has_admin_access(school_id));

-- ========================================================================
-- STEP 5: Create Policies for Financial Tables (Admin-Only Access)
-- ========================================================================

-- Fee Receipts Table Policies
DROP POLICY IF EXISTS "Users can view fee receipts in their schools" ON fee_receipts;
DROP POLICY IF EXISTS "Admins can insert fee receipts" ON fee_receipts;
DROP POLICY IF EXISTS "Admins can update fee receipts" ON fee_receipts;
DROP POLICY IF EXISTS "Admins can delete fee receipts" ON fee_receipts;

CREATE POLICY "Users can view fee receipts in their schools" ON fee_receipts
    FOR SELECT USING (user_has_school_access(school_id));

CREATE POLICY "Admins can insert fee receipts" ON fee_receipts
    FOR INSERT WITH CHECK (user_has_admin_access(school_id));

CREATE POLICY "Admins can update fee receipts" ON fee_receipts
    FOR UPDATE USING (user_has_admin_access(school_id)) 
    WITH CHECK (user_has_admin_access(school_id));

CREATE POLICY "Admins can delete fee receipts" ON fee_receipts
    FOR DELETE USING (user_has_admin_access(school_id));

-- Financial Transactions Table Policies
DROP POLICY IF EXISTS "Admins can view financial transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Admins can insert financial transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Admins can update financial transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Admins can delete financial transactions" ON financial_transactions;

CREATE POLICY "Admins can view financial transactions" ON financial_transactions
    FOR SELECT USING (user_has_admin_access(school_id));

CREATE POLICY "Admins can insert financial transactions" ON financial_transactions
    FOR INSERT WITH CHECK (user_has_admin_access(school_id));

CREATE POLICY "Admins can update financial transactions" ON financial_transactions
    FOR UPDATE USING (user_has_admin_access(school_id)) 
    WITH CHECK (user_has_admin_access(school_id));

CREATE POLICY "Admins can delete financial transactions" ON financial_transactions
    FOR DELETE USING (user_has_admin_access(school_id));

-- ========================================================================
-- STEP 6: Create Policies for All Other Tables (Standard Access)
-- ========================================================================

-- Helper macro to create policies for a table
DO $$ 
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY[
        'inventory_items', 'inventory_movements', 'inventory_categories',
        'transport_routes', 'transport_vehicles', 'vehicles', 
        'transport_student_assignments', 'transport_assignments',
        'document_templates', 'templates', 'testimonials', 
        'admission_forms', 'id_card_templates', 'id_cards',
        'admit_card_templates', 'admit_cards', 'admit_card_history',
        'notifications', 'calendar_events', 'events',
        'school_settings', 'school_instances', 
        'credit_balances', 'credit_usage_logs',
        'student_import_batches', 'parent_students',
        'video_conferences', 'periods', 'exams', 'exam_schedules', 'exam_results',
        'books', 'book_issues', 'payment_transactions', 'fee_items'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        -- Drop existing policies
        EXECUTE format('DROP POLICY IF EXISTS "Users can view %s in their schools" ON %I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Users can insert %s in their schools" ON %I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Users can update %s in their schools" ON %I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Users can delete %s in their schools" ON %I', table_name, table_name);
        
        -- Create new policies
        EXECUTE format('CREATE POLICY "Users can view %s in their schools" ON %I FOR SELECT USING (user_has_school_access(school_id))', table_name, table_name);
        EXECUTE format('CREATE POLICY "Users can insert %s in their schools" ON %I FOR INSERT WITH CHECK (user_has_school_access(school_id))', table_name, table_name);
        EXECUTE format('CREATE POLICY "Users can update %s in their schools" ON %I FOR UPDATE USING (user_has_school_access(school_id)) WITH CHECK (user_has_school_access(school_id))', table_name, table_name);
        EXECUTE format('CREATE POLICY "Users can delete %s in their schools" ON %I FOR DELETE USING (user_has_admin_access(school_id))', table_name, table_name);
    END LOOP;
END $$;

-- ========================================================================
-- STEP 7: Grant Permissions
-- ========================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_school_memberships TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_school_access(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_role_in_school(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_admin_access(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_school_id() TO authenticated;

-- ========================================================================
-- STEP 8: Verification Query
-- ========================================================================
-- Run this to verify RLS is enabled on all tables

SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;

-- ========================================================================
-- SETUP COMPLETE!
-- ========================================================================
-- 
-- ✅ Your Supabase database now has Row Level Security enabled!
-- ✅ Users can only access data from their own schools
-- ✅ Even if there are bugs in application code, the database will block
--    cross-school data access
-- 
-- NEXT STEPS:
-- 1. Make sure users have school_id in their auth.users metadata
-- 2. Test by logging in as different schools
-- 3. Verify queries are properly filtered
-- 
-- ========================================================================
