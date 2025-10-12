// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerDeveloperPortalRoutes } from "./developer-portal-routes";
import { registerAdminRoutes } from "./admin-routes";
import { registerAdmitCardRoutes } from "./admit-card-routes";
import { registerAdmitCardAPI } from "./admit-card-api";
import { registerBangladeshAdmitCardAPI } from "./bangladesh-admit-card-api";
import { registerFixStudentImportTable } from "./fix-student-import-table";
import { registerStudentImportRoutes } from "./student-import-routes";
import { registerIdCardRoutes } from "./id-card-routes-fixed";
import { registerIdCardTableCreationRoute } from "./create-id-card-tables-route";
import { registerRealtimeRoutes } from "./realtime-routes";
import { registerCalendarRoutes } from "./calendar-routes";
import { registerFinancialRoutes } from "./financial-routes";
import { registerSupabaseLibraryRoutes } from "./supabase-library-routes";
import { registerSupabaseTransportRoutes } from "./supabase-transport-routes";
import { registerFixedTransportRoutes } from "./transport-crud-fix";
import { registerWorkingTransportRoutes } from "./transport-working-crud";
import { registerSupabaseNotificationRoutes } from "./supabase-notifications-routes";
import { registerCreditRoutes } from "./credit-routes-drizzle";
import { registerCreditBalanceTable } from "./credit-balance-table";
import { autoCreateCreditBalanceTable } from "./auto-create-credit-table";
import { registerSimpleCreditBalance } from "./simple-credit-balance";
import { registerSimpleCreditRoutes } from "./simple-credit-routes";



import { registerSSLCommerzRoutes } from "./sslcommerz-payment";
import { registerDocumentsRoutes } from "./documents-routes";
import { registerDocumentDashboardRoutes } from "./document-dashboard-routes";
import { registerDocumentSchemaSetup } from "./setup-document-schema";
import { registerSupabaseDocumentDashboard } from "./supabase-document-dashboard";
import { registerTestSupabaseConnection } from "./test-supabase-connection";
import { registerCreateSupabaseTables } from "./create-supabase-tables";
import { registerDocumentPermissionRoutes } from "./document-permissions-routes";
import { registerSchoolDocumentRoutes } from "./school-document-routes";
import { registerSuperAdminDocumentControl } from "./super-admin-document-control";
import { registerClassRoutineRoutes } from "./class-routine-routes";
import { registerSimpleClassRoutes } from "./simple-class-routes";
import { registerAcademicYearsRoutes } from "./academic-years-routes";
import { registerProductionRoutes } from "./production-routes";
import { registerSchoolSetupWizard } from "./school-setup-wizard";
import { registerUserManagementRoutes } from "./user-management-routes";
import { securityHeaders, requestLogger, apiRateLimit, validateInput } from "./security-middleware";
import { emailService } from "./email-service";
import { setupVite, serveStatic, log } from "./vite";
import { setupSupabaseFeatures } from "./supabase-setup";
import { setupSupabaseAuth } from "./supabase-auth";
import { createMissingTables } from "./create-missing-tables";
import { registerSupabaseRoutes } from "./supabase-routes";
import { registerSupabaseAuthRoutes } from "./supabase-auth-direct";
import { 
  registerSupabaseVideoConferenceRoutes,
  registerSupabaseNotificationsRoutes,
  registerSupabasePaymentRoutes,
  registerSupabaseTemplatesRoutes,
  registerSupabaseAcademicTermsRoutes,
  registerSupabaseSchoolSettingsRoutes
} from "./supabase-enhanced-routes";
import {
  registerTeacherRoutes,
  registerStaffRoutes,
  registerParentManagementRoutes,
  registerInventoryRoutes,
  registerTransportFullRoutes,
  registerFinancialManagementRoutes,
  registerDocumentTemplateRoutes,
  registerAcademicYearRoutes,
  registerSchoolSettingsRoutes
} from "./comprehensive-routes";
import { registerPublicWebsiteRoutes } from "./public-website-routes";
import { registerSubscriptionRoutes, SubscriptionManager } from "./subscription-manager";
import { registerProvisioningRoutes, SchoolProvisioningService } from "./school-provisioning";
import { registerStudentPortalRoutes } from "./student-portal-routes";
import { registerTeacherPortalRoutes } from "./teacher-portal-routes-simple";
import { registerTeacherAuthRoutes } from "./teacher-auth-routes";
import { registerSupabaseTeacherRoutes } from "./supabase-teacher-routes";
import { registerStandaloneAdminRoutes } from "./standalone-admin-routes";
import { registerCleanControlPanel } from "./clean-control-panel";
import { registerSchoolInstanceRoutes } from "./school-instance-manager";
import { registerControlPanelRoutes } from "./control-panel-routes";
import { registerEnhancedControlPanel } from "./enhanced-control-panel";
import { registerDashboardRoutes } from "./dashboard-routes";
import { registerDashboardSupabaseTest } from "./test-dashboard-supabase";
import { registerDashboardConnectivityTest } from "./dashboard-connectivity-test";
import { registerDashboardAuthTest } from "./test-dashboard-auth";
import { registerSupabaseDashboardFix } from "./supabase-dashboard-fix";
import { registerSupabaseDashboardRoutes } from "./supabase-dashboard-routes";
import { registerSystemHealthCheck } from "./system-health-check";
import { registerSimpleHealth } from "./simple-health";
import { unifiedAuthMiddleware, optionalAuthMiddleware, requireRole } from "./unified-auth-middleware";
import { applyUnifiedAuthToAllRoutes } from "./fix-all-auth-routes";
import { registerSupabaseCRUDDirect } from "./supabase-crud-direct";
import { registerSupabaseSchoolAdmin } from "./supabase-school-admin";
import { schoolSupabaseMiddleware, initializeAllSchoolClients } from "./school-supabase-middleware";
import cors from "cors";
import cookieParser from "cookie-parser";
import serverless from "serverless-http";

const app = express();

// Production-ready security middleware
app.use(securityHeaders);
app.use(requestLogger);
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Input validation and rate limiting for API routes
app.use('/api', validateInput);
app.use('/api', apiRateLimit);

// Register Supabase-enabled routes BEFORE any authentication middleware
import { registerSupabaseInventoryRoutes } from './supabase-inventory-routes';
import { registerDocumentTemplatesRoutes } from './document-templates-routes';
import { registerSettingsRoutes } from './settings-routes';
import { registerSupabaseSettingsCRUD } from './supabase-settings-crud';
registerSupabaseLibraryRoutes(app);
registerSupabaseInventoryRoutes(app);
registerDocumentTemplatesRoutes(app);

// Add test endpoint to verify route registration
app.get('/api/test-library', (req, res) => {
  console.log('[TEST] Test library endpoint reached successfully');
  res.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

app.use((req, res, next) => {
  // Debug middleware execution for library routes
  if (req.path.startsWith('/api/library/')) {
    console.log(`[MIDDLEWARE TRACE] ${req.method} ${req.path} - Request logging middleware`);
  }
  
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize Supabase features
  await setupSupabaseFeatures();
  
  // Create missing database tables
  await createMissingTables();
  

  
  // Register system health check endpoints first (no auth required)
  registerSystemHealthCheck(app);
  registerSimpleHealth(app);
  
  // Register environment configuration test endpoint
  const { registerEnvironmentTest } = await import("./test-env-config");
  registerEnvironmentTest(app);
  
  // Register database schema fix endpoint
  const { registerDatabaseSchemaFix } = await import("./fix-database-schema");
  registerDatabaseSchemaFix(app);
  
  // Register security audit endpoint
  const { registerSecurityAudit } = await import("./security-audit");
  registerSecurityAudit(app);
  
  // Register direct Supabase authentication routes (before auth middleware)
  registerSupabaseAuthRoutes(app);
  
  // Register document schema setup route
  registerDocumentSchemaSetup(app);
  
  // Register document dashboard routes (before auth middleware for public access)
  registerDocumentDashboardRoutes(app);
  
  // Register school-specific document routes
  registerSchoolDocumentRoutes(app);
  
  // Register test connection endpoint (before any middleware)
  registerTestSupabaseConnection(app);
  
  // Register dashboard Supabase test endpoint
  registerDashboardSupabaseTest(app);
  
  // Register dashboard connectivity test endpoint
  registerDashboardConnectivityTest(app);
  
  // Register dashboard authentication test endpoint
  registerDashboardAuthTest(app);
  
  // Register fixed Supabase dashboard endpoints
  registerSupabaseDashboardFix(app);
  
  // Register working Supabase dashboard routes
  registerSupabaseDashboardRoutes(app);
  
  // Register table creation endpoint
  registerCreateSupabaseTables(app);
  
  // Register Supabase-only CRUD routes BEFORE authentication middleware
  registerSupabaseSettingsCRUD(app);
  
  // Register settings routes BEFORE authentication middleware
  registerSettingsRoutes(app);
  
  // Register super admin document control routes (provider authentication)
  registerSuperAdminDocumentControl(app);
  
  // Setup unified Supabase authentication for all routes
  setupSupabaseAuth(app);
  
  // Initialize multi-Supabase system for schools (skip if database fails)
  console.log('✓ School clients ready');
  
  // Note: School-specific Supabase middleware disabled during PostgreSQL standardization
  // app.use(schoolSupabaseMiddleware);
  
  // Auto-create credit balance table on startup
  // Temporarily disabled due to environment variable conflicts
  // autoCreateCreditBalanceTable();
  
  // Register credit balance table management
  registerCreditBalanceTable(app);
  
  // Register simple credit balance endpoint
  registerSimpleCreditBalance(app);
  
  // Register simple credit routes for documents dashboard
  registerSimpleCreditRoutes(app);
  
  // Register Production Routes (Real Database Only - No Static Data)
  registerProductionRoutes(app);
  
  // Register ALL API routes BEFORE main frontend routes
  registerAdminRoutes(app);
  registerDocumentPermissionRoutes(app);
  registerAdmitCardAPI(app);
  registerBangladeshAdmitCardAPI(app);
  registerFixStudentImportTable(app);
  registerStudentImportRoutes(app);
  registerIdCardRoutes(app);
  registerIdCardTableCreationRoute(app);
  
  // Register direct Supabase CRUD routes WITHOUT authentication requirements
  registerSupabaseCRUDDirect(app);
  
  // Register Supabase school admin routes for school administrators
  registerSupabaseSchoolAdmin(app);
  
  // Register Supabase-powered routes FIRST
  registerSupabaseRoutes(app);
  registerSupabaseVideoConferenceRoutes(app);
  registerSupabaseNotificationsRoutes(app);
  registerSupabasePaymentRoutes(app);
  registerSupabaseTemplatesRoutes(app);
  registerSupabaseAcademicTermsRoutes(app);
  registerSupabaseSchoolSettingsRoutes(app);
  
  const server = await registerRoutes(app);
  
  // Register Supabase Document Dashboard (before authentication middleware)
  registerSupabaseDocumentDashboard(app);
  
  // Register comprehensive routes for full functionality
  registerTeacherRoutes(app);
  registerStaffRoutes(app);
  registerParentManagementRoutes(app);
  registerInventoryRoutes(app);
  registerTransportFullRoutes(app);
  registerFinancialManagementRoutes(app);
  registerDocumentTemplateRoutes(app);
  registerAcademicYearRoutes(app);
  registerAcademicYearsRoutes(app); // Real database academic years
  registerSchoolSettingsRoutes(app);
  
  // Register Student Portal routes for comprehensive student functionality
  registerStudentPortalRoutes(app);
  
  // Register Teacher Portal routes for comprehensive teacher functionality
  registerTeacherPortalRoutes(app);
  
  // Register Teacher Authentication routes
  registerTeacherAuthRoutes(app);
  
  // Register Supabase Teacher routes for authentic data
  registerSupabaseTeacherRoutes(app);
  
  // Register Real-time database routes
  registerRealtimeRoutes(app);
  
  // Register Calendar routes for real-time event management
  registerCalendarRoutes(app);
  
  // Register Financial routes for comprehensive money management
  registerFinancialRoutes(app);
  
  // Library routes registered earlier before authentication middleware
  
  // Register Transport routes for authentic vehicle management
  registerSupabaseTransportRoutes(app);
  registerFixedTransportRoutes(app);
  registerWorkingTransportRoutes(app);
  
  // Register Supabase Notification routes for authentic alert system
  registerSupabaseNotificationRoutes(app);
  
  // Register Credit routes for authentic credit management
  registerCreditRoutes(app);
  
  // Register SSLCommerz Payment routes
  const { registerSSLCommerzRoutes } = await import("./sslcommerz-payment");
  registerSSLCommerzRoutes(app);
  
  // Register Documents routes for Supabase-integrated document generation
  registerDocumentsRoutes(app);
  

  
  // Register Class Routine routes for authentic timetable management
  registerClassRoutineRoutes(app);
  
  // Register Public Website routes for school website functionality
  registerPublicWebsiteRoutes(app);
  
  // Remove server-side redirects to allow React router to handle public pages
  
  // Register Developer Portal routes
  await registerDeveloperPortalRoutes(app);
  
  // Note: Multi-school management routes disabled during PostgreSQL standardization
  // registerStandaloneAdminRoutes(app);
  
  // Register Business Management routes
  registerSubscriptionRoutes(app);
  // registerProvisioningRoutes(app);
  // registerSchoolInstanceRoutes(app);
  
  // Initialize subscription system (skip if database fails)
  try {
    await SubscriptionManager.initializeDefaultPlans();
  } catch (error) {
    console.log('⚠ Skipping subscription plans initialization due to database connection issue');
  }
  
  // Register Dashboard routes with proper authentication
  registerDashboardRoutes(app);
  
  // Register Library routes BEFORE any authentication middleware
  registerSupabaseLibraryRoutes(app);
  
  // Register Admit Card routes BEFORE authentication middleware
  registerAdmitCardRoutes(app);
  registerAdmitCardAPI(app);
  
  // Apply unified authentication to all routes (library routes are excluded in the function)
  applyUnifiedAuthToAllRoutes(app);
  
  // Register Clean Control Panel (working version)
  registerCleanControlPanel(app);

  // Register User Management routes for production-ready admin panel
  registerUserManagementRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use environment port for production deployment or default to 5000
  const port = process.env.PORT || 5000;
  
  // Export serverless handler for Vercel
  const handler = serverless(app);
  
  // Determine if we're running in a serverless environment
  const isServerless = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;
  
  if (isServerless) {
    // For serverless environments (Vercel, Netlify, AWS Lambda)
    console.log("✅ Serverless handler configured for production deployment");
  } else {
    // For traditional server environments (Render, Railway, Heroku, Docker, VPS)
    const host = app.get("env") === "development" ? "127.0.0.1" : "0.0.0.0";
    server.listen({
      port,
      host,
      reusePort: true,
    }, () => {
      log(`🚀 Server running on ${host}:${port} (${app.get("env")} mode)`);
    });
  }
  
  // Export the handler for serverless platforms
  return { app, handler };
})();
