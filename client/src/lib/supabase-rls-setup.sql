-- Supabase Multi-Tenant Security Model with RLS Policies
-- Execute this in your Supabase SQL Editor to set up the security foundation

-- Step 1: Create user_school_memberships table for multi-tenant access control
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_school_memberships_user_id ON user_school_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_school_memberships_school_id ON user_school_memberships(school_id);
CREATE INDEX IF NOT EXISTS idx_user_school_memberships_role ON user_school_memberships(role);
CREATE INDEX IF NOT EXISTS idx_user_school_memberships_active ON user_school_memberships(user_id, school_id, is_active);

-- Step 2: Enable RLS on user_school_memberships
ALTER TABLE user_school_memberships ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policy for user_school_memberships (users can only see their own memberships)
CREATE POLICY "Users can view their own school memberships" ON user_school_memberships
    FOR ALL USING (auth.uid() = user_id);

-- Step 4: Add school_id to tables that are missing it (for full multi-tenant support)
ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS school_id INTEGER;
ALTER TABLE credit_usage_logs ADD COLUMN IF NOT EXISTS school_id INTEGER;
ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS school_id INTEGER;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS school_id INTEGER;
ALTER TABLE exam_schedules ADD COLUMN IF NOT EXISTS school_id INTEGER;
ALTER TABLE fee_items ADD COLUMN IF NOT EXISTS school_id INTEGER;
ALTER TABLE parent_students ADD COLUMN IF NOT EXISTS school_id INTEGER;
ALTER TABLE admit_card_history ADD COLUMN IF NOT EXISTS school_id INTEGER;
ALTER TABLE transport_assignments ADD COLUMN IF NOT EXISTS school_id INTEGER;

-- Step 5: Create indexes on newly added school_id columns
CREATE INDEX IF NOT EXISTS idx_book_issues_school_id ON book_issues(school_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_logs_school_id ON credit_usage_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_school_id ON document_templates(school_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_school_id ON exam_results(school_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_school_id ON exam_schedules(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_items_school_id ON fee_items(school_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_school_id ON parent_students(school_id);
CREATE INDEX IF NOT EXISTS idx_admit_card_history_school_id ON admit_card_history(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_assignments_school_id ON transport_assignments(school_id);

-- Step 6: Create universal RLS policy helper function
CREATE OR REPLACE FUNCTION user_has_school_access(target_school_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_school_memberships 
        WHERE user_id = auth.uid() 
        AND school_id = target_school_id 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create RLS policies for all tables with school_id
-- Students table
CREATE POLICY "Users can access students in their schools" ON students
    FOR ALL USING (user_has_school_access(school_id));

-- Teachers table  
CREATE POLICY "Users can access teachers in their schools" ON teachers
    FOR ALL USING (user_has_school_access(school_id));

-- Staff table
CREATE POLICY "Users can access staff in their schools" ON staff
    FOR ALL USING (user_has_school_access(school_id));

-- Parents table
CREATE POLICY "Users can access parents in their schools" ON parents
    FOR ALL USING (user_has_school_access(school_id));

-- Classes table
CREATE POLICY "Users can access classes in their schools" ON classes
    FOR ALL USING (user_has_school_access(school_id));

-- Academic Years table
CREATE POLICY "Users can access academic years in their schools" ON academic_years
    FOR ALL USING (user_has_school_access(school_id));

-- Academic Terms table
CREATE POLICY "Users can access academic terms in their schools" ON academic_terms
    FOR ALL USING (user_has_school_access(school_id));

-- Attendance table
CREATE POLICY "Users can access attendance in their schools" ON attendance
    FOR ALL USING (user_has_school_access(school_id));

-- Books/Library tables
CREATE POLICY "Users can access books in their schools" ON books
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access library books in their schools" ON library_books
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access library borrowed books in their schools" ON library_borrowed_books
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access book issues in their schools" ON book_issues
    FOR ALL USING (user_has_school_access(school_id));

-- Inventory tables
CREATE POLICY "Users can access inventory items in their schools" ON inventory_items
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access inventory movements in their schools" ON inventory_movements
    FOR ALL USING (user_has_school_access(school_id));

-- Financial tables
CREATE POLICY "Users can access financial transactions in their schools" ON financial_transactions
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access fee receipts in their schools" ON fee_receipts
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access fee items in their schools" ON fee_items
    FOR ALL USING (user_has_school_access(school_id));

-- Transport tables
CREATE POLICY "Users can access transport routes in their schools" ON transport_routes
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access transport vehicles in their schools" ON transport_vehicles
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access transport student assignments in their schools" ON transport_student_assignments
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access transport assignments in their schools" ON transport_assignments
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access vehicles in their schools" ON vehicles
    FOR ALL USING (user_has_school_access(school_id));

-- Document and template tables
CREATE POLICY "Users can access document templates in their schools" ON document_templates
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access templates in their schools" ON templates
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access ID card templates in their schools" ON id_card_templates
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access ID cards in their schools" ON id_cards
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access admit card templates in their schools" ON admit_card_templates
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access admit cards in their schools" ON admit_cards
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access admit card history in their schools" ON admit_card_history
    FOR ALL USING (user_has_school_access(school_id));

-- Exam tables
CREATE POLICY "Users can access exams in their schools" ON exams
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access exam schedules in their schools" ON exam_schedules
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access exam results in their schools" ON exam_results
    FOR ALL USING (user_has_school_access(school_id));

-- Notification and calendar tables
CREATE POLICY "Users can access notifications in their schools" ON notifications
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access calendar events in their schools" ON calendar_events
    FOR ALL USING (user_has_school_access(school_id));

-- School management tables
CREATE POLICY "Users can access school settings in their schools" ON school_settings
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access school instances in their schools" ON school_instances
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access credit balances in their schools" ON credit_balances
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access credit usage logs in their schools" ON credit_usage_logs
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access student import batches in their schools" ON student_import_batches
    FOR ALL USING (user_has_school_access(school_id));

CREATE POLICY "Users can access parent students in their schools" ON parent_students
    FOR ALL USING (user_has_school_access(school_id));

-- Step 8: Create database functions for complex operations
CREATE OR REPLACE FUNCTION get_dashboard_stats(target_school_id INTEGER)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user has access to this school
    IF NOT user_has_school_access(target_school_id) THEN
        RAISE EXCEPTION 'Access denied to school %', target_school_id;
    END IF;
    
    SELECT json_build_object(
        'students', (SELECT COUNT(*) FROM students WHERE school_id = target_school_id),
        'teachers', (SELECT COUNT(*) FROM teachers WHERE school_id = target_school_id),
        'staff', (SELECT COUNT(*) FROM staff WHERE school_id = target_school_id),
        'parents', (SELECT COUNT(*) FROM parents WHERE school_id = target_school_id),
        'books', (SELECT COUNT(*) FROM library_books WHERE school_id = target_school_id),
        'inventory_items', (SELECT COUNT(*) FROM inventory_items WHERE school_id = target_school_id),
        'pending_notifications', (SELECT COUNT(*) FROM notifications WHERE school_id = target_school_id AND is_read = false),
        'upcoming_events', (SELECT COUNT(*) FROM calendar_events WHERE school_id = target_school_id AND start_date >= CURRENT_DATE),
        'total_classes', (SELECT COUNT(*) FROM classes WHERE school_id = target_school_id),
        'active_academic_year', (SELECT name FROM academic_years WHERE school_id = target_school_id AND is_current = true LIMIT 1)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_school_memberships TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_school_access(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(INTEGER) TO authenticated;

-- Step 10: Insert sample membership data (replace with actual user IDs)
-- This is just for testing - replace with actual user management system
/*
INSERT INTO user_school_memberships (user_id, school_id, role, is_active) 
VALUES 
    ('your-auth-user-id-here', 1, 'admin', true)
ON CONFLICT (user_id, school_id, role) DO NOTHING;
*/