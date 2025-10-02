// New Feature Types for School Management System
// Auto-generated types for newly added tables

import { Database } from './supabase-types';

// Helper types
type TablesRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// SUBJECTS MANAGEMENT
export interface Subject {
  id: number;
  subject_code: string;
  subject_name: string;
  subject_name_bn?: string;
  description?: string;
  credit_hours?: number;
  is_compulsory?: boolean;
  department?: string;
  school_id: number;
  created_at: string;
  updated_at?: string;
}

export interface SubjectAssignment {
  id: number;
  subject_id: number;
  teacher_id: number;
  class: string;
  section?: string;
  academic_year_id?: number;
  school_id: number;
  created_at: string;
}

// HOMEWORK/ASSIGNMENT SYSTEM
export interface Assignment {
  id: number;
  title: string;
  title_bn?: string;
  description?: string;
  subject_id?: number;
  teacher_id: number;
  class: string;
  section?: string;
  assigned_date: string;
  due_date: string;
  total_marks?: number;
  attachment_url?: string;
  status?: string;
  school_id: number;
  created_at: string;
}

export interface AssignmentSubmission {
  id: number;
  assignment_id: number;
  student_id: number;
  submission_date: string;
  submission_text?: string;
  attachment_url?: string;
  marks_obtained?: number;
  feedback?: string;
  status?: string;
  graded_by?: number;
  graded_at?: string;
  school_id: number;
  created_at: string;
}

// TIMETABLE SYSTEM
export interface Period {
  id: number;
  period_number: number;
  period_name: string;
  start_time: string;
  end_time: string;
  school_id: number;
  created_at: string;
}

export interface TimetableSlot {
  id: number;
  day_of_week: number;
  period_id: number;
  subject_id?: number;
  teacher_id?: number;
  class: string;
  section?: string;
  room_number?: string;
  academic_year_id?: number;
  school_id: number;
  created_at: string;
}

// NOTIFICATION SYSTEM
export interface NotificationTemplate {
  id: number;
  template_name: string;
  template_type: string;
  subject?: string;
  body_template: string;
  variables?: any;
  is_active?: boolean;
  school_id: number;
  created_at: string;
}

export interface NotificationLog {
  id: number;
  recipient_type: string;
  recipient_id: number;
  notification_type: string;
  template_id?: number;
  subject?: string;
  message: string;
  recipient_contact?: string;
  status?: string;
  sent_at?: string;
  error_message?: string;
  school_id: number;
  created_at: string;
}

// EXAM MANAGEMENT
export interface ExamSchedule {
  id: number;
  exam_id: number;
  subject_id: number;
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_minutes?: number;
  room_number?: string;
  total_marks?: number;
  school_id: number;
  created_at: string;
}

export interface SeatingArrangement {
  id: number;
  exam_schedule_id: number;
  student_id: number;
  room_number: string;
  seat_number: string;
  row_number?: number;
  column_number?: number;
  school_id: number;
  created_at: string;
}

export interface InvigilationDuty {
  id: number;
  exam_schedule_id: number;
  teacher_id: number;
  room_number: string;
  duty_type?: string;
  school_id: number;
  created_at: string;
}

// LEAVE MANAGEMENT
export interface LeaveType {
  id: number;
  leave_name: string;
  leave_name_bn?: string;
  max_days_per_year?: number;
  is_paid?: boolean;
  requires_approval?: boolean;
  school_id: number;
  created_at: string;
}

export interface LeaveApplication {
  id: number;
  applicant_type: string;
  applicant_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status?: string;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  school_id: number;
  created_at: string;
}

export interface LeaveBalance {
  id: number;
  user_type: string;
  user_id: number;
  leave_type_id: number;
  academic_year_id?: number;
  total_allocated?: number;
  used_days?: number;
  remaining_days?: number;
  school_id: number;
  updated_at?: string;
}

// STAFF ATTENDANCE
export interface StaffAttendance {
  id: number;
  staff_type: string;
  staff_id: number;
  attendance_date: string;
  check_in_time?: string;
  check_out_time?: string;
  status?: string;
  remarks?: string;
  marked_by?: number;
  school_id: number;
  created_at: string;
}

export interface AttendanceSummary {
  id: number;
  staff_type: string;
  staff_id: number;
  month: number;
  year: number;
  total_working_days?: number;
  present_days?: number;
  absent_days?: number;
  late_days?: number;
  half_days?: number;
  leave_days?: number;
  attendance_percentage?: number;
  school_id: number;
  updated_at?: string;
}

// PAYROLL SYSTEM
export interface SalaryComponent {
  id: number;
  component_name: string;
  component_name_bn?: string;
  component_type: string;
  is_percentage?: boolean;
  amount?: number;
  percentage?: number;
  is_taxable?: boolean;
  school_id: number;
  created_at: string;
}

export interface PayrollRecord {
  id: number;
  staff_type: string;
  staff_id: number;
  month: number;
  year: number;
  basic_salary: number;
  total_earnings?: number;
  total_deductions?: number;
  net_salary?: number;
  payment_status?: string;
  payment_date?: string;
  payment_method?: string;
  payment_reference?: string;
  salary_breakdown?: any;
  school_id: number;
  created_at: string;
}

// HOSTEL MANAGEMENT
export interface Hostel {
  id: number;
  hostel_name: string;
  hostel_name_bn?: string;
  hostel_type?: string;
  total_rooms?: number;
  total_capacity?: number;
  warden_id?: number;
  address?: string;
  facilities?: string;
  school_id: number;
  created_at: string;
}

export interface HostelRoom {
  id: number;
  hostel_id: number;
  room_number: string;
  floor_number?: number;
  room_type?: string;
  capacity?: number;
  current_occupancy?: number;
  monthly_fee?: number;
  status?: string;
  facilities?: string;
  school_id: number;
  created_at: string;
}

// CAFETERIA/MEAL
export interface MealPlan {
  id: number;
  plan_name: string;
  plan_name_bn?: string;
  meal_types?: string;
  monthly_fee: number;
  description?: string;
  is_active?: boolean;
  school_id: number;
  created_at: string;
}

// DISCIPLINARY RECORDS
export interface DisciplinaryIncident {
  id: number;
  student_id: number;
  category_id?: number;
  incident_date: string;
  incident_time?: string;
  description: string;
  location?: string;
  reported_by?: number;
  severity_level?: string;
  status?: string;
  school_id: number;
  created_at: string;
}

// CO-CURRICULAR ACTIVITIES
export interface Activity {
  id: number;
  activity_name: string;
  activity_name_bn?: string;
  activity_type?: string;
  description?: string;
  coordinator_id?: number;
  meeting_schedule?: string;
  max_participants?: number;
  current_participants?: number;
  is_active?: boolean;
  school_id: number;
  created_at: string;
}

export interface ActivityEnrollment {
  id: number;
  activity_id: number;
  student_id: number;
  enrollment_date: string;
  role?: string;
  status?: string;
  school_id: number;
  created_at: string;
}

// HEALTH RECORDS
export interface HealthRecord {
  id: number;
  student_id: number;
  height?: number;
  weight?: number;
  blood_pressure?: string;
  allergies?: string;
  chronic_conditions?: string;
  current_medications?: string;
  emergency_medical_info?: string;
  last_checkup_date?: string;
  school_id: number;
  updated_at?: string;
}

export interface Vaccination {
  id: number;
  student_id: number;
  vaccine_name: string;
  vaccine_name_bn?: string;
  dose_number?: number;
  vaccination_date: string;
  next_dose_date?: string;
  administered_by?: string;
  batch_number?: string;
  side_effects?: string;
  school_id: number;
  created_at: string;
}

// ADMISSION PORTAL
export interface AdmissionSession {
  id: number;
  session_name: string;
  session_name_bn?: string;
  academic_year_id?: number;
  start_date: string;
  end_date: string;
  application_fee?: number;
  is_active?: boolean;
  school_id: number;
  created_at: string;
}

export interface AdmissionApplication {
  id: number;
  application_number: string;
  session_id: number;
  student_name: string;
  student_name_bn?: string;
  date_of_birth: string;
  gender?: string;
  father_name?: string;
  mother_name?: string;
  guardian_phone: string;
  guardian_email?: string;
  address?: string;
  previous_school?: string;
  previous_class?: string;
  desired_class: string;
  photo_url?: string;
  documents_url?: any;
  application_status?: string;
  payment_status?: string;
  payment_reference?: string;
  school_id: number;
  created_at: string;
}

// INVENTORY ENHANCEMENTS
export interface Vendor {
  id: number;
  vendor_name: string;
  vendor_code?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  rating?: number;
  is_active?: boolean;
  school_id: number;
  created_at: string;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  vendor_id: number;
  order_date: string;
  expected_delivery_date?: string;
  total_amount: number;
  tax_amount?: number;
  discount_amount?: number;
  net_amount: number;
  status?: string;
  approved_by?: number;
  approved_at?: string;
  notes?: string;
  school_id: number;
  created_at: string;
}

// MESSAGING
export interface Conversation {
  id: number;
  conversation_type: string;
  participant_1_type?: string;
  participant_1_id?: number;
  participant_2_type?: string;
  participant_2_id?: number;
  subject?: string;
  last_message_at?: string;
  status?: string;
  school_id: number;
  created_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_type: string;
  sender_id: number;
  message_text: string;
  is_read?: boolean;
  read_at?: string;
  school_id: number;
  created_at: string;
}

// ANNOUNCEMENTS
export interface Announcement {
  id: number;
  title: string;
  title_bn?: string;
  content: string;
  content_bn?: string;
  category_id?: number;
  priority?: string;
  target_audience?: string;
  target_classes?: string;
  publish_date?: string;
  expiry_date?: string;
  is_published?: boolean;
  attachment_url?: string;
  created_by?: number;
  views_count?: number;
  school_id: number;
  created_at: string;
}

// REPORTS
export interface ReportTemplate {
  id: number;
  template_name: string;
  template_name_bn?: string;
  report_type: string;
  description?: string;
  data_source?: string;
  columns_config?: any;
  filters_config?: any;
  grouping_config?: any;
  aggregation_config?: any;
  chart_config?: any;
  is_public?: boolean;
  created_by?: number;
  school_id: number;
  created_at: string;
}
