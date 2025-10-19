# School Management System

## Overview
A comprehensive multi-tenant school management system leveraging modern web technologies and direct Supabase API integration for real-time data operations. It features complete portal systems for all user types (Admin, Teacher, Student, Parent) and extensive academic, administrative, HR, communication, and student welfare modules. The project aims to provide a robust, scalable, and secure platform for managing all aspects of school operations.

## Recent Changes (October 19, 2025)

### Fixed: Post-Login Race Condition - Data Loading & School Name Issues (COMPREHENSIVE FIX)
**Problem**: 
1. After login, dashboard showed infinite loading - data never appeared until browser refresh
2. Wrong school names appeared initially, then changed after a few seconds

**Root Cause**: Race condition between authentication state (`user`) and school ID extraction (`schoolId`):
- Auth provider set `user` and `schoolId` asynchronously in separate state updates
- Navigation triggered immediately when `user` became truthy, before `schoolId` was set
- Dashboard queries executed without valid `schoolId`, causing failures
- Multiple components made redundant async calls to fetch school ID, racing with each other
- React Query cache keys didn't include `schoolId`, allowing cross-tenant data leakage

**Solution Implemented**:

**1. Auth Provider - Synchronized State (`client/src/hooks/use-supabase-direct-auth.tsx`)**
- Added `authReady` boolean flag to track when BOTH `user` AND `schoolId` are available
- Created `extractSchoolIdFromUser()` helper for synchronous school ID extraction from user metadata
- Modified state updates to set `user`, `schoolId`, and `authReady` atomically (all together)
- `authReady` only becomes `true` when both user and schoolId exist

**2. Auth Page - Gated Navigation (`client/src/pages/auth-page.tsx`)**
- Changed navigation trigger from `if (user)` to `if (authReady && user && schoolId)`
- Navigation now waits until auth is fully initialized before redirecting to dashboard
- Added logging: `console.log('✅ Auth ready - navigating to dashboard')`

**3. School Context - Single Source of Truth (`client/src/hooks/use-school-context.tsx`)**
- Removed redundant `schoolId` state and async fetch
- Now uses `schoolId` directly from `useSupabaseDirectAuth()` (single source)
- Eliminated race condition from multiple concurrent school ID fetches

**4. Dashboard Queries - Proper Gating (`client/src/pages/responsive-dashboard.tsx`)**
- All 9 queries updated to include `schoolId` in React Query cache keys for tenant isolation
- Changed `enabled` flag from `!!user` to `authReady && !!schoolId && !academicYearLoading`
- Removed redundant `getCurrentSchoolId()` async function
- Queries now wait for `authReady` before executing

**Before Fix**:
```typescript
// ❌ Race condition
const { user } = useSupabaseDirectAuth();  // Only gets user
useEffect(() => {
  if (user) navigate('/dashboard');  // Navigates before schoolId ready
}, [user]);

useQuery({
  queryKey: ['students'],  // ❌ No tenant isolation
  enabled: !!user  // ❌ Executes before schoolId available
});
```

**After Fix**:
```typescript
// ✅ Synchronized state
const { user, schoolId, authReady } = useSupabaseDirectAuth();
useEffect(() => {
  if (authReady && user && schoolId) {  // ✅ Waits for both
    navigate('/dashboard');
  }
}, [authReady, user, schoolId]);

useQuery({
  queryKey: ['students', schoolId],  // ✅ Proper tenant isolation
  enabled: authReady && !!schoolId  // ✅ Waits for authReady
});
```

**Files Updated**:
- `client/src/hooks/use-supabase-direct-auth.tsx` - Added authReady flag and synchronous school ID extraction
- `client/src/pages/auth-page.tsx` - Gated navigation on authReady
- `client/src/hooks/use-school-context.tsx` - Use single source for schoolId
- `client/src/pages/responsive-dashboard.tsx` - Updated all query cache keys and enabled flags

**Architect Review**: ✅ PASS - "authReady synchronization eliminates post-login race condition"

**Future Improvements** (suggested by architect):
1. Add error UI for users without school_id in metadata
2. Add loading state while authReady is initializing
3. Add monitoring for authReady timing issues

### Previous Fixes
- **Performance**: Changed `count: 'exact'` to `count: 'estimated'` in dashboard queries (12-30x speedup)
- **Students Page**: Removed non-existent `academic_year_id` column filter from students table queries
- **Dashboard Load**: Optimized all dashboard statistics queries with estimated counts

## User Preferences
- Build for production-ready deployment
- Use real data, avoid mocks
- Multi-language support (English, Bengali, Arabic)
- Mobile-responsive design
- Accessibility compliance
- Always use Direct Supabase API calls (no Express routes)
- All new tables must have proper RLS for school isolation
- Update types in `new-features-types.ts` for new tables
- Do not make changes to the file `vite.config.ts`
- Do not make changes to the file `package.json`
- Do not make changes to the file `drizzle.config.ts`

## System Architecture
The system is built as a multi-tenant application with school-based data isolation enforced using Row Level Security (RLS) on Supabase (PostgreSQL). It features a serverless architecture with direct Supabase API integration, eliminating the need for Express middleware, and utilizing Supabase subscriptions for real-time updates. The frontend is developed with React 18, TypeScript, Vite, TailwindCSS, and shadcn/ui for a type-safe and modern user experience. Wouter handles routing, and React Hook Form with Zod provides robust form validation.

### UI/UX Decisions
- Modern UI built with TailwindCSS and shadcn/ui.
- Dedicated portals for Admin, Teacher, Student, and Parent roles.
- Responsive design for various devices.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, shadcn/ui.
- **State Management**: TanStack Query (React Query v5).
- **Routing**: Wouter.
- **Forms**: React Hook Form + Zod validation.
- **Database**: Supabase (PostgreSQL with RLS).
- **Type Safety**: Full TypeScript coverage with auto-generated types.

### Feature Specifications
The system includes comprehensive modules for:
- **Academic Management**: Subjects, assignments, interactive timetables, advanced exam scheduling (seating, invigilation).
- **Communication Systems**: Email/SMS notifications, parent-teacher messaging, announcements board.
- **HR & Staff Management**: Leave management, staff attendance, payroll, performance appraisal.
- **Student Welfare Systems**: Hostel management, cafeteria/meal management, disciplinary records, co-curricular activities, health and vaccination records, medical checkups.
- **Admission System**: Online admission portal, admission tests, interviews.
- **Inventory Management**: Vendor management, purchase orders, stock alerts.
- **Reports & Analytics**: Reports dashboard, custom report builder.
- **Core Management**: Student, teacher, parent, staff, finance, library, transport management.
- **Document Generation**: Admit cards, ID cards, fee receipts, mark sheets, transfer certificates.

### System Design Choices
- **Multi-tenant RLS**: All 100+ tables are protected with RLS policies, ensuring strict data isolation per school using a `user_has_school_access` helper function.
- **Direct Supabase API**: All data operations occur directly via the Supabase client, ensuring real-time capabilities and a lean backend.
- **Explicit `school_id`**: All new records must explicitly specify `school_id`; no default values are used to prevent data leakage.

## External Dependencies
- **Supabase**: Primary backend, providing PostgreSQL database, Row Level Security, and real-time capabilities.
- **TanStack Query (React Query)**: For data fetching, caching, and state management.
- **Radix UI primitives via shadcn/ui**: For UI components and design system.
- **Zod**: For schema validation, integrated with React Hook Form.
- **Vite**: Frontend build tool.