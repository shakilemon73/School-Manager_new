# School Management System

## Overview
A comprehensive multi-tenant school management system leveraging modern web technologies and direct Supabase API integration for real-time data operations. It features complete portal systems for all user types (Admin, Teacher, Student, Parent) and extensive academic, administrative, HR, communication, and student welfare modules. The project aims to provide a robust, scalable, and secure platform for managing all aspects of school operations, with recent deployments configured for production-ready SPA hosting on platforms like Cloudflare Pages and Vercel.

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
- **Deployment**: Configured for Cloudflare Pages and Vercel, leveraging SPA routing and optimized builds.

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
- **Multi-tenant RLS**: All tables are protected with RLS policies, ensuring strict data isolation per school using a `user_has_school_access` helper function.
- **Direct Supabase API**: All data operations occur directly via the Supabase client, ensuring real-time capabilities and a lean backend.
- **Explicit `school_id`**: All new records must explicitly specify `school_id`; no default values are used to prevent data leakage.
- **Auth Synchronization**: `authReady` flag ensures synchronized state for user and school ID, preventing post-login race conditions.

## External Dependencies
- **Supabase**: Primary backend, providing PostgreSQL database, Row Level Security, and real-time capabilities.
- **TanStack Query (React Query)**: For data fetching, caching, and state management.
- **Radix UI primitives via shadcn/ui**: For UI components and design system.
- **Zod**: For schema validation, integrated with React Hook Form.
- **Vite**: Frontend build tool.
- **Cloudflare Pages**: Frontend hosting platform.
- **Vercel**: Frontend hosting platform.