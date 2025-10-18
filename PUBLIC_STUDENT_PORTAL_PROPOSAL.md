# Public Student Portal - Implementation Proposal

## Executive Summary

This document outlines the implementation plan for a **Public Student Portal** where students can access results, download documents (mark sheets, certificates), and pay fees **without needing to log in** to the main student portal. The solution leverages your existing Supabase infrastructure with direct API calls and proper Row Level Security (RLS) policies.

---

## Current Architecture Analysis

### ✅ Existing Infrastructure (Already in Place)

**Database Tables:**
- `students` - Contains `studentId` (unique identifier), DOB, name, school info
- `examResults` - Stores `marksObtained`, `grade`, `scheduleId`, `studentId`
- `examSchedules` - Links exams with subjects, marks, classes
- `exams` - Exam details, academic year, term
- `feeReceipts` - Payment history, amounts, status
- `feeItems` - Detailed fee breakdown
- `paymentTransactions` - SSLCommerz payment gateway integration
- `documentTemplates` - Templates for certificates, mark sheets

**Frontend Components:**
- `client/src/pages/public/` - Public pages directory (home, contact, admissions, etc.)
- `client/src/pages/student/results.tsx` - Student results page (authenticated)
- `client/src/pages/student/fees.tsx` - Fee management page (authenticated)
- `client/src/pages/documents/marksheets-enhanced.tsx` - Document generation

**Existing Integrations:**
- ✅ Supabase (Database + Auth)
- ✅ SSLCommerz Payment Gateway
- ✅ Document generation (PDF)
- ✅ Row Level Security already implemented

---

## Proposed Solution Architecture

### 🎯 Access Model: Student ID + Verification Factor

**Authentication Method:**
```
Student enters:
1. Student ID (e.g., "STU2024001")
2. Verification factor: Date of Birth (DD/MM/YYYY)
Optional: Mobile OTP for additional security
```

**Security Principles:**
- No permanent login required
- Session-based access (15-minute timeout)
- Rate limiting (3 failed attempts = temporary lockout)
- HTTPS only, encrypted sessions
- No data exposure in URLs (POST requests only)

---

## Implementation Plan

### Phase 1: Database Schema & RLS Policies

#### 1.1 Create Public Access Token System

**New Table: `publicAccessTokens`**
```typescript
export const publicAccessTokens = pgTable("public_access_tokens", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  token: text("token").unique().notNull(), // UUID
  purpose: text("purpose").notNull(), // 'results', 'document', 'payment'
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  schoolId: integer("school_id").notNull(),
});
```

**Purpose:**
- Temporary tokens (15-30 min validity) for secure public access
- Tracks usage for security auditing
- Single-use or limited-use tokens
- Prevents brute force attacks

#### 1.2 Supabase RLS Policies for Public Access

**Policy for Results (Read-Only):**
```sql
-- Allow public read access to results with valid token
CREATE POLICY "Public can view results with valid token"
ON exam_results
FOR SELECT
TO anon, authenticated
USING (
  student_id IN (
    SELECT student_id 
    FROM public_access_tokens 
    WHERE token = current_setting('app.access_token', true)
    AND expires_at > now()
    AND used_at IS NULL
  )
);
```

**Policy for Fee Receipts:**
```sql
CREATE POLICY "Public can view fees with valid token"
ON fee_receipts
FOR SELECT
TO anon, authenticated
USING (
  student_id IN (
    SELECT student_id 
    FROM public_access_tokens 
    WHERE token = current_setting('app.access_token', true)
    AND expires_at > now()
  )
);
```

**Benefits:**
- ✅ Database-level security (even if frontend has bugs, data is safe)
- ✅ No Express.js middleware needed (pure Supabase)
- ✅ Automatic token expiration
- ✅ Audit trail built-in

---

### Phase 2: Backend API (Direct Supabase Calls)

#### 2.1 Public Verification Endpoint

**Function: Verify Student Identity**
```typescript
// File: client/src/lib/public-access.ts

export async function verifyStudentAccess(
  studentId: string,
  dateOfBirth: string,
  schoolId: number
): Promise<{ success: boolean; token?: string; studentName?: string }> {
  
  // Step 1: Query Supabase to verify student exists with matching DOB
  const { data: student, error } = await supabase
    .from('students')
    .select('id, name, date_of_birth, school_id')
    .eq('student_id', studentId)
    .eq('school_id', schoolId)
    .single();

  if (error || !student) {
    return { success: false };
  }

  // Step 2: Verify date of birth matches
  const studentDOB = new Date(student.date_of_birth).toLocaleDateString('en-GB');
  if (studentDOB !== dateOfBirth) {
    return { success: false };
  }

  // Step 3: Generate temporary access token (30 min expiry)
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  await supabase
    .from('public_access_tokens')
    .insert({
      student_id: student.id,
      token,
      purpose: 'public_portal',
      expires_at: expiresAt.toISOString(),
      school_id: schoolId
    });

  return {
    success: true,
    token,
    studentName: student.name
  };
}
```

#### 2.2 Fetch Results with Token

```typescript
export async function getPublicResults(token: string) {
  // Set token in Supabase session for RLS policies
  await supabase.rpc('set_access_token', { token });

  // Fetch results (RLS policies will filter automatically)
  const { data: results, error } = await supabase
    .from('exam_results')
    .select(`
      *,
      exam:exams(*),
      schedule:exam_schedules(
        subject:subjects(name, code),
        full_marks,
        pass_marks
      )
    `)
    .order('created_at', { ascending: false });

  return results;
}
```

#### 2.3 Fetch Fee Information

```typescript
export async function getPublicFees(token: string) {
  const { data: receipts, error } = await supabase
    .from('fee_receipts')
    .select(`
      *,
      items:fee_items(*)
    `)
    .order('payment_date', { ascending: false });

  return receipts;
}
```

---

### Phase 3: Frontend Components

#### 3.1 Public Portal Landing Page

**File: `client/src/pages/public/student-portal.tsx`**

**Features:**
- Clean, simple verification form
- Student ID + DOB input
- CAPTCHA (optional, for extra security)
- Clear error messages (generic for security)
- Mobile-responsive design
- Bengali + English language support

**UI Flow:**
```
1. Student enters credentials
   ↓
2. System verifies (Supabase query)
   ↓
3. Generate temporary token
   ↓
4. Redirect to results dashboard
   ↓
5. Session expires after 30 minutes
```

#### 3.2 Public Results Dashboard

**File: `client/src/pages/public/student-results-public.tsx`**

**Features:**
- Display all exam results (subject-wise)
- Calculate GPA, percentage, position
- Grade cards with color coding (A+, A, B, etc.)
- Download mark sheet as PDF
- Print-friendly layout
- No permanent data storage (session-based)

**Components:**
```tsx
- <ResultsOverview /> - Summary stats
- <ExamResultsTable /> - Detailed marks
- <DownloadButton /> - Generate PDF
- <SessionTimer /> - Shows remaining time
```

#### 3.3 Public Fee Payment Page

**File: `client/src/pages/public/student-fees-public.tsx`**

**Features:**
- View all fee receipts
- See pending dues
- Pay fees online (SSLCommerz integration)
- Download fee receipts
- Payment history

**Payment Flow:**
```
1. Student selects fee to pay
   ↓
2. Click "Pay Now"
   ↓
3. Redirect to SSLCommerz gateway
   ↓
4. Process payment (bKash, Nagad, Rocket, Card)
   ↓
5. Return to portal with success/failure
   ↓
6. Update fee_receipts table
```

#### 3.4 Document Download Component

**File: `client/src/components/public/document-downloader.tsx`**

**Features:**
- Download mark sheets
- Download certificates
- Download fee receipts
- Watermarked PDFs (prevent fraud)
- Timestamp on documents

---

### Phase 4: Admin Dashboard Integration

#### 4.1 Results Publishing Control

**File: `client/src/pages/admin/publish-results.tsx`**

**Features:**
- Select exam to publish
- Toggle "Public Access" switch
- Set publication date/time
- Unpublish option
- Audit log (who published, when)

**Backend:**
```typescript
// Add to exams table
export const exams = pgTable("exams", {
  // ... existing fields
  isPubliclyAvailable: boolean("is_publicly_available").default(false),
  publicationDate: timestamp("publication_date"),
  publishedBy: integer("published_by"), // user ID
});
```

**RLS Update:**
```sql
-- Only show results for published exams in public portal
CREATE POLICY "Public results only for published exams"
ON exam_results
FOR SELECT
TO anon
USING (
  exam_id IN (
    SELECT id FROM exams WHERE is_publicly_available = true
  )
);
```

#### 4.2 Fee Configuration

**Admin controls:**
- Enable/disable online payments
- Set payment methods (bKash, Nagad, etc.)
- Configure fee structure
- View payment analytics

---

## Security Implementation

### 🔒 Multi-Layer Security

**Layer 1: Frontend Validation**
- Input sanitization
- CAPTCHA (reCAPTCHA v3)
- Client-side rate limiting

**Layer 2: Token-Based Access**
- Temporary tokens (30-min expiry)
- Single-use or limited-use
- Cryptographically secure (UUID v4)

**Layer 3: Supabase RLS Policies**
- Database-level security
- Auto-filtering by student ID
- Prevents data leaks even if frontend is compromised

**Layer 4: Audit Logging**
- All access attempts logged
- Failed attempts tracked
- IP address recording
- Suspicious activity alerts

### 🛡️ Privacy Protection

**FERPA/GDPR Compliance:**
- Minimal data exposure (only student's own data)
- No student identifiers in URLs
- Encrypted sessions (HTTPS only)
- Clear privacy notice
- Data retention policies

**Rate Limiting:**
```typescript
// Max 3 attempts per IP per 15 minutes
const MAX_ATTEMPTS = 3;
const WINDOW = 15 * 60 * 1000; // 15 minutes
```

---

## Integration with Existing Dashboard

### Navigation Flow

**From Main Dashboard:**
```
Admin Dashboard
  ├── Exams Management
  │   ├── Create Exam
  │   ├── Enter Results
  │   └── ✨ Publish to Public Portal
  │
  ├── Fee Management
  │   ├── Generate Receipts
  │   └── ✨ Enable Online Payment
  │
  └── Analytics
      └── ✨ Public Portal Usage Stats
```

**Public Portal URL:**
```
https://yourschool.com/public/student-portal
```

**Integration Points:**
1. Admin publishes results → Available in public portal
2. Admin creates fee receipt → Student sees in public portal
3. Student pays online → Updates reflected in admin dashboard
4. Document templates → Auto-generate for public downloads

---

## Technical Stack

### Frontend
- ✅ React (already in use)
- ✅ Wouter for routing
- ✅ TanStack Query for data fetching
- ✅ Shadcn UI components
- ✅ Tailwind CSS

### Backend
- ✅ Supabase (PostgreSQL + RLS)
- ✅ Direct Supabase API calls (no Express.js needed)
- ✅ Edge Functions for complex operations (optional)

### Payments
- ✅ SSLCommerz (already integrated)
- ✅ bKash, Nagad, Rocket, Card payments

### Documents
- ✅ jsPDF for PDF generation
- ✅ html2canvas for screenshots
- ✅ Watermarking for authenticity

---

## Implementation Timeline

### Week 1: Database & Security
- [ ] Create `publicAccessTokens` table
- [ ] Implement RLS policies
- [ ] Set up token generation system
- [ ] Add audit logging

### Week 2: Backend API
- [ ] Student verification function
- [ ] Results fetching API
- [ ] Fee fetching API
- [ ] Payment integration

### Week 3: Frontend Components
- [ ] Public portal landing page
- [ ] Results dashboard
- [ ] Fee payment page
- [ ] Document download

### Week 4: Admin Integration & Testing
- [ ] Publish results control panel
- [ ] Fee configuration
- [ ] Security testing
- [ ] User acceptance testing

---

## Sample User Journey

### Student Accessing Results

```
1. Student visits: yourschool.com/public/student-portal

2. Enters credentials:
   - Student ID: STU2024001
   - Date of Birth: 15/08/2010
   - School: [Auto-selected or dropdown]

3. System validates (< 1 second):
   ✓ Student exists
   ✓ DOB matches
   ✓ Generates 30-min token

4. Redirected to dashboard:
   - View all exam results
   - Download mark sheets (PDF)
   - View fee status
   - Pay pending fees

5. Downloads mark sheet:
   - Watermarked PDF
   - Includes: Name, ID, Marks, Grade, School seal
   - Timestamp: "Downloaded on 18 Oct 2025 at 5:30 PM"

6. Pays fee online:
   - Selects pending fee
   - Clicks "Pay Now"
   - Redirected to SSLCommerz
   - Pays via bKash
   - Returns to portal
   - Fee receipt auto-generated

7. Session expires after 30 minutes (auto-logout)
```

---

## Benefits

### For Students
✅ No login required (quick access)
✅ Access from anywhere (home, phone, cyber cafe)
✅ Download official documents instantly
✅ Pay fees online (24/7 availability)
✅ Multiple payment methods

### For School/Admin
✅ Reduced support burden (students self-serve)
✅ Automated document generation
✅ Real-time payment tracking
✅ Secure, compliant system
✅ Audit trail for accountability

### For Parents
✅ Easy access to child's results
✅ Convenient fee payment
✅ No need to remember passwords
✅ Mobile-friendly interface

---

## Next Steps

1. **Review & Approve** this proposal
2. **Clarify requirements:**
   - Which verification factor? (DOB, Mobile OTP, or both?)
   - Session timeout duration? (15 or 30 minutes?)
   - Which payment methods to enable?
   - Document watermarking requirements?

3. **Implementation:**
   - I'll create the complete implementation
   - All with Supabase serverless (direct API calls)
   - Full integration with existing dashboard

---

## Questions for You

1. **Verification Method:**
   - DOB only (simpler)
   - DOB + Mobile OTP (more secure)
   - Student ID + PIN (need to generate and distribute PINs)

2. **Payment Gateway:**
   - SSLCommerz already integrated - keep it?
   - Which payment methods to enable? (bKash, Nagad, Rocket, Card, Bank)

3. **Results Publishing:**
   - Auto-publish on result entry?
   - Manual admin approval required?
   - Schedule publication for specific date/time?

4. **Access Duration:**
   - How long should results be publicly available? (Always / 90 days / Custom)
   - Session timeout: 15 or 30 minutes?

5. **Documents:**
   - Which documents to make downloadable? (Mark sheets, Certificates, Admit cards?)
   - Watermarking requirements? (School logo, timestamp, student name?)

---

**Ready to implement whenever you approve!** 🚀
