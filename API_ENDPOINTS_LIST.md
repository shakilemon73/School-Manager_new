# Active Express Server API Endpoints

**Total Active Endpoints: 241**  
**Migrated to Supabase Direct: 15 ✅** (Updated: Oct 15, 2025)

This document lists all active Express API endpoints currently used in the School Management System.

## 🎯 Migration Progress
- ✅ **Authentication (8 endpoints)**: Using direct Supabase Auth with proper session management
- ✅ **Public Website (7 endpoints)**: Direct Supabase with RLS policies for public forms and read-only data
- 🔄 **In Progress**: Notifications, Calendar Events, Simple CRUD operations
- 📝 **Next**: Teacher Portal, School Admin, Document Generation, Super Admin

---

## 📊 Dashboard & Statistics

### Dashboard APIs
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/activities` - Get recent activities
- `GET /api/dashboard/documents` - Get dashboard documents
- `GET /api/supabase/dashboard/stats` - Get stats via Supabase
- `GET /api/supabase/dashboard/activities` - Get activities via Supabase
- `GET /api/supabase/dashboard/documents` - Get documents via Supabase

### System Stats
- `GET /api/admin/stats` - Get admin statistics
- `GET /api/admin/stats/public` - Get public admin stats
- `GET /api/school-admin/statistics` - Get school admin statistics
- `GET /api/supabase/school/stats` - Get school stats via Supabase
- `GET /api/super-admin/stats` - Get super admin statistics
- `GET /api/users/stats` - Get user statistics

---

## 👥 User Management & Authentication

### Authentication
- ✅ `POST /api/auth/login` - User login (MIGRATED: Direct Supabase Auth)
- ✅ `POST /api/auth/register` - User registration (MIGRATED: Direct Supabase Auth)
- ✅ `POST /api/auth/resend-confirmation` - Resend confirmation email (MIGRATED: Supabase)
- ✅ `POST /api/teacher/login` - Teacher login (MIGRATED: Direct Supabase Auth)
- ✅ `POST /api/teacher/logout` - Teacher logout (MIGRATED: Direct Supabase Auth)

### User CRUD Operations
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get specific user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PATCH /api/users/:id/status` - Update user status

### Auth User Management
- ✅ `GET /api/auth/users` - Get authenticated users (MIGRATED: Supabase Admin API)
- ✅ `GET /api/auth/users/:id` - Get specific auth user (MIGRATED: Supabase Admin API)
- ✅ `PATCH /api/auth/users/:id/status` - Update auth user status (MIGRATED: Supabase Admin API)

### Admin Users
- `GET /api/admin/users` - Get admin users
- `GET /api/admin/users/:id` - Get specific admin user
- `PATCH /api/admin/users/:id/status` - Update admin user status
- `GET /api/admin/profile` - Get admin profile
- `GET /api/admin/user-document-access` - Get user document access

### School Admin
- `GET /api/school-admin/dashboard` - Get school admin dashboard
- `GET /api/school-admin/permissions` - Get school admin permissions
- `POST /api/school-admin/backup` - Create school backup
- `POST /api/school-admin/restore` - Restore school data
- `POST /api/school-admin/upload/:type` - Upload school files
- `PUT /api/school-admin/settings/basic` - Update basic settings
- `PUT /api/school-admin/settings/branding` - Update branding settings
- `PUT /api/school-admin/settings/system` - Update system settings

### Supabase Admin
- `POST /api/supabase/admin/setup` - Setup Supabase admin
- `GET /api/supabase/admin/settings/:userId` - Get admin settings
- `POST /api/supabase/create-test-user` - Create test user

---

## 🎓 Student Management

### Students
- `GET /api/students` - Get all students (with filters: class, status, search)
- `GET /api/students/:id` - Get specific student
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `PATCH /api/students/:id` - Partially update student
- `DELETE /api/students/:id` - Delete student
- `GET /api/teacher/students/:classId` - Get students by class (teacher view)

### Student Portal
- Various student portal endpoints (registered via registerStudentPortalRoutes)

---

## 👨‍🏫 Teacher Management

### Teachers
- `GET /api/teachers` - Get all teachers (with filters: subject, status, search)
- `GET /api/teachers/:id` - Get specific teacher
- `POST /api/teachers` - Create new teacher
- `PUT /api/teachers/:id` - Update teacher
- `DELETE /api/teachers/:id` - Delete teacher
- `GET /api/teachers/stats` - Get teacher statistics

### Teacher Portal
- `GET /api/teacher/profile` - Get teacher profile
- `GET /api/teacher/classes` - Get teacher's classes
- `GET /api/teacher/subjects` - Get teacher's subjects
- `GET /api/teacher/stats` - Get teacher statistics
- `GET /api/teacher/assignments` - Get teacher assignments
- `GET /api/teacher/assignments/:id` - Get specific assignment
- `POST /api/teacher/assignments` - Create assignment
- `GET /api/teacher/lesson-plans` - Get lesson plans
- `GET /api/teacher/attendance` - Get attendance records
- `GET /api/teacher/attendance/:classId/:date` - Get class attendance by date

---

## 👪 Parent Management

### Parents
- `GET /api/parents` - Get all parents
- `GET /api/parents/:id` - Get specific parent
- `POST /api/parents` - Create new parent
- `PUT /api/parents/:id` - Update parent
- `DELETE /api/parents/:id` - Delete parent

---

## 📚 Academic Management

### Classes
- `GET /api/classes` - Get all classes
- `GET /api/classes/:id` - Get specific class
- `POST /api/classes` - Create new class
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class

### Class Routines (Timetables)
- `GET /api/class-routines` - Get all class routines
- `GET /api/class-routines/:id` - Get specific class routine
- `POST /api/class-routines` - Create class routine
- `PUT /api/class-routines/:id` - Update class routine
- `DELETE /api/class-routines/:id` - Delete class routine
- `POST /api/class-routines/:id/duplicate` - Duplicate class routine
- `GET /api/class-routines/stats` - Get class routine statistics
- `GET /api/class-routines/teachers` - Get teacher schedules
- `GET /api/class-routines/time-slots` - Get available time slots

### Periods
- `GET /api/periods` - Get all periods
- `POST /api/periods` - Create new period
- `PUT /api/periods/:id` - Update period
- `DELETE /api/periods/:id` - Delete period

### Academic Years
- `GET /api/academic-years` - Get all academic years
- `GET /api/academic-years/current` - Get current academic year
- `GET /api/academic-years/:id` - Get specific academic year
- `POST /api/academic-years` - Create academic year
- `PUT /api/academic-years/:id` - Update academic year
- `DELETE /api/academic-years/:id` - Delete academic year
- `PATCH /api/academic-years/:id/set-current` - Set current academic year
- `PATCH /api/academic-years/:id/status` - Update academic year status
- `GET /api/academic-years/stats` - Get academic year statistics

### Academic Terms
- `GET /api/academic-terms` - Get all academic terms
- `POST /api/academic-terms` - Create academic term
- `PUT /api/academic-terms/:id` - Update academic term
- `DELETE /api/academic-terms/:id` - Delete academic term
- `PATCH /api/academic-terms/:id/status` - Update term status

### Enhanced Academic Terms (Supabase)
- `GET /api/enhanced-academic-terms` - Get enhanced academic terms
- `GET /api/enhanced-academic-terms/:id` - Get specific enhanced term
- `PATCH /api/enhanced-academic-terms/:id/status` - Update enhanced term status

---

## 📝 Exams & Results

### Exams
- `GET /api/exams` - Get all exams
- `GET /api/exams/:id` - Get specific exam
- `POST /api/exams` - Create exam
- `PUT /api/exams/:id` - Update exam
- `DELETE /api/exams/:id` - Delete exam

### Exam Schedules
- `GET /api/exam-schedules` - Get exam schedules
- `POST /api/exam-schedules` - Create exam schedule
- `PUT /api/exam-schedules/:id` - Update exam schedule
- `DELETE /api/exam-schedules/:id` - Delete exam schedule

### Exam Results
- `GET /api/exam-results` - Get exam results
- `POST /api/exam-results` - Create exam result
- `PUT /api/exam-results/:id` - Update exam result
- `DELETE /api/exam-results/:id` - Delete exam result

---

## 📋 Attendance Management

### Attendance
- `GET /api/attendance` - Get attendance records (with filters: date, classId, studentId)
- `GET /api/attendance/:id` - Get specific attendance record
- `POST /api/attendance` - Create attendance records (bulk)
- `PUT /api/attendance/:id` - Update attendance record

---

## 💰 Financial Management

### Fee Receipts
- `GET /api/fee-receipts` - Get all fee receipts
- `GET /api/fee-receipts/:id` - Get specific fee receipt
- `POST /api/fee-receipts` - Create fee receipt
- `PUT /api/fee-receipts/:id` - Update fee receipt
- `DELETE /api/fee-receipts/:id` - Delete fee receipt

### Financial Transactions
- `GET /api/financial/transactions` - Get all financial transactions
- `GET /api/financial/transactions/:id` - Get specific transaction
- `POST /api/financial/transactions` - Create transaction
- `PUT /api/financial/transactions/:id` - Update transaction
- `DELETE /api/financial/transactions/:id` - Delete transaction
- `GET /api/financial-transactions` - Alternative transactions endpoint

### Financial Summary & Budgets
- `GET /api/financial/summary` - Get financial summary
- `GET /api/financial/budgets` - Get budgets
- `GET /api/financial/fee-structures` - Get fee structures
- `GET /api/financial/student-fees` - Get student fees
- `GET /api/finance/stats` - Get finance statistics
- `GET /api/finance/transactions` - Get finance transactions

### Payments
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Create payment
- `PATCH /api/payments/:id/status` - Update payment status
- `GET /api/payments/stats` - Get payment statistics

### Enhanced Payments (Supabase)
- `GET /api/enhanced-payments` - Get enhanced payments
- `POST /api/enhanced-payments` - Create enhanced payment
- `PATCH /api/enhanced-payments/:id/status` - Update enhanced payment status
- `GET /api/enhanced-payments/stats` - Get enhanced payment stats

---

## 📖 Library Management

### Books
- `GET /api/books` - Get all books
- `GET /api/books/:id` - Get specific book
- `POST /api/books` - Add new book
- `PUT /api/books/:id` - Update book
- `DELETE /api/books/:id` - Delete book

### Library (Supabase)
- `GET /api/library/books` - Get library books (Supabase)
- `POST /api/library/books` - Add library book (Supabase)
- `GET /api/library/borrowed` - Get borrowed books
- `POST /api/library/borrow` - Borrow book

### Book Issues
- `GET /api/book-issues` - Get book issues
- `POST /api/book-issues` - Issue book
- `PATCH /api/book-issues/:id/return` - Return book

---

## 📦 Inventory Management

### Inventory Items
- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory/:id` - Get specific inventory item
- `POST /api/inventory` - Create inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item
- `GET /api/inventory/export` - Export inventory

### Inventory Items (Alternative)
- `GET /api/inventory-items` - Get inventory items
- `GET /api/inventory/items` - Get items
- `GET /api/inventory/items/:id` - Get specific item
- `PATCH /api/inventory-items/:id/quantity` - Update item quantity

### Inventory Categories & Stats
- `GET /api/inventory-categories` - Get inventory categories
- `GET /api/inventory/stats` - Get inventory statistics
- `GET /api/inventory/movements` - Get inventory movements

---

## 🚌 Transport Management

### Transport Routes
- `GET /api/transport-routes` - Get transport routes
- `GET /api/transport/routes` - Alternative routes endpoint
- `POST /api/transport/routes` - Create transport route
- `PUT /api/transport/routes/:id` - Update transport route
- `DELETE /api/transport/routes/:id` - Delete transport route

### Vehicles
- `GET /api/vehicles` - Get all vehicles
- `GET /api/transport/vehicles` - Alternative vehicles endpoint
- `POST /api/transport/vehicles` - Create vehicle
- `PUT /api/transport/vehicles/:id` - Update vehicle
- `DELETE /api/transport/vehicles/:id` - Delete vehicle

### Transport Assignments
- `GET /api/transport-assignments` - Get transport assignments
- `GET /api/transport/assignments` - Alternative assignments endpoint
- `POST /api/transport/assignments` - Create assignment
- `PUT /api/transport/assignments/:id` - Update assignment
- `DELETE /api/transport/assignments/:id` - Delete assignment

### Transport Stats
- `GET /api/transport/stats` - Get transport statistics

---

## 🏢 Staff Management

### Staff
- `GET /api/staff` - Get all staff members
- `GET /api/staff/:id` - Get specific staff member
- `POST /api/staff` - Create staff member
- `PUT /api/staff/:id` - Update staff member
- `DELETE /api/staff/:id` - Delete staff member

---

## 📄 Document Management

### Document Templates
- `GET /api/document-templates` - Get all document templates
- `GET /api/document-templates/:id` - Get specific template
- `POST /api/document-templates` - Create template
- `PUT /api/document-templates/:id` - Update template
- `DELETE /api/document-templates/:id` - Delete template
- `PATCH /api/document-templates/:id/favorite` - Toggle favorite
- `POST /api/document-templates/:id/use` - Use template
- `GET /api/document-templates/stats` - Get template statistics

### Templates (Alternative)
- `GET /api/templates` - Get templates
- `GET /api/templates/:id` - Get specific template
- `PATCH /api/templates/:id/favorite` - Toggle favorite
- `POST /api/templates/:id/use` - Use template

### Enhanced Templates (Supabase)
- `GET /api/enhanced-templates` - Get enhanced templates
- `PATCH /api/enhanced-templates/:id/favorite` - Toggle enhanced template favorite

### Documents
- `GET /api/documents/templates` - Get document templates
- `GET /api/documents/templates/:docType` - Get templates by type
- `POST /api/documents/generate` - Generate document
- `GET /api/documents/recent` - Get recent documents
- `GET /api/documents/stats` - Get document statistics
- `GET /api/documents/user-stats` - Get user document statistics
- `POST /api/documents/track-usage` - Track document usage
- `GET /api/documents/check-permission/:documentId` - Check document permission
- `POST /api/documents/seed-templates` - Seed document templates

### Supabase Documents
- `GET /api/supabase/documents/templates` - Get Supabase templates
- `GET /api/supabase/documents/templates/:id` - Get specific Supabase template
- `GET /api/supabase/documents/categories` - Get document categories
- `GET /api/supabase/documents/user-stats` - Get user document stats

### School Documents
- `GET /api/schools/:schoolId/documents/templates` - Get school document templates
- `POST /api/schools/:schoolId/documents/generate` - Generate school document
- `GET /api/schools/:schoolId/documents/stats` - Get school document stats
- `GET /api/schools/:schoolId/documents/history` - Get school document history
- `POST /api/schools/:schoolId/documents/track-usage` - Track school document usage

### Document Permissions
- `GET /api/admin/document-permissions` - Get document permissions
- `POST /api/admin/document-permissions` - Create document permission
- `PUT /api/admin/document-permissions/:id` - Update document permission
- `DELETE /api/admin/document-permissions/:id` - Delete document permission
- `POST /api/admin/document-permissions/bulk` - Bulk update permissions

### Admin Document Templates
- `GET /api/admin/document-templates` - Get admin document templates
- `GET /api/admin/document-usage-stats` - Get document usage statistics

---

## 🎫 Admit Card Management

### Admit Cards
- Admit card generation endpoints (registered via registerAdmitCardRoutes)
- Bangladesh admit card specific endpoints (registered via registerBangladeshAdmitCardAPI)

---

## 🆔 ID Card Management

### ID Cards
- ID card generation endpoints (registered via registerIdCardRoutes)

---

## 📝 Testimonials & Forms

### Testimonials
- `GET /api/testimonials` - Get all testimonials
- `GET /api/testimonials/:id` - Get specific testimonial
- `POST /api/testimonials` - Create testimonial
- `PUT /api/testimonials/:id` - Update testimonial
- `DELETE /api/testimonials/:id` - Delete testimonial

### Public Website Forms (NEW - Direct Supabase with RLS)
- ✅ `POST /api/public/contact-messages` - Submit contact form (MIGRATED: Direct Supabase with public INSERT RLS)
- ✅ `POST /api/public/admission-applications` - Submit admission application (MIGRATED: Direct Supabase with public INSERT RLS)

### Public Website Read Endpoints (NEW - Direct Supabase)
- ✅ `GET /api/public/school-info` - Get school basic information (MIGRATED: Direct Supabase from school_settings)
- ✅ `GET /api/public/school-stats` - Get school statistics (MIGRATED: Direct Supabase with aggregations)
- ✅ `GET /api/public/upcoming-events` - Get upcoming calendar events (MIGRATED: Direct Supabase from calendar_events)
- ✅ `GET /api/public/latest-news` - Get latest news/notifications (MIGRATED: Direct Supabase from notifications)
- ✅ `GET /api/public/faculty` - Get faculty information (MIGRATED: Direct Supabase from teachers)

### Admission Forms
- `GET /api/admission-forms` - Get admission forms
- `GET /api/admission-forms/:id` - Get specific admission form
- `POST /api/admission-forms` - Create admission form
- `PUT /api/admission-forms/:id` - Update admission form
- `PATCH /api/admission-forms/:id/status` - Update form status

---

## 📅 Calendar & Events

### Calendar Events
- `GET /api/calendar/events` - Get all calendar events
- `GET /api/calendar/events/:id` - Get specific event
- `POST /api/calendar/events` - Create event
- `PUT /api/calendar/events/:id` - Update event
- `DELETE /api/calendar/events/:id` - Delete event
- `GET /api/calendar/events/today` - Get today's events
- `GET /api/calendar/events/upcoming` - Get upcoming events
- `GET /api/calendar/events/range/:startDate/:endDate` - Get events in date range

### Events (Alternative)
- `GET /api/events` - Get events

---

## 🔔 Notification Management

### Notifications
- `GET /api/notifications` - Get all notifications
- `POST /api/notifications` - Create notification
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/mark-all-read` - Mark all notifications as read

### Enhanced Notifications (Supabase)
- `GET /api/enhanced-notifications` - Get enhanced notifications
- `PATCH /api/enhanced-notifications/:id/read` - Mark enhanced notification as read

---

## 🎥 Video Conferencing

### Video Conferences
- `GET /api/video-conferences` - Get video conferences
- `POST /api/video-conferences` - Create video conference
- `POST /api/video-conferences/:id/join` - Join video conference
- `PATCH /api/video-conferences/:id/status` - Update conference status

---

## 🏫 School Settings & Configuration

### School Settings
- `GET /api/school-settings` - Get school settings
- `PUT /api/school-settings` - Update school settings
- `GET /api/school/settings` - Alternative school settings endpoint
- `GET /api/school/settings/:section` - Get specific settings section
- `GET /api/admin/settings` - Get admin settings

### School Information
- `GET /api/school/info` - Get school information
- `PUT /api/school/info` - Update school information
- `GET /api/enhanced-school/info` - Get enhanced school info

### School Branding
- `GET /api/school/branding` - Get school branding
- `PUT /api/school/branding` - Update school branding
- `GET /api/enhanced-school/branding` - Get enhanced school branding

### Enhanced School Settings (Supabase)
- `GET /api/enhanced-school/settings` - Get enhanced school settings
- `PUT /api/enhanced-school/settings` - Update enhanced school settings

### Schools Management
- `GET /api/schools` - Get all schools
- `POST /api/schools` - Create school
- `PUT /api/schools/:id` - Update school
- `DELETE /api/schools/:id` - Delete school

### Supabase School Settings
- `GET /api/supabase/school/settings` - Get Supabase school settings
- `POST /api/supabase/school/backup` - Backup school data
- `POST /api/supabase/school/restore` - Restore school data
- `GET /api/supabase/school/data` - Get school data
- `POST /api/supabase/school/upload/:type` - Upload school files

### Public School Settings
- `GET /api/public/school/settings` - Get public school settings
- `PUT /api/public/school/settings/update` - Update public school settings

---

## 🔧 System Administration

### Health Checks
- `GET /api/health` - System health check
- `GET /api/ping` - System ping
- `GET /api/system/health` - System health status
- `GET /api/system/status` - System status
- `GET /api/admin/system/health/public` - Public system health
- `GET /api/supabase/health` - Supabase health check
- `GET /api/public/supabase/health` - Public Supabase health check

### System Setup & Configuration
- `GET /api/setup/status` - Get setup status
- `POST /api/setup/create-school` - Create school setup
- `POST /api/setup/validate` - Validate setup
- `GET /api/setup/progress/:schoolId` - Get setup progress
- `POST /api/setup/document-schema` - Setup document schema

### Database & Testing
- `POST /api/fix-database-schema` - Fix database schema
- `POST /api/test/create-tables` - Create test tables
- `GET /api/test/dashboard-supabase` - Test dashboard Supabase connection
- `GET /api/test/database` - Test database connection
- `GET /api/test-env-config` - Test environment configuration
- `GET /api/test-library` - Test library endpoint
- `GET /api/supabase/test-connection` - Test Supabase connection

### Security
- `GET /api/security-audit` - Run security audit

---

## 💳 Subscription & Billing

### Subscriptions
- `GET /api/subscription/plans` - Get subscription plans
- `POST /api/subscription/create` - Create subscription
- `GET /api/subscription/current/:schoolId` - Get current subscription
- `GET /api/subscription/usage/:schoolId` - Get subscription usage
- `GET /api/subscription/billing/:schoolId` - Get billing information
- `GET /api/subscription/feature-access/:schoolId/:feature` - Check feature access
- `POST /api/subscription/track-usage` - Track subscription usage

### Pricing Plans
- `GET /api/pricing-plans` - Get pricing plans
- `GET /api/admin/pricing-plans` - Get admin pricing plans
- `GET /api/admin/pricing-plans/:id` - Get specific pricing plan
- `POST /api/admin/pricing-plans` - Create pricing plan
- `PUT /api/admin/pricing-plans/:id` - Update pricing plan
- `DELETE /api/admin/pricing-plans/:id` - Delete pricing plan

---

## 🏗️ School Provisioning

### Provisioning
- `POST /api/provisioning/onboard` - Onboard new school
- `GET /api/provisioning/status/:schoolId` - Get provisioning status
- `POST /api/provisioning/setup-supabase/:schoolId` - Setup Supabase for school
- `POST /api/provisioning/suspend/:schoolId` - Suspend school
- `POST /api/provisioning/reactivate/:schoolId` - Reactivate school

---

## 🔑 Super Admin

### Super Admin Schools
- `GET /api/super-admin/schools` - Get all schools (super admin)
- `POST /api/super-admin/schools/create` - Create school (super admin)
- `POST /api/super-admin/schools/:id/action` - Perform school action
- `GET /api/super-admin/schools/permissions` - Get school permissions
- `POST /api/super-admin/schools/:schoolId/bulk-permissions` - Bulk update permissions
- `POST /api/super-admin/schools/:schoolId/document/:documentTypeId/permission` - Set document permission
- `POST /api/super-admin/schools/:schoolId/grant-document/:documentTypeId` - Grant document access
- `POST /api/super-admin/schools/:schoolId/revoke-document/:documentTypeId` - Revoke document access

### Super Admin Analytics
- `GET /api/super-admin/analytics/document-usage` - Get document usage analytics
- `GET /api/super-admin/user-analytics` - Get user analytics

### Super Admin Document Types
- `GET /api/super-admin/document-types` - Get document types

---

## 🛠️ Miscellaneous

### Tools
- `GET /api/tools` - Get available tools

### Real-time
- Real-time database endpoints (registered via registerRealtimeRoutes)

---

## 📊 Summary by Category

| Category | Endpoint Count |
|----------|---------------|
| Dashboard & Statistics | 12 |
| User Management & Authentication | 30+ |
| Student Management | 10 |
| Teacher Management | 15 |
| Parent Management | 5 |
| Academic Management | 40+ |
| Exams & Results | 12 |
| Attendance | 5 |
| Financial Management | 25+ |
| Library Management | 10 |
| Inventory Management | 15 |
| Transport Management | 12 |
| Staff Management | 5 |
| Document Management | 35+ |
| Admit Card & ID Card | Various |
| Testimonials & Forms | 8 |
| Calendar & Events | 8 |
| Notifications | 6 |
| Video Conferencing | 4 |
| School Settings | 20+ |
| System Administration | 15 |
| Subscription & Billing | 12 |
| School Provisioning | 5 |
| Super Admin | 10+ |

---

**Last Updated:** October 13, 2025  
**Total Active Endpoints:** 241

---

## Notes

1. **Authentication:** Most endpoints require authentication via Supabase Auth
2. **Multi-tenant:** Endpoints are filtered by school_id for multi-tenant isolation
3. **Database:** Uses both Replit PostgreSQL and Supabase
4. **Security:** Row Level Security (RLS) enforced at database level
5. **API Versioning:** Currently using v1 (implicit in /api prefix)

## Common Query Parameters

- `?class=X` - Filter by class
- `?status=X` - Filter by status (active, inactive, etc.)
- `?search=X` - Search by name/ID
- `?date=YYYY-MM-DD` - Filter by date
- `?schoolId=X` - Filter by school (multi-tenant)
