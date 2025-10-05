import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { initializeNavigation, navigationHistory } from "@/lib/navigation";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import UnifiedAuthPage from "@/pages/auth/unified-auth-page";
import SimpleLogin from "@/pages/simple-login";
import RegisterAdminPage from "@/pages/auth/register-admin";
import WelcomePage from "@/pages/welcome";

// Portal Pages
import LoginPage from "@/pages/auth/login-page";
import AdminPortal from "@/pages/portals/admin-portal";
import ParentPortal from "@/pages/portals/parent-portal";
import StudentPortal from "@/pages/portals/student-portal";
import StudentLogin from "@/pages/portals/student-login";
import ParentLogin from "@/pages/portals/parent-login";
import AdminPanel from "@/pages/admin-panel";

// Student Portal Pages
import StudentProfile from "@/pages/student/profile";
import StudentAttendance from "@/pages/student/attendance";
import StudentFees from "@/pages/student/fees";
import StudentLibrary from "@/pages/student/library";
import StudentResults from "@/pages/student/results";
import StudentSchedule from "@/pages/student/schedule";
import StudentNotifications from "@/pages/student/notifications";

// Teacher Portal Application (Separate System)
import TeacherApp from "@/pages/teacher-portal/teacher-app";
import TeacherPortalNew from "@/pages/teacher-portal-new";

// Public Website Pages
import PublicHomePage from "@/pages/public/home-page";
import TestPage from "@/pages/test-page";
import AboutPage from "@/pages/public/about-page";
import AcademicsPage from "@/pages/public/academics-page";
import AdmissionsPage from "@/pages/public/admissions-page";
import ContactPage from "@/pages/public/contact-page";
import FeeReceiptsMainPage from "@/pages/documents/fee-receipts";
import AdmitCardDashboard from "@/pages/admit-card/admit-card-dashboard";
import AdmitCardDashboardEnhanced from "@/pages/admit-card/admit-card-dashboard-enhanced";
import AdmitCardManager from "@/pages/admit-card/admit-card-manager";
import CreateSingleAdmitCard from "@/pages/admit-card/create-single";
import AdmitCardBatchCreation from "@/pages/admit-card/batch-creation";
import AdmitCardTemplatesManagement from "@/pages/admit-card/templates";
import AdmitCardSettings from "@/pages/admit-card/settings";
import StudentImport from "@/pages/admit-card/student-import";

import AdmitCardHistory from "@/pages/admit-card/history";
import CreateTemplate from "@/pages/admit-card/create-template";
import BanglaTemplateGenerator from "@/pages/admit-card/bangla-template-generator";
import ClassRoutinesMobileComponent from "@/pages/documents/class-routines-mobile";
import TeacherRoutinesEnhancedComponent from "@/pages/documents/teacher-routines-enhanced";
import IdCardDashboard from "@/pages/id-card/id-card-dashboard";
import CreateSingleIdCard from "@/pages/id-card/create-single";
import IdCardBatchCreation from "@/pages/id-card/batch-creation";
import IdCardTemplatesManagement from "@/pages/id-card/templates";
import IdCardSettings from "@/pages/id-card/settings";
import IdCardHistory from "@/pages/id-card/history";

// Essential Document Pages Only (cleaned up to prevent duplicates)
import StudentsPage from "@/pages/management/students";
import TeachersPage from "@/pages/management/teachers";
import FinancesPage from "@/pages/management/finances";
import StaffPage from "@/pages/management/staff";
import ParentsPage from "@/pages/management/parents";
import LibraryPage from "@/pages/library/index";
import InventoryPage from "@/pages/inventory/index";
import TransportPage from "@/pages/transport/index";
import ToolsPage from "@/pages/tools/index";
import TemplatesPage from "@/pages/settings/templates";
import AdminSettingsPage from "@/pages/settings/admin";
import SchoolSettingsPage from "@/pages/settings/school";
import AcademicYearsPage from "@/pages/settings/academic-years";
import CalendarPage from "@/pages/calendar/simple-calendar";
import NotificationsPage from "@/pages/notifications/index";
import FinancialPage from "@/pages/financial";
import ResponsiveDashboard from "@/pages/responsive-dashboard";
import ParentPortalSimple from "@/pages/parent-portal-simple";
import PaymentGateway from "@/pages/payment-gateway";
import LiveNotifications from "@/pages/notifications/live-notifications";
import VideoConferencing from "@/pages/video-conferencing";
import BuyCreditsPage from "@/pages/credits/buy-credits-clean";
import PaymentOptions from "@/pages/credits/payment-options";
import TransactionsPage from "@/pages/credits/transactions";
import CreditPage from "@/pages/credits/supabase-dashboard";
import UserManagement from "@/pages/user-management";
import UserManagementPortals from "@/pages/user-management-portals";

import DocumentsDashboardUX from "@/pages/documents/documents-dashboard-ux";
import DocumentGenerator from "@/pages/documents/document-generator";
import ExamPapersPage from "@/pages/documents/exam-papers";
import TransferCertificatesPage from "@/pages/documents/transfer-certificates";
import NoticesPage from "@/pages/documents/notices";
import TeacherIdCardsPage from "@/pages/documents/teacher-id-cards";
import ClassRoutinesPage from "@/pages/documents/class-routines";
import TeacherRoutinesPage from "@/pages/documents/teacher-routines";
import MarkSheetsPage from "@/pages/documents/marksheets";
import ResultSheetsPage from "@/pages/documents/result-sheets";
import TestimonialsPage from "@/pages/documents/testimonials";
import PaySheetsPage from "@/pages/documents/pay-sheets";
import IncomeReportsPage from "@/pages/documents/income-reports";
import ExpenseSheetsPage from "@/pages/documents/expense-sheets";
import AdmissionFormsPage from "@/pages/documents/admission-forms";
import OfficeOrdersPage from "@/pages/documents/office-orders";
import OMRSheetsPage from "@/pages/documents/omr-sheets";
import MCQFormatsPage from "@/pages/documents/mcq-formats";
import DocumentsTemplatesPage from "@/pages/documents/templates";
import DeveloperPortal from "@/pages/developer-portal";
import AdminControlPage from "@/pages/admin-control";
import SchoolAdminDashboard from "@/pages/settings/school-admin-dashboard";
import RealtimeTestPage from "@/pages/realtime-test";
import SuperAdminDocumentControl from "@/pages/SuperAdminDocumentControl";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfService from "@/pages/terms-of-service";
import DiagnosticPage from "@/pages/diagnostic";

// New Teacher Portal Pages
import TeacherMarkEntry from "@/pages/teacher-portal/mark-entry";
import TeacherAttendanceMarking from "@/pages/teacher-portal/attendance-marking";
import TeacherDashboard from "@/pages/teacher-portal/teacher-dashboard";

// New Admin Pages
import MarksApproval from "@/pages/admin/marks-approval";

// New Feature Pages - All Missing Modules
import SubjectsManagement from "@/pages/academic/subjects-management";
import AssignmentsManagement from "@/pages/academic/assignments-management";
import TimetablePage from "@/pages/academic/timetable";
import LeaveManagement from "@/pages/hr/leave-management";
import StaffAttendance from "@/pages/hr/staff-attendance";
import PayrollSystem from "@/pages/hr/payroll-system";
import ReportsDashboard from "@/pages/reports/reports-dashboard";
import HostelManagement from "@/pages/hostel/hostel-management";
import AdmissionPortal from "@/pages/admission/admission-portal";

// Communication System Pages
import AnnouncementsBoard from "@/pages/communication/announcements-board";
import NotificationsSystem from "@/pages/communication/notifications-system";
import ParentTeacherMessaging from "@/pages/communication/parent-teacher-messaging";

// Student Welfare Pages
import CoCurricularActivities from "@/pages/student-welfare/co-curricular-activities";
import DisciplinaryRecords from "@/pages/student-welfare/disciplinary-records";
import HealthRecords from "@/pages/student-welfare/health-records";
import MedicalCheckups from "@/pages/student-welfare/medical-checkups";
import Vaccinations from "@/pages/student-welfare/vaccinations";

// Exam Management Pages
import ExamScheduling from "@/pages/exam-management/exam-scheduling";
import SeatingArrangements from "@/pages/exam-management/seating-arrangements";
import InvigilationDuties from "@/pages/exam-management/invigilation-duties";

// HR Additional Pages
import PerformanceAppraisal from "@/pages/hr/performance-appraisal";

// Inventory Additional Pages
import VendorsPage from "@/pages/inventory/vendors";
import PurchaseOrdersPage from "@/pages/inventory/purchase-orders";
import StockAlertsPage from "@/pages/inventory/stock-alerts";

// Admission Additional Pages
import AdmissionTests from "@/pages/admission/tests";
import AdmissionInterviews from "@/pages/admission/interviews";

// Hostel Additional Pages
import HostelRooms from "@/pages/hostel/rooms";
import HostelMeals from "@/pages/hostel/meals";
import HostelAttendance from "@/pages/hostel/attendance";

import { ProtectedRoute } from "@/lib/protected-route";

import { SupabaseAuthProvider } from "@/hooks/use-supabase-direct-auth";
import { SchoolProvider } from "@/hooks/use-school-context";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { useMobile } from '@/hooks/use-mobile';
import { UXProvider } from "@/components/ux-system";
import { initializeUXAutoEnhancer } from "@/lib/ux-auto-enhancer";
import { ErrorBoundary } from "@/components/error-boundary";
import ErrorBoundaryWrapper from "@/components/layout/error-boundary-wrapper";
import { LoadingProvider } from "@/hooks/use-loading-state";
import { ProductionDataProvider } from "@/components/production-data-provider";

// We need this wrapper to handle the authentication
function AppRoutes() {

  return (
    <Switch>
      {/* Portal Authentication Routes */}
      <Route path="/login" component={SimpleLogin} />
      <Route path="/simple-login" component={SimpleLogin} />
      <Route path="/student-login" component={StudentLogin} />
      <Route path="/parent-login" component={ParentLogin} />
      <Route path="/register-admin" component={RegisterAdminPage} />
      <Route path="/admin" component={AdminPortal} />
      <Route path="/admin-panel" component={AdminPanel} />
      <Route path="/parent" component={ParentPortal} />
      <Route path="/student" component={StudentPortal} />
      
      {/* Public Website Routes - accessible without authentication */}
      <Route path="/about" component={AboutPage} />
      <Route path="/academics" component={AcademicsPage} />
      <Route path="/admissions" component={AdmissionsPage} />
      <Route path="/contact" component={ContactPage} />
      
      <Route path="/auth" component={AuthPage} />

      {/* Documents Dashboard - Main documents page */}
      <ProtectedRoute path="/documents" component={DocumentsDashboardUX} />
      
      {/* Dynamic Document Generator removed - using named routes instead */}
      
      {/* Admit Card Module */}
      <ProtectedRoute path="/admit-card" component={AdmitCardDashboardEnhanced} />
      <ProtectedRoute path="/admit-card/dashboard" component={AdmitCardDashboardEnhanced} />
      <ProtectedRoute path="/admit-card/manager" component={AdmitCardManager} />
      <ProtectedRoute path="/admit-card/create-single" component={CreateSingleAdmitCard} />
      <ProtectedRoute path="/admit-card/batch-creation" component={AdmitCardBatchCreation} />
      <ProtectedRoute path="/admit-card/templates" component={AdmitCardTemplatesManagement} />
      <ProtectedRoute path="/admit-card/settings" component={AdmitCardSettings} />
      <ProtectedRoute path="/admit-card/student-import" component={StudentImport} />

      <ProtectedRoute path="/admit-card/history" component={AdmitCardHistory} />
      <ProtectedRoute path="/admit-card/create-template" component={CreateTemplate} />
      <ProtectedRoute path="/admit-card/bangla-generator" component={BanglaTemplateGenerator} />
      
      {/* ID Card Module */}
      <ProtectedRoute path="/id-card" component={IdCardDashboard} />
      <ProtectedRoute path="/id-card/dashboard" component={IdCardDashboard} />
      <ProtectedRoute path="/id-card/create-single" component={CreateSingleIdCard} />
      <ProtectedRoute path="/id-card/batch-creation" component={IdCardBatchCreation} />
      <ProtectedRoute path="/id-card/templates" component={IdCardTemplatesManagement} />
      <ProtectedRoute path="/id-card/settings" component={IdCardSettings} />
      <ProtectedRoute path="/id-card/history" component={IdCardHistory} />
      
      {/* Core Document Routes - Unified and Responsive */}
      <ProtectedRoute path="/documents/document-generator" component={DocumentGenerator} />
      <ProtectedRoute path="/documents/bengali-admit-cards" component={BanglaTemplateGenerator} />
      <ProtectedRoute path="/documents/transfer-certificates" component={TransferCertificatesPage} />
      
      {/* Essential Document Routes - All document types */}
      <ProtectedRoute path="/documents/fee-receipts" component={FeeReceiptsMainPage} />
      <ProtectedRoute path="/documents/notices" component={NoticesPage} />
      <ProtectedRoute path="/documents/exam-papers" component={ExamPapersPage} />
      <ProtectedRoute path="/documents/teacher-id-cards" component={TeacherIdCardsPage} />
      <ProtectedRoute path="/documents/class-routines" component={ClassRoutinesPage} />
      <ProtectedRoute path="/documents/teacher-routines" component={TeacherRoutinesPage} />
      <ProtectedRoute path="/documents/marksheets" component={MarkSheetsPage} />
      <ProtectedRoute path="/documents/result-sheets" component={ResultSheetsPage} />
      <ProtectedRoute path="/documents/testimonials" component={TestimonialsPage} />
      <ProtectedRoute path="/documents/pay-sheets" component={PaySheetsPage} />
      <ProtectedRoute path="/documents/income-reports" component={IncomeReportsPage} />
      <ProtectedRoute path="/documents/expense-sheets" component={ExpenseSheetsPage} />
      <ProtectedRoute path="/documents/admission-forms" component={AdmissionFormsPage} />
      <ProtectedRoute path="/documents/office-orders" component={OfficeOrdersPage} />
      <ProtectedRoute path="/documents/omr-sheets" component={OMRSheetsPage} />
      <ProtectedRoute path="/documents/mcq-formats" component={MCQFormatsPage} />
      <ProtectedRoute path="/documents/templates" component={DocumentsTemplatesPage} />

      {/* Management routes */}
      <ProtectedRoute path="/management/students" component={StudentsPage} />
      <ProtectedRoute path="/management/teachers" component={TeachersPage} />
      <ProtectedRoute path="/management/finances" component={FinancesPage} />
      <ProtectedRoute path="/management/staff" component={StaffPage} />
      <ProtectedRoute path="/management/parents" component={ParentsPage} />
      <ProtectedRoute path="/management/library" component={LibraryPage} />
      <ProtectedRoute path="/management/inventory" component={InventoryPage} />
      <ProtectedRoute path="/management/transport" component={TransportPage} />

      {/* Direct routes for new enhanced modules */}
      <ProtectedRoute path="/library" component={LibraryPage} />
      <ProtectedRoute path="/inventory" component={InventoryPage} />
      <ProtectedRoute path="/inventory/vendors" component={VendorsPage} />
      <ProtectedRoute path="/inventory/purchase-orders" component={PurchaseOrdersPage} />
      <ProtectedRoute path="/inventory/stock-alerts" component={StockAlertsPage} />
      <ProtectedRoute path="/transport" component={TransportPage} />
      <ProtectedRoute path="/tools" component={ToolsPage} />

      {/* Settings routes */}
      <ProtectedRoute path="/settings/templates" component={TemplatesPage} />
      <ProtectedRoute path="/settings/admin" component={AdminSettingsPage} />
      <ProtectedRoute path="/settings/school" component={SchoolSettingsPage} />
      <ProtectedRoute path="/settings/academic-years" component={AcademicYearsPage} />

      <ProtectedRoute path="/calendar" component={CalendarPage} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      <ProtectedRoute path="/financial" component={FinancialPage} />

      {/* Credits routes */}
      <ProtectedRoute path="/credits/buy" component={BuyCreditsPage} />
      <ProtectedRoute path="/credits/payment/:packageId" component={PaymentOptions} />
      <ProtectedRoute path="/credits/transactions" component={TransactionsPage} />
      <ProtectedRoute path="/credits" component={CreditPage} />

      {/* Parent Portal - For parents to track their children */}
      <ProtectedRoute path="/parent-portal" component={ParentPortalSimple} />

      {/* Payment Gateway - For fee payments */}
      <ProtectedRoute path="/payment" component={PaymentGateway} />

      {/* Live Notifications - Real-time alerts and updates */}
      <ProtectedRoute path="/notifications/live" component={LiveNotifications} />

      {/* Video Conferencing - Online classes and meetings */}
      <ProtectedRoute path="/video-conferencing" component={VideoConferencing} />



      {/* Developer Portal - Master control system for managing multiple schools */}
      <Route path="/portal" component={DeveloperPortal} />

      {/* School Admin Dashboard - Pure Supabase school administration */}
      <ProtectedRoute path="/school-admin" component={SchoolAdminDashboard} />
      
      {/* Admin Control - Complete administrative control over all system features */}
      <ProtectedRoute path="/admin-control" component={AdminControlPage} />

      {/* Super Admin Document Control - Provider authentication system */}
      <ProtectedRoute path="/super-admin" component={SuperAdminDocumentControl} />

      {/* User Management - Supabase user tracking and management */}
      <ProtectedRoute path="/user-management" component={UserManagement} />
      
      {/* Portal User Management - Create and manage student/parent/teacher authentication */}
      <ProtectedRoute path="/portal-users" component={UserManagementPortals} />





      {/* Real-time Database Test - Test connectivity for students, teachers, staff, parents */}
      <ProtectedRoute path="/realtime-test" component={RealtimeTestPage} />

      {/* Student Portal Routes */}
      <ProtectedRoute path="/student" component={StudentPortal} />
      <ProtectedRoute path="/student/profile" component={StudentProfile} />
      <ProtectedRoute path="/student/attendance" component={StudentAttendance} />
      <ProtectedRoute path="/student/fees" component={StudentFees} />
      <ProtectedRoute path="/student/library" component={StudentLibrary} />
      <ProtectedRoute path="/student/results" component={StudentResults} />
      <ProtectedRoute path="/student/schedule" component={StudentSchedule} />
      <ProtectedRoute path="/student/notifications" component={StudentNotifications} />

      {/* Teacher Portal Routes */}
      <ProtectedRoute path="/teacher" component={TeacherDashboard} />
      <ProtectedRoute path="/teacher/marks" component={TeacherMarkEntry} />
      <ProtectedRoute path="/teacher/attendance" component={TeacherAttendanceMarking} />

      {/* Admin Routes */}
      <ProtectedRoute path="/admin/marks-approval" component={MarksApproval} />

      {/* New Feature Routes - Academic Management */}
      <ProtectedRoute path="/academic/subjects" component={SubjectsManagement} />
      <ProtectedRoute path="/academic/assignments" component={AssignmentsManagement} />
      <ProtectedRoute path="/academic/timetable" component={TimetablePage} />
      
      {/* HR & Staff Management Routes */}
      <ProtectedRoute path="/hr/leave-management" component={LeaveManagement} />
      <ProtectedRoute path="/hr/staff-attendance" component={StaffAttendance} />
      <ProtectedRoute path="/hr/payroll" component={PayrollSystem} />
      <ProtectedRoute path="/hr/performance-appraisal" component={PerformanceAppraisal} />
      
      {/* Communication System Routes */}
      <ProtectedRoute path="/communication/announcements" component={AnnouncementsBoard} />
      <ProtectedRoute path="/communication/notifications" component={NotificationsSystem} />
      <ProtectedRoute path="/communication/messaging" component={ParentTeacherMessaging} />
      
      {/* Student Welfare Routes */}
      <ProtectedRoute path="/student-welfare/activities" component={CoCurricularActivities} />
      <ProtectedRoute path="/student-welfare/disciplinary" component={DisciplinaryRecords} />
      <ProtectedRoute path="/student-welfare/health" component={HealthRecords} />
      <ProtectedRoute path="/student-welfare/medical-checkups" component={MedicalCheckups} />
      <ProtectedRoute path="/student-welfare/vaccinations" component={Vaccinations} />
      
      {/* Reports & Analytics */}
      <ProtectedRoute path="/reports" component={ReportsDashboard} />
      
      {/* Hostel Management */}
      <ProtectedRoute path="/hostel" component={HostelManagement} />
      <ProtectedRoute path="/hostel/rooms" component={HostelRooms} />
      <ProtectedRoute path="/hostel/meals" component={HostelMeals} />
      <ProtectedRoute path="/hostel/attendance" component={HostelAttendance} />
      
      {/* Admission Portal */}
      <ProtectedRoute path="/admission" component={AdmissionPortal} />
      <ProtectedRoute path="/admission/tests" component={AdmissionTests} />
      <ProtectedRoute path="/admission/interviews" component={AdmissionInterviews} />
      
      {/* Exam Management Routes */}
      <ProtectedRoute path="/exam-management/scheduling" component={ExamScheduling} />
      <ProtectedRoute path="/exam-management/seating-arrangements" component={SeatingArrangements} />
      <ProtectedRoute path="/exam-management/invigilation-duties" component={InvigilationDuties} />

      {/* Public website route */}
      <Route path="/public" component={PublicHomePage} />
      
      {/* Legal pages - publicly accessible */}
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/diagnostic" component={DiagnosticPage} />
      
      {/* Dashboard route for authenticated users */}
      <ProtectedRoute path="/dashboard" component={ResponsiveDashboard} />
      
      {/* Main URL redirects to dashboard */}
      <ProtectedRoute path="/" component={ResponsiveDashboard} />

      {/* Catch-all 404 route - must be last */}
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    initializeNavigation();
    // UX design system disabled to maintain original colors
    // initializeUXAutoEnhancer();
  }, []);

  // Check if current path is new teacher portal - completely separate system
  const currentPath = window.location.pathname;
  const isNewTeacherPortal = currentPath.startsWith('/teacher-new');

  // Render teacher portal as completely independent application
  if (isNewTeacherPortal) {
    return <TeacherPortalNew />;
  }

  return (
    <ErrorBoundaryWrapper>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <LoadingProvider>
            <LanguageProvider>
              <SupabaseAuthProvider>
                <SchoolProvider>
                  <ProductionDataProvider>
                    <UXProvider>
                      <ErrorBoundary fallback={<div className="p-4 text-center">Navigation error occurred</div>}>
                        <AppRoutes />
                      </ErrorBoundary>
                      <Toaster />
                    </UXProvider>
                  </ProductionDataProvider>
                </SchoolProvider>
              </SupabaseAuthProvider>
            </LanguageProvider>
          </LoadingProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </ErrorBoundaryWrapper>
  );
}

export default App;