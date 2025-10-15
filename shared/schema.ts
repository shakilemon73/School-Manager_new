import { 
  pgTable, 
  serial, 
  text, 
  integer, 
  decimal, 
  boolean, 
  timestamp, 
  date, 
  time, 
  json 
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table - Enhanced for portal system (renamed to avoid Supabase conflicts)
export const users = pgTable("app_users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").default("user").notNull(), // super_admin (system owner), school_admin (school owner), teacher, student, parent
  schoolId: integer("school_id"),
  studentId: integer("student_id"), // For parent accounts to link to their children
  credits: integer("credits").default(0),
  isActive: boolean("is_active").default(true),
  isAdmin: boolean("is_admin").default(false),
  lastLogin: timestamp("last_login"),
  profilePicture: text("profile_picture"),
  phoneNumber: text("phone_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Schools table
export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  principalName: text("principal_name"),
  principalPhone: text("principal_phone"),
  establishedYear: integer("established_year"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSchoolSchema = createInsertSchema(schools);
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schools.$inferSelect;

// Library Books table
export const libraryBooks = pgTable("library_books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleBn: text("title_bn").notNull(),
  author: text("author").notNull(),
  isbn: text("isbn"),
  category: text("category").notNull(),
  publisher: text("publisher"),
  publishYear: integer("publish_year"),
  totalCopies: integer("total_copies").default(1).notNull(),
  availableCopies: integer("available_copies").default(1).notNull(),
  location: text("location").notNull(),
  description: text("description"),
  schoolId: integer("school_id").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const libraryBooksInsertSchema = createInsertSchema(libraryBooks);
export type InsertLibraryBook = z.infer<typeof libraryBooksInsertSchema>;
export type LibraryBook = typeof libraryBooks.$inferSelect;

// Students table (moved up to resolve forward reference)
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameInBangla: text("name_in_bangla"),
  studentId: text("student_id").unique().notNull(),
  class: text("class"),
  section: text("section"),
  rollNumber: text("roll_number"),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"),
  bloodGroup: text("blood_group"),
  fatherName: text("father_name"),
  fatherNameInBangla: text("father_name_in_bangla"),
  motherName: text("mother_name"),
  motherNameInBangla: text("mother_name_in_bangla"),
  guardianName: text("guardian_name"),
  guardianPhone: text("guardian_phone"),
  guardianRelation: text("guardian_relation"),
  presentAddress: text("present_address"),
  permanentAddress: text("permanent_address"),
  village: text("village"),
  postOffice: text("post_office"),
  thana: text("thana"),
  district: text("district"),
  division: text("division"),
  phone: text("phone"),
  email: text("email"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactRelation: text("emergency_contact_relation"),
  emergencyContactPhone: text("emergency_contact_phone"),
  schoolId: integer("school_id"),
  status: text("status").default("active"),
  photo: text("photo"),
  idCardIssueDate: date("id_card_issue_date"),
  idCardValidUntil: date("id_card_valid_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studentInsertSchema = createInsertSchema(students);
export type InsertStudent = z.infer<typeof studentInsertSchema>;
export type Student = typeof students.$inferSelect;

// Student Import Batches table - tracks bulk imports from Excel/CSV files
export const studentImportBatches = pgTable("student_import_batches", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  totalRecords: integer("total_records").notNull(),
  successfulImports: integer("successful_imports").default(0),
  failedImports: integer("failed_imports").default(0),
  status: text("status").default("processing").notNull(), // processing, completed, failed
  errorLog: json("error_log"), // Array of error messages
  uploadedBy: text("uploaded_by"), // User ID who uploaded
  schoolId: integer("school_id").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const studentImportBatchesInsertSchema = createInsertSchema(studentImportBatches);
export type InsertStudentImportBatch = z.infer<typeof studentImportBatchesInsertSchema>;
export type StudentImportBatch = typeof studentImportBatches.$inferSelect;

// Library Borrowed Books table
export const libraryBorrowedBooks = pgTable("library_borrowed_books", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").references(() => libraryBooks.id).notNull(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  borrowDate: date("borrow_date").defaultNow().notNull(),
  dueDate: date("due_date").notNull(),
  returnDate: date("return_date"),
  status: text("status").default("active").notNull(), // active, returned, overdue
  fine: decimal("fine", { precision: 8, scale: 2 }).default("0"),
  notes: text("notes"),
  schoolId: integer("school_id").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const libraryBorrowedBooksInsertSchema = createInsertSchema(libraryBorrowedBooks);
export type InsertLibraryBorrowedBook = z.infer<typeof libraryBorrowedBooksInsertSchema>;
export type LibraryBorrowedBook = typeof libraryBorrowedBooks.$inferSelect;

// Video Conferences table
export const videoConferences = pgTable("video_conferences", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn").notNull(),
  subject: text("subject").notNull(),
  host: text("host").notNull(),
  status: text("status").default("upcoming").notNull(), // live, upcoming, ended
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  participants: integer("participants").default(0),
  maxParticipants: integer("max_participants").default(100),
  meetingId: text("meeting_id").unique().notNull(),
  isRecording: boolean("is_recording").default(false),
  recordingUrl: text("recording_url"),
  schoolId: integer("school_id").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videoConferencesInsertSchema = createInsertSchema(videoConferences);
export type InsertVideoConference = z.infer<typeof videoConferencesInsertSchema>;
export type VideoConference = typeof videoConferences.$inferSelect;

// Enhanced Notifications table - removing duplicate, updating existing one

// Payment Gateway Transactions table
export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  transactionId: text("transaction_id").unique().notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("BDT").notNull(),
  paymentMethod: text("payment_method").notNull(), // bkash, nagad, rocket, card
  status: text("status").default("pending").notNull(), // pending, success, failed, cancelled
  payerName: text("payer_name").notNull(),
  payerPhone: text("payer_phone").notNull(),
  description: text("description").notNull(),
  descriptionBn: text("description_bn").notNull(),
  studentId: integer("student_id").references(() => students.id),
  schoolId: integer("school_id").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const paymentTransactionsInsertSchema = createInsertSchema(paymentTransactions);
export type InsertPaymentTransaction = z.infer<typeof paymentTransactionsInsertSchema>;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;

// Document Templates table
export const documentTemplates = pgTable("document_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  categoryBn: text("category_bn").notNull(),
  description: text("description").notNull(),
  descriptionBn: text("description_bn").notNull(),
  template: json("template"),
  preview: text("preview"),
  isGlobal: boolean("is_global").default(false),
  isDefault: boolean("is_default").default(false),
  isFavorite: boolean("is_favorite").default(false),
  thumbnailColor: text("thumbnail_color").default("#3b82f6"),
  settings: json("settings"),
  tags: text("tags").array().default([]),
  requiredCredits: integer("required_credits").default(1),
  isActive: boolean("is_active").default(true),
  version: text("version").default("1.0"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  icon: text("icon"),
  difficulty: text("difficulty").default("easy"),
  estimatedTime: text("estimated_time"),
  isPopular: boolean("is_popular").default(false),
  usageCount: integer("usage_count").default(0),
  lastUsed: timestamp("last_used"),
  schoolId: integer("school_id").default(1).notNull(),
});

export const documentTemplatesInsertSchema = createInsertSchema(documentTemplates);
export type InsertDocumentTemplate = z.infer<typeof documentTemplatesInsertSchema>;
export type DocumentTemplate = typeof documentTemplates.$inferSelect;

// Academic Years table
export const academicYears = pgTable("academic_years", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").default(false),
  isCurrent: boolean("is_current").default(false),
  description: text("description"),
  descriptionBn: text("description_bn"),
  totalStudents: integer("total_students").default(0),
  totalClasses: integer("total_classes").default(0),
  totalTerms: integer("total_terms").default(0),
  status: text("status").default("draft").notNull(), // draft, active, completed, archived
  schoolId: integer("school_id").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const academicYearsInsertSchema = createInsertSchema(academicYears);
export type InsertAcademicYear = z.infer<typeof academicYearsInsertSchema>;
export type AcademicYear = typeof academicYears.$inferSelect;

// Academic Terms table
export const academicTerms = pgTable("academic_terms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn").notNull(),
  academicYearId: integer("academic_year_id").references(() => academicYears.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").default(false),
  description: text("description"),
  descriptionBn: text("description_bn"),
  examScheduled: boolean("exam_scheduled").default(false),
  resultPublished: boolean("result_published").default(false),
  status: text("status").default("upcoming").notNull(), // upcoming, ongoing, completed
  schoolId: integer("school_id").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const academicTermsInsertSchema = createInsertSchema(academicTerms);
export type InsertAcademicTerm = z.infer<typeof academicTermsInsertSchema>;
export type AcademicTerm = typeof academicTerms.$inferSelect;

// Legacy school settings - removed to avoid duplication



// Inventory Items table
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  brand: text("brand"),
  model: text("model"),
  serialNumber: text("serial_number"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).default("0"),
  currentQuantity: integer("current_quantity").default(0).notNull(),
  minimumThreshold: integer("minimum_threshold").default(10).notNull(),
  unit: text("unit").notNull(),
  supplier: text("supplier"),
  location: text("location").notNull(),
  condition: text("condition").notNull(),
  description: text("description"),
  schoolId: integer("school_id").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inventoryItemsInsertSchema = createInsertSchema(inventoryItems);
export type InsertInventoryItem = z.infer<typeof inventoryItemsInsertSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

// Inventory Movements table
export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => inventoryItems.id).notNull(),
  type: text("type").notNull(), // in, out, adjustment
  quantity: integer("quantity").notNull(),
  reason: text("reason").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  schoolId: integer("school_id").default(1).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryMovementsInsertSchema = createInsertSchema(inventoryMovements);
export type InsertInventoryMovement = z.infer<typeof inventoryMovementsInsertSchema>;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;

// Transport Routes table
export const transportRoutes = pgTable("transport_routes", {
  id: serial("id").primaryKey(),
  routeName: text("route_name").notNull(),
  pickupPoints: text("pickup_points"),
  timings: text("timings"),
  monthlyFee: decimal("monthly_fee", { precision: 8, scale: 2 }).notNull(),
  schoolId: integer("school_id").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transportRoutesInsertSchema = createInsertSchema(transportRoutes);
export type InsertTransportRoute = z.infer<typeof transportRoutesInsertSchema>;
export type TransportRoute = typeof transportRoutes.$inferSelect;

// Transport Vehicles table
export const transportVehicles = pgTable("transport_vehicles", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull(),
  type: text("type").notNull(),
  capacity: integer("capacity").notNull(),
  driverName: text("driver_name").notNull(),
  driverPhone: text("driver_phone").notNull(),
  helperName: text("helper_name"),
  helperPhone: text("helper_phone"),
  routeId: integer("route_id").references(() => transportRoutes.id),
  isActive: boolean("is_active").default(true),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transportVehiclesInsertSchema = createInsertSchema(transportVehicles);
export type InsertTransportVehicle = z.infer<typeof transportVehiclesInsertSchema>;
export type TransportVehicle = typeof transportVehicles.$inferSelect;

// Transport Student Assignments table
export const transportStudentAssignments = pgTable("transport_student_assignments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  routeId: integer("route_id").references(() => transportRoutes.id).notNull(),
  vehicleId: integer("vehicle_id").references(() => transportVehicles.id),
  pickupPoint: text("pickup_point").notNull(),
  dropPoint: text("drop_point").notNull(),
  monthlyFee: decimal("monthly_fee", { precision: 8, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  schoolId: integer("school_id").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transportStudentAssignmentsInsertSchema = createInsertSchema(transportStudentAssignments);
export type InsertTransportStudentAssignment = z.infer<typeof transportStudentAssignmentsInsertSchema>;
export type TransportStudentAssignment = typeof transportStudentAssignments.$inferSelect;

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleBn: text("title_bn").notNull(),
  message: text("message").notNull(),
  messageBn: text("message_bn").notNull(),
  type: text("type").default("info").notNull(),
  priority: text("priority").default("medium").notNull(),
  category: text("category").notNull(),
  categoryBn: text("category_bn").notNull(),
  recipientId: integer("recipient_id").references(() => users.id),
  recipientType: text("recipient_type").default("user").notNull(), // user, admin, public
  sender: text("sender"),
  isRead: boolean("is_read").default(false),
  isLive: boolean("is_live").default(false),
  isActive: boolean("is_active").default(true),
  isPublic: boolean("is_public").default(false),
  actionRequired: boolean("action_required").default(false),
  readAt: timestamp("read_at"),
  schoolId: integer("school_id").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationsInsertSchema = createInsertSchema(notifications);
export type InsertNotification = z.infer<typeof notificationsInsertSchema>;
export type Notification = typeof notifications.$inferSelect;

// Contact Messages table (Public website form submissions)
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").default("pending").notNull(), // pending, read, responded, archived
  schoolId: integer("school_id").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
  respondedBy: integer("responded_by"),
});

export const contactMessagesInsertSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
  respondedBy: true,
});
export type InsertContactMessage = z.infer<typeof contactMessagesInsertSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;

// Admission Applications table (Public website admission submissions)
export const admissionApplications = pgTable("admission_applications", {
  id: serial("id").primaryKey(),
  studentName: text("student_name").notNull(),
  studentNameBn: text("student_name_bn").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  class: text("class").notNull(),
  fatherName: text("father_name").notNull(),
  motherName: text("mother_name").notNull(),
  guardianPhone: text("guardian_phone").notNull(),
  address: text("address").notNull(),
  previousSchool: text("previous_school"),
  email: text("email"),
  status: text("status").default("pending").notNull(), // pending, reviewed, approved, rejected, enrolled
  applicationNumber: text("application_number").unique(),
  schoolId: integer("school_id").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by"),
  notes: text("notes"),
});

export const admissionApplicationsInsertSchema = createInsertSchema(admissionApplications).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  reviewedBy: true,
  applicationNumber: true,
});
export type InsertAdmissionApplication = z.infer<typeof admissionApplicationsInsertSchema>;
export type AdmissionApplication = typeof admissionApplications.$inferSelect;



// Classes table
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameInBangla: text("name_in_bangla"),
  capacity: integer("capacity").default(30),
  schoolId: integer("school_id").references(() => schools.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const classInsertSchema = createInsertSchema(classes);
export type InsertClass = z.infer<typeof classInsertSchema>;
export type Class = typeof classes.$inferSelect;

// Financial Transactions table
export const financialTransactions = pgTable("financial_transactions", {
  id: serial("id").primaryKey(),
  transactionType: text("transaction_type").notNull(), // income, expense
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
  description: text("description"),
  paymentMethod: text("payment_method").notNull(),
  referenceNumber: text("reference_number"),
  schoolId: integer("school_id").default(1).notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const financialTransactionInsertSchema = createInsertSchema(financialTransactions);
export type InsertFinancialTransaction = z.infer<typeof financialTransactionInsertSchema>;
export type FinancialTransaction = typeof financialTransactions.$inferSelect;

// Calendar Events table
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleBn: text("title_bn"),
  description: text("description"),
  descriptionBn: text("description_bn"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  startTime: time("start_time"),
  endTime: time("end_time"),
  type: text("type").default("event").notNull(), // event, holiday, exam, meeting
  isActive: boolean("is_active").default(true),
  isPublic: boolean("is_public").default(false),
  location: text("location"),
  organizer: text("organizer"),
  attendees: json("attendees"),
  schoolId: integer("school_id").default(1).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const calendarEventsInsertSchema = createInsertSchema(calendarEvents);
export type InsertCalendarEvent = z.infer<typeof calendarEventsInsertSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;



// School Document Permissions table - Controls which document types each school can access
export const schoolDocumentPermissions = pgTable("school_document_permissions", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id).notNull(),
  documentTypeId: integer("document_type_id").references(() => documentTemplates.id).notNull(),
  isAllowed: boolean("is_allowed").default(false).notNull(),
  creditsPerUse: integer("credits_per_use").default(1).notNull(),
  grantedAt: timestamp("granted_at"),
  revokedAt: timestamp("revoked_at"),
  grantedBy: text("granted_by"), // Provider admin ID
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const schoolDocumentPermissionsInsertSchema = createInsertSchema(schoolDocumentPermissions);
export type InsertSchoolDocumentPermission = z.infer<typeof schoolDocumentPermissionsInsertSchema>;
export type SchoolDocumentPermission = typeof schoolDocumentPermissions.$inferSelect;

// School Settings table - Enhanced for complete school configuration
export const schoolSettings = pgTable("school_settings", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id).notNull().default(1),
  
  // Basic Information
  name: text("name").notNull(),
  nameInBangla: text("name_in_bangla").notNull(),
  address: text("address").notNull(),
  addressInBangla: text("address_in_bangla").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  website: text("website"),
  
  // School Details
  schoolType: text("school_type").default("school").notNull(), // school, college, madrasha, nurani
  establishmentYear: integer("establishment_year").notNull(),
  eiin: text("eiin"),
  registrationNumber: text("registration_number"),
  principalName: text("principal_name"),
  principalPhone: text("principal_phone"),
  description: text("description"),
  descriptionInBangla: text("description_in_bangla"),
  
  // Branding & Visual
  primaryColor: text("primary_color").default("#3B82F6"),
  secondaryColor: text("secondary_color").default("#10B981"),
  accentColor: text("accent_color").default("#F59E0B"),
  motto: text("motto"),
  mottoBn: text("motto_bn"),
  useWatermark: boolean("use_watermark").default(true),
  useLetterhead: boolean("use_letterhead").default(true),
  logoUrl: text("logo_url"),
  
  // System Settings
  timezone: text("timezone").default("Asia/Dhaka"),
  language: text("language").default("bn"), // bn, en, both
  dateFormat: text("date_format").default("DD/MM/YYYY"),
  currency: text("currency").default("BDT"),
  academicYearStart: text("academic_year_start").default("01/01"),
  weekStartsOn: text("week_starts_on").default("sunday"), // sunday, monday
  
  // Features & Notifications
  enableNotifications: boolean("enable_notifications").default(true),
  enableSMS: boolean("enable_sms").default(false),
  enableEmail: boolean("enable_email").default(true),
  autoBackup: boolean("auto_backup").default(true),
  dataRetention: integer("data_retention").default(365), // days
  
  // Limits
  maxStudents: integer("max_students").default(500),
  maxTeachers: integer("max_teachers").default(50),
  allowOnlinePayments: boolean("allow_online_payments").default(false),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const schoolSettingsInsertSchema = createInsertSchema(schoolSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSchoolSettings = z.infer<typeof schoolSettingsInsertSchema>;
export type SchoolSettings = typeof schoolSettings.$inferSelect;

// Admin Settings table - For admin user preferences and system settings
export const adminSettings = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  // Profile Settings
  displayName: text("display_name"),
  bio: text("bio"),
  profilePicture: text("profile_picture"),
  contactPhone: text("contact_phone"),
  emergencyContact: text("emergency_contact"),
  
  // Preferences
  language: text("language").default("bn"), // bn, en, both
  darkMode: boolean("dark_mode").default(false),
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  pushNotifications: boolean("push_notifications").default(true),
  
  // Security Settings
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  sessionTimeout: integer("session_timeout").default(60), // minutes
  passwordExpiry: integer("password_expiry").default(90), // days
  allowMultipleSessions: boolean("allow_multiple_sessions").default(false),
  
  // Dashboard Preferences
  defaultDashboard: text("default_dashboard").default("overview"),
  sidebarCollapsed: boolean("sidebar_collapsed").default(false),
  showWelcomeMessage: boolean("show_welcome_message").default(true),
  itemsPerPage: integer("items_per_page").default(25),
  
  // System Administration
  maintenanceMode: boolean("maintenance_mode").default(false),
  systemBackupEnabled: boolean("system_backup_enabled").default(true),
  debugMode: boolean("debug_mode").default(false),
  logLevel: text("log_level").default("info"), // debug, info, warn, error
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const adminSettingsInsertSchema = createInsertSchema(adminSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAdminSettings = z.infer<typeof adminSettingsInsertSchema>;
export type AdminSettings = typeof adminSettings.$inferSelect;

// Pricing Plans table
export const pricingPlans = pgTable("pricing_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("BDT"),
  duration: text("duration").notNull(), // monthly, yearly, lifetime
  features: json("features").notNull(),
  featuresBn: json("features_bn").notNull(),
  maxStudents: integer("max_students").notNull(),
  maxTeachers: integer("max_teachers").notNull(),
  maxStorage: integer("max_storage").notNull(), // in GB
  supportLevel: text("support_level").notNull(), // basic, premium, enterprise
  isPopular: boolean("is_popular").default(false),
  isActive: boolean("is_active").default(true),
  description: text("description"),
  descriptionBn: text("description_bn"),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pricingPlansInsertSchema = createInsertSchema(pricingPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPricingPlan = z.infer<typeof pricingPlansInsertSchema>;
export type PricingPlan = typeof pricingPlans.$inferSelect;

// Relations
export const studentsRelations = relations(students, ({ one, many }) => ({
  school: one(schools, { fields: [students.schoolId], references: [schools.id] }),
  borrowedBooks: many(libraryBorrowedBooks),
  transportAssignments: many(transportStudentAssignments),
}));

export const libraryBooksRelations = relations(libraryBooks, ({ many }) => ({
  borrowedBooks: many(libraryBorrowedBooks),
}));

export const libraryBorrowedBooksRelations = relations(libraryBorrowedBooks, ({ one }) => ({
  book: one(libraryBooks, { fields: [libraryBorrowedBooks.bookId], references: [libraryBooks.id] }),
  student: one(students, { fields: [libraryBorrowedBooks.studentId], references: [students.id] }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  movements: many(inventoryMovements),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  item: one(inventoryItems, { fields: [inventoryMovements.itemId], references: [inventoryItems.id] }),
  createdBy: one(users, { fields: [inventoryMovements.createdBy], references: [users.id] }),
}));

export const transportRoutesRelations = relations(transportRoutes, ({ many }) => ({
  studentAssignments: many(transportStudentAssignments),
}));

export const transportVehiclesRelations = relations(transportVehicles, ({ many }) => ({
  studentAssignments: many(transportStudentAssignments),
}));

export const transportStudentAssignmentsRelations = relations(transportStudentAssignments, ({ one }) => ({
  student: one(students, { fields: [transportStudentAssignments.studentId], references: [students.id] }),
  route: one(transportRoutes, { fields: [transportStudentAssignments.routeId], references: [transportRoutes.id] }),
  vehicle: one(transportVehicles, { fields: [transportStudentAssignments.vehicleId], references: [transportVehicles.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, { fields: [notifications.recipientId], references: [users.id] }),
}));

export const schoolsRelations = relations(schools, ({ many }) => ({
  students: many(students),
  classes: many(classes),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  school: one(schools, { fields: [classes.schoolId], references: [schools.id] }),
  students: many(students),
}));

export const financialTransactionsRelations = relations(financialTransactions, ({ one }) => ({
  createdBy: one(users, { fields: [financialTransactions.createdBy], references: [users.id] }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  createdBy: one(users, { fields: [calendarEvents.createdBy], references: [users.id] }),
}));

// Credit Packages table
export const creditPackages = pgTable("credit_packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  credits: integer("credits").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creditPackageInsertSchema = createInsertSchema(creditPackages);
export type InsertCreditPackage = z.infer<typeof creditPackageInsertSchema>;
export type CreditPackage = typeof creditPackages.$inferSelect;

// Credit Transactions table
export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  packageId: integer("package_id").references(() => creditPackages.id),
  type: text("type").notNull(), // purchase, usage, refund
  credits: integer("credits").notNull(),
  amount: text("amount"),
  description: text("description"),
  reference: text("reference"),
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  paymentNumber: text("payment_number"),
  status: text("status").default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creditTransactionInsertSchema = createInsertSchema(creditTransactions);
export type InsertCreditTransaction = z.infer<typeof creditTransactionInsertSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;

// Credit Usage Logs table
export const creditUsageLogs = pgTable("credit_usage_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  feature: text("feature").notNull(),
  credits: integer("credits").notNull(),
  description: text("description"),
  documentId: integer("document_id"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creditUsageLogInsertSchema = createInsertSchema(creditUsageLogs);
export type InsertCreditUsageLog = z.infer<typeof creditUsageLogInsertSchema>;
export type CreditUsageLog = typeof creditUsageLogs.$inferSelect;

// Templates table
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  content: json("content").notNull(),
  schoolId: integer("school_id").references(() => schools.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const templateInsertSchema = createInsertSchema(templates);
export type InsertTemplate = z.infer<typeof templateInsertSchema>;
export type Template = typeof templates.$inferSelect;

// Fee Receipts table
export const feeReceipts = pgTable("fee_receipts", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  receiptNumber: text("receipt_number").unique().notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).notNull(),
  dueAmount: decimal("due_amount", { precision: 10, scale: 2 }).default("0"),
  paymentMethod: text("payment_method"),
  paymentDate: date("payment_date").defaultNow().notNull(),
  academicYear: text("academic_year").notNull(),
  month: text("month"),
  status: text("status").default("paid").notNull(),
  notes: text("notes"),
  schoolId: integer("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const feeReceiptInsertSchema = createInsertSchema(feeReceipts);
export type InsertFeeReceipt = z.infer<typeof feeReceiptInsertSchema>;
export type FeeReceipt = typeof feeReceipts.$inferSelect;

// Fee Items table
export const feeItems = pgTable("fee_items", {
  id: serial("id").primaryKey(),
  receiptId: integer("receipt_id").references(() => feeReceipts.id).notNull(),
  itemName: text("item_name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
});

export const feeItemInsertSchema = createInsertSchema(feeItems);
export type InsertFeeItem = z.infer<typeof feeItemInsertSchema>;
export type FeeItem = typeof feeItems.$inferSelect;

// Teachers table
export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  teacherId: text("teacher_id").unique().notNull(),
  name: text("name").notNull(),
  qualification: text("qualification"),
  subject: text("subject"),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  schoolId: integer("school_id"),
  status: text("status").default("active").notNull(),
  photo: text("photo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teacherInsertSchema = createInsertSchema(teachers);
export type InsertTeacher = z.infer<typeof teacherInsertSchema>;
export type Teacher = typeof teachers.$inferSelect;

// Staff table
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  staffId: text("staff_id").unique().notNull(),
  name: text("name").notNull(),
  nameInBangla: text("name_in_bangla"),
  department: text("department"),
  designation: text("designation"),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  joinDate: date("join_date"),
  salary: integer("salary"),
  schoolId: integer("school_id"),
  status: text("status").default("active").notNull(),
  photo: text("photo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const staffInsertSchema = createInsertSchema(staff);
export type InsertStaff = z.infer<typeof staffInsertSchema>;
export type Staff = typeof staff.$inferSelect;

// Parents table
export const parents = pgTable("parents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameInBangla: text("name_in_bangla"),
  phone: text("phone").notNull(),
  email: text("email"),
  occupation: text("occupation"),
  address: text("address"),
  relation: text("relation").notNull(), // father, mother, guardian
  schoolId: integer("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const parentInsertSchema = createInsertSchema(parents);
export type InsertParent = z.infer<typeof parentInsertSchema>;
export type Parent = typeof parents.$inferSelect;



// Generated Documents table
export const generatedDocuments = pgTable("generated_documents", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => documentTemplates.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  documentData: json("document_data").notNull(),
  generatedPdf: text("generated_pdf"), // URL or file path
  status: text("status").default("generated"), // generated, downloaded, archived
  creditsUsed: integer("credits_used").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  schoolId: integer("school_id").references(() => schools.id),
});

export const generatedDocumentInsertSchema = createInsertSchema(generatedDocuments);
export type InsertGeneratedDocument = z.infer<typeof generatedDocumentInsertSchema>;
export type GeneratedDocument = typeof generatedDocuments.$inferSelect;

// Document Statistics table
export const documentStats = pgTable("document_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  templateId: integer("template_id").references(() => documentTemplates.id).notNull(),
  totalGenerated: integer("total_generated").default(0),
  lastGenerated: timestamp("last_generated"),
  schoolId: integer("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documentStatsInsertSchema = createInsertSchema(documentStats);
export type InsertDocumentStats = z.infer<typeof documentStatsInsertSchema>;
export type DocumentStats = typeof documentStats.$inferSelect;

export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, { fields: [users.schoolId], references: [schools.id] }),
  notifications: many(notifications),
  financialTransactions: many(financialTransactions),
  calendarEvents: many(calendarEvents),
  inventoryMovements: many(inventoryMovements),
  creditTransactions: many(creditTransactions),
  creditUsageLogs: many(creditUsageLogs),
  generatedDocuments: many(generatedDocuments),
  documentStats: many(documentStats),
}));

export const creditPackagesRelations = relations(creditPackages, ({ many }) => ({
  transactions: many(creditTransactions),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, { fields: [creditTransactions.userId], references: [users.id] }),
  package: one(creditPackages, { fields: [creditTransactions.packageId], references: [creditPackages.id] }),
}));

export const creditUsageLogsRelations = relations(creditUsageLogs, ({ one }) => ({
  user: one(users, { fields: [creditUsageLogs.userId], references: [users.id] }),
}));

export const templatesRelations = relations(templates, ({ one }) => ({
  school: one(schools, { fields: [templates.schoolId], references: [schools.id] }),
}));

export const feeReceiptsRelations = relations(feeReceipts, ({ one, many }) => ({
  student: one(students, { fields: [feeReceipts.studentId], references: [students.id] }),
  school: one(schools, { fields: [feeReceipts.schoolId], references: [schools.id] }),
  items: many(feeItems),
}));

export const feeItemsRelations = relations(feeItems, ({ one }) => ({
  receipt: one(feeReceipts, { fields: [feeItems.receiptId], references: [feeReceipts.id] }),
}));

export const teachersRelations = relations(teachers, ({ one }) => ({
  school: one(schools, { fields: [teachers.schoolId], references: [schools.id] }),
}));

export const staffRelations = relations(staff, ({ one }) => ({
  school: one(schools, { fields: [staff.schoolId], references: [schools.id] }),
}));

export const documentTemplatesRelations = relations(documentTemplates, ({ many }) => ({
  generatedDocuments: many(generatedDocuments),
  documentStats: many(documentStats),
}));

export const generatedDocumentsRelations = relations(generatedDocuments, ({ one }) => ({
  template: one(documentTemplates, { fields: [generatedDocuments.templateId], references: [documentTemplates.id] }),
  user: one(users, { fields: [generatedDocuments.userId], references: [users.id] }),
  school: one(schools, { fields: [generatedDocuments.schoolId], references: [schools.id] }),
}));

export const documentStatsRelations = relations(documentStats, ({ one }) => ({
  user: one(users, { fields: [documentStats.userId], references: [users.id] }),
  template: one(documentTemplates, { fields: [documentStats.templateId], references: [documentTemplates.id] }),
  school: one(schools, { fields: [documentStats.schoolId], references: [schools.id] }),
}));

// Attendance table
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  classId: integer("class_id").references(() => classes.id),
  date: date("date").defaultNow().notNull(),
  status: text("status").notNull(), // present, absent, late
  remarks: text("remarks"),
  schoolId: integer("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendanceInsertSchema = createInsertSchema(attendance);
export type InsertAttendance = z.infer<typeof attendanceInsertSchema>;
export type Attendance = typeof attendance.$inferSelect;



// Exams table
export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  academicYearId: integer("academic_year_id").references(() => academicYears.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  schoolId: integer("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const examInsertSchema = createInsertSchema(exams);
export type InsertExam = z.infer<typeof examInsertSchema>;
export type Exam = typeof exams.$inferSelect;

// Exam Schedules table
export const examSchedules = pgTable("exam_schedules", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").references(() => exams.id).notNull(),
  subject: text("subject").notNull(),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  fullMarks: integer("full_marks").notNull(),
  passMarks: integer("pass_marks").notNull(),
  classId: integer("class_id").references(() => classes.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const examScheduleInsertSchema = createInsertSchema(examSchedules);
export type InsertExamSchedule = z.infer<typeof examScheduleInsertSchema>;
export type ExamSchedule = typeof examSchedules.$inferSelect;

// Exam Results table
export const examResults = pgTable("exam_results", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").references(() => examSchedules.id).notNull(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  marksObtained: decimal("marks_obtained", { precision: 5, scale: 2 }).notNull(),
  grade: text("grade"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const examResultInsertSchema = createInsertSchema(examResults);
export type InsertExamResult = z.infer<typeof examResultInsertSchema>;
export type ExamResult = typeof examResults.$inferSelect;

// Books table (library books alternative name)
export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  isbn: text("isbn"),
  category: text("category").notNull(),
  publisher: text("publisher"),
  publishYear: integer("publish_year"),
  totalCopies: integer("total_copies").default(1).notNull(),
  availableCopies: integer("available_copies").default(1).notNull(),
  location: text("location").notNull(),
  schoolId: integer("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookInsertSchema = createInsertSchema(books);
export type InsertBook = z.infer<typeof bookInsertSchema>;
export type Book = typeof books.$inferSelect;

// Book Issues table
export const bookIssues = pgTable("book_issues", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").references(() => books.id).notNull(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  issueDate: date("issue_date").defaultNow().notNull(),
  returnDate: date("return_date"),
  dueDate: date("due_date").notNull(),
  status: text("status").default("issued").notNull(),
  fine: decimal("fine", { precision: 8, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookIssueInsertSchema = createInsertSchema(bookIssues);
export type InsertBookIssue = z.infer<typeof bookIssueInsertSchema>;
export type BookIssue = typeof bookIssues.$inferSelect;

// Events table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  date: date("date").notNull(),
  startTime: time("start_time"),
  endTime: time("end_time"),
  location: text("location"),
  type: text("type").default("general").notNull(),
  schoolId: integer("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eventInsertSchema = createInsertSchema(events);
export type InsertEvent = z.infer<typeof eventInsertSchema>;
export type Event = typeof events.$inferSelect;

export const parentsRelations = relations(parents, ({ one }) => ({
  school: one(schools, { fields: [parents.schoolId], references: [schools.id] }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  student: one(students, { fields: [attendance.studentId], references: [students.id] }),
  class: one(classes, { fields: [attendance.classId], references: [classes.id] }),
  school: one(schools, { fields: [attendance.schoolId], references: [schools.id] }),
}));

export const academicYearsRelations = relations(academicYears, ({ one, many }) => ({
  school: one(schools, { fields: [academicYears.schoolId], references: [schools.id] }),
  exams: many(exams),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  academicYear: one(academicYears, { fields: [exams.academicYearId], references: [academicYears.id] }),
  school: one(schools, { fields: [exams.schoolId], references: [schools.id] }),
  schedules: many(examSchedules),
}));

export const examSchedulesRelations = relations(examSchedules, ({ one, many }) => ({
  exam: one(exams, { fields: [examSchedules.examId], references: [exams.id] }),
  class: one(classes, { fields: [examSchedules.classId], references: [classes.id] }),
  results: many(examResults),
}));

export const examResultsRelations = relations(examResults, ({ one }) => ({
  schedule: one(examSchedules, { fields: [examResults.scheduleId], references: [examSchedules.id] }),
  student: one(students, { fields: [examResults.studentId], references: [students.id] }),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  school: one(schools, { fields: [books.schoolId], references: [schools.id] }),
  issues: many(bookIssues),
}));

export const bookIssuesRelations = relations(bookIssues, ({ one }) => ({
  book: one(books, { fields: [bookIssues.bookId], references: [books.id] }),
  student: one(students, { fields: [bookIssues.studentId], references: [students.id] }),
}));

// ID Card Templates table
export const idCardTemplates = pgTable("id_card_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  description: text("description"),
  category: text("category").default("student").notNull(), // student, teacher, staff
  
  // Template Configuration
  templateData: json("template_data").notNull(),
  styleConfig: json("style_config"),
  
  // Layout and Design
  pageSize: text("page_size").default("A4"),
  orientation: text("orientation").default("portrait"),
  primaryColor: text("primary_color").default("#1e40af"),
  secondaryColor: text("secondary_color").default("#3b82f6"),
  
  // Preview and Usage
  previewUrl: text("preview_url"),
  thumbnailUrl: text("thumbnail_url"),
  usageCount: integer("usage_count").default(0),
  
  // System Fields
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  schoolId: integer("school_id").references(() => schools.id),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const idCardTemplateInsertSchema = createInsertSchema(idCardTemplates);
export type InsertIdCardTemplate = z.infer<typeof idCardTemplateInsertSchema>;
export type IdCardTemplate = typeof idCardTemplates.$inferSelect;

// ID Cards table
export const idCards = pgTable("id_cards", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  templateId: integer("template_id").references(() => idCardTemplates.id),
  
  // Card Identification
  cardNumber: text("card_number").unique().notNull(),
  
  // Student Information
  studentName: text("student_name").notNull(),
  studentNameBn: text("student_name_bn"),
  studentPhoto: text("student_photo"),
  rollNumber: text("roll_number").notNull(),
  className: text("class_name").notNull(),
  section: text("section").notNull(),
  session: text("session").notNull(),
  
  // Personal Details
  dateOfBirth: date("date_of_birth"),
  bloodGroup: text("blood_group"),
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  guardianPhone: text("guardian_phone"),
  address: text("address"),
  
  // School Information
  schoolName: text("school_name"),
  schoolAddress: text("school_address"),
  eiin: text("eiin"),
  schoolLogo: text("school_logo"),
  
  // Card Details
  issueDate: date("issue_date").defaultNow(),
  validUntil: date("valid_until"),
  status: text("status").default("active").notNull(), // active, expired, suspended
  
  // Generated Files
  generatedPdf: text("generated_pdf"),
  generatedImage: text("generated_image"),
  
  // System Fields
  schoolId: integer("school_id").references(() => schools.id),
  generatedBy: integer("generated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const idCardInsertSchema = createInsertSchema(idCards);
export type InsertIdCard = z.infer<typeof idCardInsertSchema>;
export type IdCard = typeof idCards.$inferSelect;

// Enhanced Admit Card Templates table - Support for HSC Registration Card format
export const admitCardTemplates = pgTable("admit_card_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  description: text("description"),
  category: text("category").default("custom").notNull(), // hsc, ssc, jsc, custom
  
  // Template Configuration
  templateData: json("template_data").notNull(), // Complete template structure
  fieldMappings: json("field_mappings"), // Maps data fields to template positions
  styleConfig: json("style_config"), // Colors, fonts, layout settings
  
  // HSC Specific Configuration
  boardType: text("board_type"), // general, madrasha, technical
  examLevel: text("exam_level"), // hsc, ssc, jsc
  subjectGroups: json("subject_groups"), // Science, Arts, Commerce configurations
  
  // Layout and Design
  pageSize: text("page_size").default("A4"),
  orientation: text("orientation").default("portrait"),
  margins: json("margins"), // {top, right, bottom, left}
  headerConfig: json("header_config"), // Logo, board name, title
  footerConfig: json("footer_config"), // Instructions, signatures
  
  // Preview and Usage
  previewUrl: text("preview_url"),
  thumbnailUrl: text("thumbnail_url"),
  usageCount: integer("usage_count").default(0),
  
  // System Fields
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  schoolId: integer("school_id").references(() => schools.id),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const admitCardTemplateInsertSchema = createInsertSchema(admitCardTemplates);
export type InsertAdmitCardTemplate = z.infer<typeof admitCardTemplateInsertSchema>;
export type AdmitCardTemplate = typeof admitCardTemplates.$inferSelect;

// Enhanced Admit Cards table - Complete HSC Registration Card support
export const admitCards = pgTable("admit_cards", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id),
  examId: integer("exam_id").references(() => exams.id),
  templateId: integer("template_id").references(() => admitCardTemplates.id),
  
  // Card Identification
  cardNumber: text("card_number").unique().notNull(),
  serialNumber: text("serial_number"), // Serial No. JBR: JBCC 05804344
  
  // Student Personal Information
  studentName: text("student_name").notNull(),
  studentNameBn: text("student_name_bn"),
  fatherName: text("father_name"),
  fatherNameBn: text("father_name_bn"),
  motherName: text("mother_name"),
  motherNameBn: text("mother_name_bn"),
  studentPhoto: text("student_photo"),
  
  // Academic Information
  rollNumber: text("roll_number").notNull(),
  classRoll: text("class_roll"), // Different from roll number
  registrationNumber: text("registration_number"),
  className: text("class_name").notNull(),
  section: text("section"),
  group: text("group"), // BUSINESS STUD., Science, Arts, etc.
  session: text("session"), // 2003-2004 format
  
  // Institution Details
  collegeCode: text("college_code"),
  collegeName: text("college_name"),
  collegeNameBn: text("college_name_bn"),
  thanaUpazilla: text("thana_upazilla"), // JESSORE SADAR (T300)
  district: text("district"), // JESSORE (30)
  boardName: text("board_name"), // Board of Intermediate and Secondary Education
  boardNameBn: text("board_name_bn"),
  
  // Exam Information
  examType: text("exam_type").notNull(), // JSC, SSC, HSC, Higher Secondary
  examName: text("exam_name").notNull(),
  examNameBn: text("exam_name_bn"),
  examDate: date("exam_date"),
  examTime: text("exam_time"),
  examCenter: text("exam_center"),
  examCenterBn: text("exam_center_bn"),
  examCenterCode: text("exam_center_code"),
  
  // Subject Information - Enhanced for HSC format
  subjects: json("subjects"), // Array of {code, name, type: 'compulsory'|'optional'}
  additionalSubjects: json("additional_subjects"), // Additional subjects like Statistics
  
  // Validity and Instructions
  validUntil: date("valid_until"), // "valid upto 2008"
  examInstructions: text("exam_instructions"), // "Examinee must bring this card in the examination hall"
  examInstructionsBn: text("exam_instructions_bn"),
  
  // Signature Areas
  studentSignature: text("student_signature"),
  headOfInstitutionSignature: text("head_of_institution_signature"),
  inspectorSignature: text("inspector_signature"),
  
  // Security Features
  qrCode: text("qr_code"),
  verificationCode: text("verification_code"),
  digitalSignature: text("digital_signature"),
  watermark: text("watermark"),
  
  // Status and Tracking
  issuedDate: date("issued_date").defaultNow().notNull(),
  status: text("status").default("active").notNull(), // active, cancelled, expired
  printCount: integer("print_count").default(0),
  lastPrintedAt: timestamp("last_printed_at"),
  
  // Additional Fields
  specialInstructions: text("special_instructions"),
  specialInstructionsBn: text("special_instructions_bn"),
  
  // System Fields
  schoolId: integer("school_id").references(() => schools.id),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const admitCardInsertSchema = createInsertSchema(admitCards);
export type InsertAdmitCard = z.infer<typeof admitCardInsertSchema>;
export type AdmitCard = typeof admitCards.$inferSelect;

// Admit Card History table
export const admitCardHistory = pgTable("admit_card_history", {
  id: serial("id").primaryKey(),
  admitCardId: integer("admit_card_id").references(() => admitCards.id).notNull(),
  action: text("action").notNull(), // issued, reprinted, cancelled
  reason: text("reason"),
  performedBy: integer("performed_by").references(() => users.id),
  performedAt: timestamp("performed_at").defaultNow().notNull(),
});

export const admitCardHistoryInsertSchema = createInsertSchema(admitCardHistory);
export type InsertAdmitCardHistory = z.infer<typeof admitCardHistoryInsertSchema>;
export type AdmitCardHistory = typeof admitCardHistory.$inferSelect;



// Bangladesh Education Board Templates
export const bangladeshExamBoards = pgTable("bangladesh_exam_boards", {
  id: serial("id").primaryKey(),
  boardName: text("board_name").notNull(),
  boardNameBn: text("board_name_bn").notNull(),
  boardCode: text("board_code").unique().notNull(),
  boardType: text("board_type").notNull(), // general, madrasha, technical
  examTypes: json("exam_types"), // JSC, SSC, HSC etc.
  subjectGroups: json("subject_groups"), // Science, Arts, Commerce
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bangladeshExamBoardInsertSchema = createInsertSchema(bangladeshExamBoards);
export type InsertBangladeshExamBoard = z.infer<typeof bangladeshExamBoardInsertSchema>;
export type BangladeshExamBoard = typeof bangladeshExamBoards.$inferSelect;

// Class Routines table
export const classRoutines = pgTable("class_routines", {
  id: serial("id").primaryKey(),
  className: text("class_name").notNull(),
  section: text("section").notNull(),
  academicYear: text("academic_year").notNull(),
  semester: text("semester"),
  instituteName: text("institute_name").notNull(),
  instituteAddress: text("institute_address"),
  classTeacher: text("class_teacher").notNull(),
  totalStudents: integer("total_students"),
  effectiveDate: date("effective_date").notNull(),
  weekStructure: text("week_structure").default("6-day").notNull(), // 5-day, 6-day
  periodsPerDay: integer("periods_per_day").default(7),
  periodDuration: integer("period_duration").default(45), // minutes
  startTime: time("start_time").default("08:00"),
  includeBreaks: boolean("include_breaks").default(true),
  prayerBreaks: json("prayer_breaks"), // Prayer time configurations
  template: text("template").default("standard"), // standard, compact, detailed, wall
  colorCoding: boolean("color_coding").default(true),
  showTeacherNames: boolean("show_teacher_names").default(true),
  showRoomNumbers: boolean("show_room_numbers").default(false),
  languageOption: text("language_option").default("bilingual"), // english, bengali, bilingual
  paperSize: text("paper_size").default("A4"),
  orientation: text("orientation").default("landscape"),
  status: text("status").default("active"), // active, draft, archived
  schoolId: integer("school_id").references(() => schools.id),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const classRoutineInsertSchema = createInsertSchema(classRoutines);
export type InsertClassRoutine = z.infer<typeof classRoutineInsertSchema>;
export type ClassRoutine = typeof classRoutines.$inferSelect;

// Routine Periods table - Individual period entries
export const routinePeriods = pgTable("routine_periods", {
  id: serial("id").primaryKey(),
  routineId: integer("routine_id").references(() => classRoutines.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Saturday, 1=Sunday, etc.
  periodNumber: integer("period_number").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  subject: text("subject").notNull(),
  subjectBn: text("subject_bn"),
  teacherId: integer("teacher_id").references(() => teachers.id),
  teacherName: text("teacher_name").notNull(),
  roomNumber: text("room_number"),
  periodType: text("period_type").default("regular"), // regular, break, prayer, lunch
  backgroundColor: text("background_color"), // For color coding
  textColor: text("text_color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const routinePeriodInsertSchema = createInsertSchema(routinePeriods);
export type InsertRoutinePeriod = z.infer<typeof routinePeriodInsertSchema>;
export type RoutinePeriod = typeof routinePeriods.$inferSelect;

// Periods table (legacy support)
export const periods = pgTable("periods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday-Saturday)
  subject: text("subject"),
  teacherId: integer("teacher_id").references(() => teachers.id),
  classId: integer("class_id").references(() => classes.id),
  schoolId: integer("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const periodInsertSchema = createInsertSchema(periods);
export type InsertPeriod = z.infer<typeof periodInsertSchema>;
export type Period = typeof periods.$inferSelect;

// Testimonials table
export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  rating: integer("rating").default(5),
  isActive: boolean("is_active").default(true),
  schoolId: integer("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const testimonialInsertSchema = createInsertSchema(testimonials);
export type InsertTestimonial = z.infer<typeof testimonialInsertSchema>;
export type Testimonial = typeof testimonials.$inferSelect;

// Admission Forms table
export const admissionForms = pgTable("admission_forms", {
  id: serial("id").primaryKey(),
  applicationNumber: text("application_number").unique().notNull(),
  studentName: text("student_name").notNull(),
  fatherName: text("father_name").notNull(),
  motherName: text("mother_name").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  religion: text("religion"),
  nationality: text("nationality").default("Bangladeshi"),
  bloodGroup: text("blood_group"),
  phone: text("phone").notNull(),
  email: text("email"),
  presentAddress: text("present_address").notNull(),
  permanentAddress: text("permanent_address").notNull(),
  classAppliedFor: text("class_applied_for").notNull(),
  previousSchool: text("previous_school"),
  guardianOccupation: text("guardian_occupation"),
  monthlyIncome: decimal("monthly_income", { precision: 10, scale: 2 }),
  applicationDate: date("application_date").defaultNow().notNull(),
  status: text("status").default("pending").notNull(),
  remarks: text("remarks"),
  schoolId: integer("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const admissionFormInsertSchema = createInsertSchema(admissionForms);
export type InsertAdmissionForm = z.infer<typeof admissionFormInsertSchema>;
export type AdmissionForm = typeof admissionForms.$inferSelect;

// Inventory Categories table
export const inventoryCategories = pgTable("inventory_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameInBangla: text("name_in_bangla"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  schoolId: integer("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryCategoryInsertSchema = createInsertSchema(inventoryCategories);
export type InsertInventoryCategory = z.infer<typeof inventoryCategoryInsertSchema>;
export type InventoryCategory = typeof inventoryCategories.$inferSelect;

// Vehicles table
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // bus, van, etc.
  regNumber: text("reg_number").notNull(),
  capacity: integer("capacity").notNull(),
  driver: text("driver"),
  contactNumber: text("contact_number"),
  route: text("route"),
  schoolId: integer("school_id").references(() => schools.id),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vehicleInsertSchema = createInsertSchema(vehicles);
export type InsertVehicle = z.infer<typeof vehicleInsertSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

// Transport Assignments table
export const transportAssignments = pgTable("transport_assignments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  routeId: integer("route_id").references(() => transportRoutes.id).notNull(),
  pickupPoint: text("pickup_point"),
  dropPoint: text("drop_point"),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transportAssignmentInsertSchema = createInsertSchema(transportAssignments);
export type InsertTransportAssignment = z.infer<typeof transportAssignmentInsertSchema>;
export type TransportAssignment = typeof transportAssignments.$inferSelect;

export const eventsRelations = relations(events, ({ one }) => ({
  school: one(schools, { fields: [events.schoolId], references: [schools.id] }),
}));

export const admitCardTemplatesRelations = relations(admitCardTemplates, ({ one, many }) => ({
  school: one(schools, { fields: [admitCardTemplates.schoolId], references: [schools.id] }),
  admitCards: many(admitCards),
}));

export const admitCardsRelations = relations(admitCards, ({ one, many }) => ({
  student: one(students, { fields: [admitCards.studentId], references: [students.id] }),
  exam: one(exams, { fields: [admitCards.examId], references: [exams.id] }),
  template: one(admitCardTemplates, { fields: [admitCards.templateId], references: [admitCardTemplates.id] }),
  school: one(schools, { fields: [admitCards.schoolId], references: [schools.id] }),
  history: many(admitCardHistory),
}));

export const admitCardHistoryRelations = relations(admitCardHistory, ({ one }) => ({
  admitCard: one(admitCards, { fields: [admitCardHistory.admitCardId], references: [admitCards.id] }),
  performedBy: one(users, { fields: [admitCardHistory.performedBy], references: [users.id] }),
}));

export const classRoutinesRelations = relations(classRoutines, ({ one, many }) => ({
  school: one(schools, { fields: [classRoutines.schoolId], references: [schools.id] }),
  createdBy: one(users, { fields: [classRoutines.createdBy], references: [users.id] }),
  periods: many(routinePeriods),
}));

export const routinePeriodsRelations = relations(routinePeriods, ({ one }) => ({
  routine: one(classRoutines, { fields: [routinePeriods.routineId], references: [classRoutines.id] }),
  teacher: one(teachers, { fields: [routinePeriods.teacherId], references: [teachers.id] }),
}));

export const periodsRelations = relations(periods, ({ one }) => ({
  teacher: one(teachers, { fields: [periods.teacherId], references: [teachers.id] }),
  class: one(classes, { fields: [periods.classId], references: [classes.id] }),
  school: one(schools, { fields: [periods.schoolId], references: [schools.id] }),
}));

export const testimonialsRelations = relations(testimonials, ({ one }) => ({
  school: one(schools, { fields: [testimonials.schoolId], references: [schools.id] }),
}));

export const admissionFormsRelations = relations(admissionForms, ({ one }) => ({
  school: one(schools, { fields: [admissionForms.schoolId], references: [schools.id] }),
}));

export const inventoryCategoriesRelations = relations(inventoryCategories, ({ one, many }) => ({
  school: one(schools, { fields: [inventoryCategories.schoolId], references: [schools.id] }),
  items: many(inventoryItems),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  school: one(schools, { fields: [vehicles.schoolId], references: [schools.id] }),
  assignments: many(transportAssignments),
}));

export const transportAssignmentsRelations = relations(transportAssignments, ({ one }) => ({
  student: one(students, { fields: [transportAssignments.studentId], references: [students.id] }),
  route: one(transportRoutes, { fields: [transportAssignments.routeId], references: [transportRoutes.id] }),
}));

export const schoolsExtendedRelations = relations(schools, ({ many }) => ({
  users: many(users),
  students: many(students),
  teachers: many(teachers),
  staff: many(staff),
  parents: many(parents),
  classes: many(classes),
  attendance: many(attendance),
  academicYears: many(academicYears),
  exams: many(exams),
  books: many(books),
  events: many(events),
  admitCardTemplates: many(admitCardTemplates),
  admitCards: many(admitCards),
  periods: many(periods),
  testimonials: many(testimonials),
  admissionForms: many(admissionForms),
  inventoryCategories: many(inventoryCategories),
  vehicles: many(vehicles),
  idCardTemplates: many(idCardTemplates),
  idCards: many(idCards),
}));

export const idCardTemplatesRelations = relations(idCardTemplates, ({ one, many }) => ({
  school: one(schools, { fields: [idCardTemplates.schoolId], references: [schools.id] }),
  creator: one(users, { fields: [idCardTemplates.createdBy], references: [users.id] }),
  idCards: many(idCards),
}));

export const idCardsRelations = relations(idCards, ({ one }) => ({
  student: one(students, { fields: [idCards.studentId], references: [students.id] }),
  template: one(idCardTemplates, { fields: [idCards.templateId], references: [idCardTemplates.id] }),
  school: one(schools, { fields: [idCards.schoolId], references: [schools.id] }),
  generatedBy: one(users, { fields: [idCards.generatedBy], references: [users.id] }),
}));

// Credit Balance table for user credit management
export const creditBalance = pgTable("credit_balance", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  username: text("username").notNull(),
  email: text("email"),
  fullName: text("full_name"),
  currentCredits: integer("current_credits").default(0).notNull(),
  bonusCredits: integer("bonus_credits").default(0).notNull(),
  usedCredits: integer("used_credits").default(0).notNull(),
  status: text("status").default("active"),
  lastActivity: timestamp("last_activity").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const creditBalanceInsertSchema = createInsertSchema(creditBalance);
export type InsertCreditBalance = z.infer<typeof creditBalanceInsertSchema>;
export type CreditBalance = typeof creditBalance.$inferSelect;

// ============================================================================
// COMMUNICATION SYSTEMS
// ============================================================================

// Notification Templates
export const notificationTemplates = pgTable("notification_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  description: text("description"),
  category: text("category").notNull(),
  subject: text("subject"),
  subjectBn: text("subject_bn"),
  body: text("body").notNull(),
  bodyBn: text("body_bn"),
  variables: json("variables"),
  isActive: boolean("is_active").default(true),
  schoolId: integer("school_id").notNull().default(1),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationTemplatesInsertSchema = createInsertSchema(notificationTemplates);
export type InsertNotificationTemplate = z.infer<typeof notificationTemplatesInsertSchema>;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;

// Notification Logs
export const notificationLogs = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => notificationTemplates.id),
  recipientId: integer("recipient_id"),
  recipientType: text("recipient_type").notNull(),
  recipientEmail: text("recipient_email"),
  recipientPhone: text("recipient_phone"),
  channel: text("channel").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  status: text("status").default("pending"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  errorMessage: text("error_message"),
  metadata: json("metadata"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationLogsInsertSchema = createInsertSchema(notificationLogs);
export type InsertNotificationLog = z.infer<typeof notificationLogsInsertSchema>;
export type NotificationLog = typeof notificationLogs.$inferSelect;

// Conversations
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title"),
  participantIds: integer("participant_ids").array().notNull(),
  participantTypes: text("participant_types").array().notNull(),
  lastMessageAt: timestamp("last_message_at"),
  isActive: boolean("is_active").default(true),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationsInsertSchema = createInsertSchema(conversations);
export type InsertConversation = z.infer<typeof conversationsInsertSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull(),
  senderType: text("sender_type").notNull(),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  attachments: json("attachments"),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messagesInsertSchema = createInsertSchema(messages);
export type InsertMessage = z.infer<typeof messagesInsertSchema>;
export type Message = typeof messages.$inferSelect;

// Announcements
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id"),
  title: text("title").notNull(),
  titleBn: text("title_bn"),
  content: text("content").notNull(),
  contentBn: text("content_bn"),
  priority: text("priority").default("medium"),
  targetAudience: text("target_audience").default("all"),
  targetClasses: text("target_classes").array(),
  publishDate: timestamp("publish_date").defaultNow(),
  expiryDate: timestamp("expiry_date"),
  isPublished: boolean("is_published").default(false),
  viewCount: integer("view_count").default(0),
  attachments: json("attachments"),
  schoolId: integer("school_id").notNull().default(1),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const announcementsInsertSchema = createInsertSchema(announcements);
export type InsertAnnouncement = z.infer<typeof announcementsInsertSchema>;
export type Announcement = typeof announcements.$inferSelect;

// Announcement Categories
export const announcementCategories = pgTable("announcement_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  description: text("description"),
  icon: text("icon"),
  color: text("color").default("#3b82f6"),
  isActive: boolean("is_active").default(true),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const announcementCategoriesInsertSchema = createInsertSchema(announcementCategories);
export type InsertAnnouncementCategory = z.infer<typeof announcementCategoriesInsertSchema>;
export type AnnouncementCategory = typeof announcementCategories.$inferSelect;

// ============================================================================
// ENHANCED EXAM MANAGEMENT
// ============================================================================

// Seating Arrangements
export const seatingArrangements = pgTable("seating_arrangements", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull(),
  studentId: integer("student_id").notNull(),
  roomNumber: text("room_number").notNull(),
  seatNumber: text("seat_number").notNull(),
  rowNumber: integer("row_number"),
  columnNumber: integer("column_number"),
  instructions: text("instructions"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const seatingArrangementsInsertSchema = createInsertSchema(seatingArrangements);
export type InsertSeatingArrangement = z.infer<typeof seatingArrangementsInsertSchema>;
export type SeatingArrangement = typeof seatingArrangements.$inferSelect;

// Invigilation Duties
export const invigilationDuties = pgTable("invigilation_duties", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull(),
  teacherId: integer("teacher_id").notNull(),
  roomNumber: text("room_number").notNull(),
  dutyType: text("duty_type").default("main"),
  dutyDate: date("duty_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  notes: text("notes"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invigilationDutiesInsertSchema = createInsertSchema(invigilationDuties);
export type InsertInvigilationDuty = z.infer<typeof invigilationDutiesInsertSchema>;
export type InvigilationDuty = typeof invigilationDuties.$inferSelect;

// ============================================================================
// HR & STAFF MANAGEMENT
// ============================================================================

// Staff Attendance
export const staffAttendance = pgTable("staff_attendance", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  date: date("date").notNull(),
  checkInTime: time("check_in_time"),
  checkOutTime: time("check_out_time"),
  status: text("status").notNull(),
  lateMinutes: integer("late_minutes").default(0),
  overtimeMinutes: integer("overtime_minutes").default(0),
  notes: text("notes"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const staffAttendanceInsertSchema = createInsertSchema(staffAttendance);
export type InsertStaffAttendance = z.infer<typeof staffAttendanceInsertSchema>;
export type StaffAttendance = typeof staffAttendance.$inferSelect;

// Attendance Summary
export const attendanceSummary = pgTable("attendance_summary", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalDays: integer("total_days").notNull(),
  presentDays: integer("present_days").default(0),
  absentDays: integer("absent_days").default(0),
  lateDays: integer("late_days").default(0),
  halfDays: integer("half_days").default(0),
  leaveDays: integer("leave_days").default(0),
  attendancePercentage: decimal("attendance_percentage", { precision: 5, scale: 2 }),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const attendanceSummaryInsertSchema = createInsertSchema(attendanceSummary);
export type InsertAttendanceSummary = z.infer<typeof attendanceSummaryInsertSchema>;
export type AttendanceSummary = typeof attendanceSummary.$inferSelect;

// Salary Components
export const salaryComponents = pgTable("salary_components", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  type: text("type").notNull(),
  calculationType: text("calculation_type").default("fixed"),
  defaultAmount: decimal("default_amount", { precision: 12, scale: 2 }),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  isTaxable: boolean("is_taxable").default(true),
  isActive: boolean("is_active").default(true),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salaryComponentsInsertSchema = createInsertSchema(salaryComponents);
export type InsertSalaryComponent = z.infer<typeof salaryComponentsInsertSchema>;
export type SalaryComponent = typeof salaryComponents.$inferSelect;

// Payroll Records
export const payrollRecords = pgTable("payroll_records", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  basicSalary: decimal("basic_salary", { precision: 12, scale: 2 }).notNull(),
  earnings: json("earnings"),
  deductions: json("deductions"),
  grossSalary: decimal("gross_salary", { precision: 12, scale: 2 }).notNull(),
  totalDeductions: decimal("total_deductions", { precision: 12, scale: 2 }).default("0"),
  netSalary: decimal("net_salary", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date"),
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").default("pending"),
  notes: text("notes"),
  schoolId: integer("school_id").notNull().default(1),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payrollRecordsInsertSchema = createInsertSchema(payrollRecords);
export type InsertPayrollRecord = z.infer<typeof payrollRecordsInsertSchema>;
export type PayrollRecord = typeof payrollRecords.$inferSelect;

// Appraisal Criteria
export const appraisalCriteria = pgTable("appraisal_criteria", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  description: text("description"),
  category: text("category").notNull(),
  maxScore: integer("max_score").default(10),
  weightage: decimal("weightage", { precision: 5, scale: 2 }).default("1.0"),
  isActive: boolean("is_active").default(true),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appraisalCriteriaInsertSchema = createInsertSchema(appraisalCriteria);
export type InsertAppraisalCriteria = z.infer<typeof appraisalCriteriaInsertSchema>;
export type AppraisalCriteria = typeof appraisalCriteria.$inferSelect;

// Appraisals
export const appraisals = pgTable("appraisals", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  appraisalPeriod: text("appraisal_period").notNull(),
  reviewDate: date("review_date").notNull(),
  scores: json("scores").notNull(),
  totalScore: decimal("total_score", { precision: 10, scale: 2 }),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  grade: text("grade"),
  strengths: text("strengths"),
  areasOfImprovement: text("areas_of_improvement"),
  goals: text("goals"),
  reviewerId: integer("reviewer_id"),
  reviewerName: text("reviewer_name"),
  status: text("status").default("draft"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const appraisalsInsertSchema = createInsertSchema(appraisals);
export type InsertAppraisal = z.infer<typeof appraisalsInsertSchema>;
export type Appraisal = typeof appraisals.$inferSelect;

// ============================================================================
// STUDENT WELFARE SYSTEMS
// ============================================================================

// Incident Categories
export const incidentCategories = pgTable("incident_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  description: text("description"),
  severityLevel: text("severity_level").default("low"),
  defaultAction: text("default_action"),
  isActive: boolean("is_active").default(true),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const incidentCategoriesInsertSchema = createInsertSchema(incidentCategories);
export type InsertIncidentCategory = z.infer<typeof incidentCategoriesInsertSchema>;
export type IncidentCategory = typeof incidentCategories.$inferSelect;

// Disciplinary Incidents
export const disciplinaryIncidents = pgTable("disciplinary_incidents", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  categoryId: integer("category_id").references(() => incidentCategories.id),
  incidentDate: date("incident_date").notNull(),
  incidentTime: time("incident_time"),
  location: text("location"),
  description: text("description").notNull(),
  severity: text("severity").default("medium"),
  reportedBy: integer("reported_by"),
  reporterName: text("reporter_name"),
  witnesses: text("witnesses"),
  status: text("status").default("reported"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const disciplinaryIncidentsInsertSchema = createInsertSchema(disciplinaryIncidents);
export type InsertDisciplinaryIncident = z.infer<typeof disciplinaryIncidentsInsertSchema>;
export type DisciplinaryIncident = typeof disciplinaryIncidents.$inferSelect;

// Disciplinary Actions
export const disciplinaryActions = pgTable("disciplinary_actions", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").references(() => disciplinaryIncidents.id, { onDelete: "cascade" }),
  actionType: text("action_type").notNull(),
  actionDate: date("action_date").notNull(),
  description: text("description").notNull(),
  durationDays: integer("duration_days"),
  assignedTo: integer("assigned_to"),
  assignedToName: text("assigned_to_name"),
  completionStatus: text("completion_status").default("pending"),
  completionDate: date("completion_date"),
  notes: text("notes"),
  schoolId: integer("school_id").notNull().default(1),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const disciplinaryActionsInsertSchema = createInsertSchema(disciplinaryActions);
export type InsertDisciplinaryAction = z.infer<typeof disciplinaryActionsInsertSchema>;
export type DisciplinaryAction = typeof disciplinaryActions.$inferSelect;

// Activities
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  description: text("description"),
  category: text("category").notNull(),
  coordinatorId: integer("coordinator_id"),
  coordinatorName: text("coordinator_name"),
  meetingSchedule: text("meeting_schedule"),
  location: text("location"),
  maxParticipants: integer("max_participants"),
  currentParticipants: integer("current_participants").default(0),
  startDate: date("start_date"),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const activitiesInsertSchema = createInsertSchema(activities);
export type InsertActivity = z.infer<typeof activitiesInsertSchema>;
export type Activity = typeof activities.$inferSelect;

// Activity Enrollments
export const activityEnrollments = pgTable("activity_enrollments", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").references(() => activities.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull(),
  enrollmentDate: date("enrollment_date").defaultNow(),
  status: text("status").default("active"),
  attendancePercentage: decimal("attendance_percentage", { precision: 5, scale: 2 }),
  notes: text("notes"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityEnrollmentsInsertSchema = createInsertSchema(activityEnrollments);
export type InsertActivityEnrollment = z.infer<typeof activityEnrollmentsInsertSchema>;
export type ActivityEnrollment = typeof activityEnrollments.$inferSelect;

// Activity Achievements
export const activityAchievements = pgTable("activity_achievements", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").references(() => activities.id),
  studentId: integer("student_id").notNull(),
  achievementType: text("achievement_type").notNull(),
  achievementName: text("achievement_name").notNull(),
  achievementNameBn: text("achievement_name_bn"),
  level: text("level"),
  position: text("position"),
  achievementDate: date("achievement_date").notNull(),
  description: text("description"),
  certificateUrl: text("certificate_url"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityAchievementsInsertSchema = createInsertSchema(activityAchievements);
export type InsertActivityAchievement = z.infer<typeof activityAchievementsInsertSchema>;
export type ActivityAchievement = typeof activityAchievements.$inferSelect;

// Health Records
export const healthRecords = pgTable("health_records", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().unique(),
  bloodGroup: text("blood_group"),
  height: decimal("height", { precision: 5, scale: 2 }),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  bmi: decimal("bmi", { precision: 4, scale: 2 }),
  allergies: text("allergies").array(),
  chronicConditions: text("chronic_conditions").array(),
  currentMedications: text("current_medications").array(),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactRelation: text("emergency_contact_relation"),
  emergencyContactPhone: text("emergency_contact_phone"),
  familyDoctorName: text("family_doctor_name"),
  familyDoctorPhone: text("family_doctor_phone"),
  medicalNotes: text("medical_notes"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const healthRecordsInsertSchema = createInsertSchema(healthRecords);
export type InsertHealthRecord = z.infer<typeof healthRecordsInsertSchema>;
export type HealthRecord = typeof healthRecords.$inferSelect;

// Vaccinations
export const vaccinations = pgTable("vaccinations", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  vaccineName: text("vaccine_name").notNull(),
  vaccineNameBn: text("vaccine_name_bn"),
  doseNumber: integer("dose_number").notNull(),
  vaccinationDate: date("vaccination_date").notNull(),
  nextDoseDate: date("next_dose_date"),
  batchNumber: text("batch_number"),
  administeredBy: text("administered_by"),
  location: text("location"),
  sideEffects: text("side_effects"),
  notes: text("notes"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vaccinationsInsertSchema = createInsertSchema(vaccinations);
export type InsertVaccination = z.infer<typeof vaccinationsInsertSchema>;
export type Vaccination = typeof vaccinations.$inferSelect;

// Medical Checkups
export const medicalCheckups = pgTable("medical_checkups", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  checkupDate: date("checkup_date").notNull(),
  checkupType: text("checkup_type").default("routine"),
  height: decimal("height", { precision: 5, scale: 2 }),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  bmi: decimal("bmi", { precision: 4, scale: 2 }),
  bloodPressure: text("blood_pressure"),
  visionLeft: text("vision_left"),
  visionRight: text("vision_right"),
  dentalStatus: text("dental_status"),
  generalHealthStatus: text("general_health_status").default("good"),
  findings: text("findings"),
  recommendations: text("recommendations"),
  examinedBy: text("examined_by"),
  nextCheckupDate: date("next_checkup_date"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const medicalCheckupsInsertSchema = createInsertSchema(medicalCheckups);
export type InsertMedicalCheckup = z.infer<typeof medicalCheckupsInsertSchema>;
export type MedicalCheckup = typeof medicalCheckups.$inferSelect;

// ============================================================================
// ADMISSION SYSTEM ENHANCEMENTS
// ============================================================================

// Admission Tests
export const admissionTests = pgTable("admission_tests", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id"),
  testName: text("test_name").notNull(),
  testNameBn: text("test_name_bn"),
  testDate: date("test_date").notNull(),
  testTime: time("test_time").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  totalMarks: integer("total_marks").notNull(),
  passMarks: integer("pass_marks").notNull(),
  subjects: text("subjects").array(),
  venue: text("venue"),
  instructions: text("instructions"),
  studentId: integer("student_id"),
  score: decimal("score", { precision: 5, scale: 2 }),
  obtainedMarks: decimal("obtained_marks", { precision: 5, scale: 2 }),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  rank: integer("rank"),
  status: text("status").default("scheduled"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const admissionTestsInsertSchema = createInsertSchema(admissionTests);
export type InsertAdmissionTest = z.infer<typeof admissionTestsInsertSchema>;
export type AdmissionTest = typeof admissionTests.$inferSelect;

// Admission Interviews
export const admissionInterviews = pgTable("admission_interviews", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id"),
  studentId: integer("student_id").notNull(),
  interviewDate: date("interview_date").notNull(),
  interviewTime: time("interview_time").notNull(),
  panelMembers: text("panel_members").array(),
  venue: text("venue"),
  durationMinutes: integer("duration_minutes").default(30),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  feedback: text("feedback"),
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  recommendation: text("recommendation").default("pending"),
  interviewerId: integer("interviewer_id"),
  interviewerName: text("interviewer_name"),
  status: text("status").default("scheduled"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const admissionInterviewsInsertSchema = createInsertSchema(admissionInterviews);
export type InsertAdmissionInterview = z.infer<typeof admissionInterviewsInsertSchema>;
export type AdmissionInterview = typeof admissionInterviews.$inferSelect;

// ============================================================================
// ENHANCED INVENTORY MANAGEMENT
// ============================================================================

// Vendors
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  vendorCode: text("vendor_code").unique().notNull(),
  vendorName: text("vendor_name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
  city: text("city"),
  country: text("country").default("Bangladesh"),
  taxId: text("tax_id"),
  paymentTerms: text("payment_terms"),
  creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vendorsInsertSchema = createInsertSchema(vendors);
export type InsertVendor = z.infer<typeof vendorsInsertSchema>;
export type Vendor = typeof vendors.$inferSelect;

// Purchase Orders
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: text("po_number").unique().notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  orderDate: date("order_date").defaultNow(),
  expectedDeliveryDate: date("expected_delivery_date"),
  actualDeliveryDate: date("actual_delivery_date"),
  items: json("items").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").default("draft"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  schoolId: integer("school_id").notNull().default(1),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchaseOrdersInsertSchema = createInsertSchema(purchaseOrders);
export type InsertPurchaseOrder = z.infer<typeof purchaseOrdersInsertSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

// Stock Alerts
export const stockAlerts = pgTable("stock_alerts", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  itemName: text("item_name").notNull(),
  alertType: text("alert_type").notNull(),
  currentQuantity: integer("current_quantity"),
  reorderLevel: integer("reorder_level"),
  expiryDate: date("expiry_date"),
  daysToExpiry: integer("days_to_expiry"),
  priority: text("priority").default("medium"),
  isAcknowledged: boolean("is_acknowledged").default(false),
  acknowledgedBy: integer("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  actionTaken: text("action_taken"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockAlertsInsertSchema = createInsertSchema(stockAlerts);
export type InsertStockAlert = z.infer<typeof stockAlertsInsertSchema>;
export type StockAlert = typeof stockAlerts.$inferSelect;

// ============================================================================
// HOSTEL MANAGEMENT ENHANCEMENTS
// ============================================================================

// Hostel Rooms
export const hostelRooms = pgTable("hostel_rooms", {
  id: serial("id").primaryKey(),
  hostelId: integer("hostel_id"),
  roomNumber: text("room_number").notNull(),
  floor: integer("floor").notNull(),
  roomType: text("room_type").notNull(),
  capacity: integer("capacity").notNull(),
  currentOccupancy: integer("current_occupancy").default(0),
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }).notNull(),
  facilities: text("facilities").array(),
  status: text("status").default("available"),
  notes: text("notes"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const hostelRoomsInsertSchema = createInsertSchema(hostelRooms);
export type InsertHostelRoom = z.infer<typeof hostelRoomsInsertSchema>;
export type HostelRoom = typeof hostelRooms.$inferSelect;

// Hostel Attendance
export const hostelAttendance = pgTable("hostel_attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  roomId: integer("room_id").references(() => hostelRooms.id),
  date: date("date").notNull(),
  checkInTime: time("check_in_time"),
  checkOutTime: time("check_out_time"),
  status: text("status").notNull(),
  leaveType: text("leave_type"),
  leaveApprovedBy: integer("leave_approved_by"),
  notes: text("notes"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const hostelAttendanceInsertSchema = createInsertSchema(hostelAttendance);
export type InsertHostelAttendance = z.infer<typeof hostelAttendanceInsertSchema>;
export type HostelAttendance = typeof hostelAttendance.$inferSelect;

// Meal Plans
export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  planName: text("plan_name").notNull(),
  planNameBn: text("plan_name_bn"),
  description: text("description"),
  mealTypes: text("meal_types").array().notNull(),
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mealPlansInsertSchema = createInsertSchema(mealPlans);
export type InsertMealPlan = z.infer<typeof mealPlansInsertSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;

// Meal Menu
export const mealMenu = pgTable("meal_menu", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  dayOfWeek: text("day_of_week"),
  mealType: text("meal_type").notNull(),
  menuItems: text("menu_items").array().notNull(),
  menuItemsBn: text("menu_items_bn").array(),
  specialNotes: text("special_notes"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mealMenuInsertSchema = createInsertSchema(mealMenu);
export type InsertMealMenu = z.infer<typeof mealMenuInsertSchema>;
export type MealMenu = typeof mealMenu.$inferSelect;

// Meal Subscriptions
export const mealSubscriptions = pgTable("meal_subscriptions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  planId: integer("plan_id").references(() => mealPlans.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true),
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }).notNull(),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mealSubscriptionsInsertSchema = createInsertSchema(mealSubscriptions);
export type InsertMealSubscription = z.infer<typeof mealSubscriptionsInsertSchema>;
export type MealSubscription = typeof mealSubscriptions.$inferSelect;

// Meal Transactions
export const mealTransactions = pgTable("meal_transactions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  subscriptionId: integer("subscription_id").references(() => mealSubscriptions.id),
  date: date("date").notNull(),
  mealType: text("meal_type").notNull(),
  isConsumed: boolean("is_consumed").default(false),
  consumedAt: timestamp("consumed_at"),
  notes: text("notes"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mealTransactionsInsertSchema = createInsertSchema(mealTransactions);
export type InsertMealTransaction = z.infer<typeof mealTransactionsInsertSchema>;
export type MealTransaction = typeof mealTransactions.$inferSelect;

// ============================================================================
// ADVANCED REPORTS & ANALYTICS
// ============================================================================

// Report Templates
export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  description: text("description"),
  category: text("category").notNull(),
  dataSource: text("data_source").notNull(),
  columns: json("columns").notNull(),
  filters: json("filters"),
  grouping: json("grouping"),
  sorting: json("sorting"),
  chartConfig: json("chart_config"),
  isPublic: boolean("is_public").default(false),
  schoolId: integer("school_id").notNull().default(1),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reportTemplatesInsertSchema = createInsertSchema(reportTemplates);
export type InsertReportTemplate = z.infer<typeof reportTemplatesInsertSchema>;
export type ReportTemplate = typeof reportTemplates.$inferSelect;

// ============================================================================
// ADVANCED MARK & GRADE MANAGEMENT SYSTEM
// ============================================================================

// Subjects table
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn").notNull(),
  code: text("code").unique(),
  description: text("description"),
  schoolId: integer("school_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subjectsInsertSchema = createInsertSchema(subjects).omit({
  id: true,
  createdAt: true,
});
export type InsertSubject = z.infer<typeof subjectsInsertSchema>;
export type Subject = typeof subjects.$inferSelect;

// Grade Scales table
export const gradeScales = pgTable("grade_scales", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().default(1),
  scaleName: text("scale_name").notNull(),
  scaleNameBn: text("scale_name_bn"),
  scaleType: text("scale_type").notNull(), // percentage, letter, points, descriptive
  minValue: decimal("min_value", { precision: 5, scale: 2 }),
  maxValue: decimal("max_value", { precision: 5, scale: 2 }),
  gradeLabels: json("grade_labels").$type<Array<{
    min: number;
    max: number;
    grade: string;
    gpa?: number;
    description?: string;
  }>>(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gradeScalesInsertSchema = createInsertSchema(gradeScales).omit({
  id: true,
  createdAt: true,
});
export type InsertGradeScale = z.infer<typeof gradeScalesInsertSchema>;
export type GradeScale = typeof gradeScales.$inferSelect;

// Assessments table
export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().default(1),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  class: text("class").notNull(),
  section: text("section").notNull(),
  academicYearId: integer("academic_year_id").references(() => academicYears.id),
  termId: integer("term_id").references(() => academicTerms.id),
  assessmentName: text("assessment_name").notNull(),
  assessmentNameBn: text("assessment_name_bn"),
  assessmentType: text("assessment_type").notNull(), // homework, quiz, project, exam, test
  totalMarks: decimal("total_marks", { precision: 6, scale: 2 }).notNull(),
  weightPercentage: decimal("weight_percentage", { precision: 5, scale: 2 }),
  date: date("date"),
  createdByTeacherId: integer("created_by_teacher_id").references(() => teachers.id),
  description: text("description"),
  descriptionBn: text("description_bn"),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const assessmentsInsertSchema = createInsertSchema(assessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAssessment = z.infer<typeof assessmentsInsertSchema>;
export type Assessment = typeof assessments.$inferSelect;

// Assessment Components table
export const assessmentComponents = pgTable("assessment_components", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").references(() => assessments.id).notNull(),
  componentName: text("component_name").notNull(),
  componentNameBn: text("component_name_bn"),
  maxScore: decimal("max_score", { precision: 6, scale: 2 }).notNull(),
  weightPercentage: decimal("weight_percentage", { precision: 5, scale: 2 }),
  rubricCriteria: json("rubric_criteria").$type<Array<{
    criterion: string;
    points: number;
    description?: string;
  }>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assessmentComponentsInsertSchema = createInsertSchema(assessmentComponents).omit({
  id: true,
  createdAt: true,
});
export type InsertAssessmentComponent = z.infer<typeof assessmentComponentsInsertSchema>;
export type AssessmentComponent = typeof assessmentComponents.$inferSelect;

// Student Scores table
export const studentScores = pgTable("student_scores", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").references(() => assessments.id).notNull(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  scoreObtained: decimal("score_obtained", { precision: 6, scale: 2 }),
  gradeLetter: text("grade_letter"),
  remarks: text("remarks"),
  remarksBn: text("remarks_bn"),
  submittedDate: date("submitted_date"),
  gradedByTeacherId: integer("graded_by_teacher_id").references(() => teachers.id),
  gradedDate: date("graded_date"),
  isAbsent: boolean("is_absent").default(false),
  isExcused: boolean("is_excused").default(false),
  bonusPoints: decimal("bonus_points", { precision: 6, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studentScoresInsertSchema = createInsertSchema(studentScores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStudentScore = z.infer<typeof studentScoresInsertSchema>;
export type StudentScore = typeof studentScores.$inferSelect;

// Grade Overrides table
export const gradeOverrides = pgTable("grade_overrides", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  termId: integer("term_id").references(() => academicTerms.id),
  overrideGrade: text("override_grade").notNull(),
  reason: text("reason").notNull(),
  reasonBn: text("reason_bn"),
  createdBy: integer("created_by").references(() => teachers.id),
  approvedBy: integer("approved_by").references(() => teachers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
});

export const gradeOverridesInsertSchema = createInsertSchema(gradeOverrides).omit({
  id: true,
  createdAt: true,
});
export type InsertGradeOverride = z.infer<typeof gradeOverridesInsertSchema>;
export type GradeOverride = typeof gradeOverrides.$inferSelect;

// User School Memberships table - CRITICAL for multi-tenant RLS security
export const userSchoolMemberships = pgTable("user_school_memberships", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // UUID from Supabase auth.users
  schoolId: integer("school_id").references(() => schools.id).notNull(),
  role: text("role").notNull(), // super_admin, admin, staff, teacher, student, parent
  isActive: boolean("is_active").default(true),
  permissions: json("permissions").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userSchoolMembershipsInsertSchema = createInsertSchema(userSchoolMemberships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserSchoolMembership = z.infer<typeof userSchoolMembershipsInsertSchema>;
export type UserSchoolMembership = typeof userSchoolMemberships.$inferSelect;