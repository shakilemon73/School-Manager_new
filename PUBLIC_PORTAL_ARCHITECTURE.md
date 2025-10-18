# Public Student Portal - Technical Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PUBLIC INTERNET                              │
│                                                                       │
│  ┌──────────────┐         ┌──────────────┐      ┌──────────────┐   │
│  │   Student    │         │   Parent     │      │  Mobile App  │   │
│  │   Browser    │         │   Browser    │      │              │   │
│  └──────┬───────┘         └──────┬───────┘      └──────┬───────┘   │
│         │                        │                      │            │
└─────────┼────────────────────────┼──────────────────────┼────────────┘
          │                        │                      │
          └────────────────────────┴──────────────────────┘
                                   │
                              HTTPS/TLS 1.3
                                   │
          ┌────────────────────────┴──────────────────────┐
          │                                                │
┌─────────▼────────────────────────────────────────────────▼─────────┐
│              FRONTEND (React + Vite + Tailwind)                     │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Public Routes (No Auth Required)                              │ │
│  │                                                                │ │
│  │  /public/student-portal         → Landing page                │ │
│  │  /public/student-results/:token → Results dashboard           │ │
│  │  /public/student-fees/:token    → Fee payment page            │ │
│  │  /public/documents/:token       → Document download           │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Components                                                     │ │
│  │                                                                │ │
│  │  • StudentVerificationForm (Student ID + DOB input)           │ │
│  │  • ResultsTable (Display marks, grades, GPA)                  │ │
│  │  • FeePaymentCard (Payment interface)                         │ │
│  │  • DocumentDownloader (PDF generation)                        │ │
│  │  • SessionTimer (30-minute countdown)                         │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ State Management (TanStack Query)                             │ │
│  │                                                                │ │
│  │  • usePublicVerification()  - Verify student identity         │ │
│  │  • usePublicResults()       - Fetch results with token        │ │
│  │  • usePublicFees()          - Fetch fees with token           │ │
│  │  • usePublicDocuments()     - Download documents              │ │
│  └───────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                    Direct Supabase API Calls
                    (Serverless - No Express.js)
                               │
          ┌────────────────────┴──────────────────────┐
          │                                            │
┌─────────▼─────────────────────────────────────────────▼──────────┐
│                     SUPABASE PLATFORM                             │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Authentication Layer (Token-based)                        │   │
│  │                                                            │   │
│  │  1. Student enters: Student ID + DOB                      │   │
│  │  2. Frontend queries Supabase: verify credentials         │   │
│  │  3. If valid: Generate UUID token (30-min expiry)         │   │
│  │  4. Store in public_access_tokens table                   │   │
│  │  5. Return token to frontend                              │   │
│  │  6. Frontend stores in sessionStorage                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ PostgreSQL Database with Row Level Security (RLS)        │   │
│  │                                                            │   │
│  │  Tables:                                                   │   │
│  │  ┌─────────────────────────────────────┐                 │   │
│  │  │ students                             │                 │   │
│  │  │  - id, student_id, name, dob        │                 │   │
│  │  │  - school_id, class, section        │                 │   │
│  │  └─────────────────────────────────────┘                 │   │
│  │                                                            │   │
│  │  ┌─────────────────────────────────────┐                 │   │
│  │  │ exam_results                         │                 │   │
│  │  │  - student_id, marks_obtained       │                 │   │
│  │  │  - grade, exam_id, schedule_id      │                 │   │
│  │  └─────────────────────────────────────┘                 │   │
│  │                                                            │   │
│  │  ┌─────────────────────────────────────┐                 │   │
│  │  │ fee_receipts                         │                 │   │
│  │  │  - student_id, amount, status       │                 │   │
│  │  │  - payment_method, payment_date     │                 │   │
│  │  └─────────────────────────────────────┘                 │   │
│  │                                                            │   │
│  │  ┌─────────────────────────────────────┐                 │   │
│  │  │ public_access_tokens (NEW)          │                 │   │
│  │  │  - token, student_id, expires_at    │                 │   │
│  │  │  - purpose, used_at, ip_address     │                 │   │
│  │  └─────────────────────────────────────┘                 │   │
│  │                                                            │   │
│  │  ┌─────────────────────────────────────┐                 │   │
│  │  │ exams                                │                 │   │
│  │  │  - is_publicly_available (NEW)      │                 │   │
│  │  │  - publication_date (NEW)           │                 │   │
│  │  └─────────────────────────────────────┘                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Row Level Security Policies                              │   │
│  │                                                            │   │
│  │  Policy 1: "Public results with valid token"             │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │ ON exam_results FOR SELECT TO anon                  │ │   │
│  │  │ USING (                                              │ │   │
│  │  │   student_id IN (                                    │ │   │
│  │  │     SELECT student_id FROM public_access_tokens     │ │   │
│  │  │     WHERE token = current_token                      │ │   │
│  │  │     AND expires_at > now()                          │ │   │
│  │  │     AND used_at IS NULL                             │ │   │
│  │  │   )                                                  │ │   │
│  │  │   AND exam_id IN (                                   │ │   │
│  │  │     SELECT id FROM exams                            │ │   │
│  │  │     WHERE is_publicly_available = true              │ │   │
│  │  │   )                                                  │ │   │
│  │  │ )                                                    │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                            │   │
│  │  Policy 2: "Public fees with valid token"                │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │ ON fee_receipts FOR SELECT TO anon                  │ │   │
│  │  │ USING (student_id IN (...same as above))            │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Security Features                                         │   │
│  │                                                            │   │
│  │  ✓ Token-based temporary access (30 min expiry)          │   │
│  │  ✓ RLS policies prevent data leaks                       │   │
│  │  ✓ Audit logging (IP, timestamp, attempts)               │   │
│  │  ✓ Rate limiting (3 attempts per 15 min)                 │   │
│  │  ✓ Auto-logout on session expiry                         │   │
│  │  ✓ HTTPS-only (TLS 1.3)                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
                               │
                               │
          ┌────────────────────┴──────────────────────┐
          │                                            │
┌─────────▼─────────────────────────┐    ┌────────────▼──────────────┐
│  PAYMENT GATEWAY (SSLCommerz)     │    │  DOCUMENT GENERATOR       │
│                                    │    │                           │
│  • bKash, Nagad, Rocket           │    │  • jsPDF                  │
│  • Credit/Debit Cards             │    │  • html2canvas            │
│  • Bank Transfers                 │    │  • Watermarking           │
│                                    │    │  • Digital signatures     │
│  Flow:                             │    │                           │
│  1. Student clicks "Pay Now"      │    │  Flow:                    │
│  2. Redirect to SSLCommerz        │    │  1. Student clicks        │
│  3. Select payment method         │    │     "Download"            │
│  4. Complete payment              │    │  2. Generate PDF          │
│  5. Return to portal              │    │  3. Add watermark         │
│  6. Update fee_receipts           │    │  4. Download to browser   │
└────────────────────────────────────┘    └───────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD INTEGRATION                       │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Results Management                                            │  │
│  │                                                                │  │
│  │  1. Admin enters exam results                                 │  │
│  │  2. Toggles "Publish to Public Portal" switch                 │  │
│  │  3. Sets publication date/time (optional)                     │  │
│  │  4. System updates: exams.is_publicly_available = true        │  │
│  │  5. Results instantly available in public portal              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Fee Management                                                │  │
│  │                                                                │  │
│  │  1. Admin generates fee receipts for students                 │  │
│  │  2. System creates entries in fee_receipts table              │  │
│  │  3. Students see pending fees in public portal                │  │
│  │  4. Students pay online via SSLCommerz                        │  │
│  │  5. Payment status updates in admin dashboard (real-time)     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Analytics & Monitoring                                        │  │
│  │                                                                │  │
│  │  • Total public portal visits                                 │  │
│  │  • Failed login attempts (security alerts)                    │  │
│  │  • Documents downloaded (count)                               │  │
│  │  • Payment success rate                                       │  │
│  │  • Peak usage times                                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Sequence

### 1. Student Verification Flow

```
┌─────────┐                    ┌──────────┐                    ┌──────────┐
│ Student │                    │ Frontend │                    │ Supabase │
└────┬────┘                    └────┬─────┘                    └────┬─────┘
     │                              │                               │
     │ 1. Enter Student ID + DOB    │                               │
     │─────────────────────────────>│                               │
     │                              │                               │
     │                              │ 2. Query students table       │
     │                              │      (student_id = 'XXX'      │
     │                              │       AND dob = 'YYYY-MM-DD') │
     │                              │──────────────────────────────>│
     │                              │                               │
     │                              │ 3. Verify match               │
     │                              │<──────────────────────────────│
     │                              │                               │
     │                              │ 4. Generate UUID token        │
     │                              │    + 30 min expiry            │
     │                              │──────────────────────────────>│
     │                              │                               │
     │                              │ 5. Insert public_access_token │
     │                              │<──────────────────────────────│
     │                              │                               │
     │ 6. Return token + student    │                               │
     │    name                      │                               │
     │<─────────────────────────────│                               │
     │                              │                               │
     │ 7. Store token in            │                               │
     │    sessionStorage            │                               │
     │─────────────────────────────>│                               │
     │                              │                               │
     │ 8. Redirect to results page  │                               │
     │<─────────────────────────────│                               │
     │                              │                               │
```

### 2. Fetch Results Flow

```
┌─────────┐                    ┌──────────┐                    ┌──────────┐
│ Student │                    │ Frontend │                    │ Supabase │
└────┬────┘                    └────┬─────┘                    └────┬─────┘
     │                              │                               │
     │ 1. View Results page         │                               │
     │─────────────────────────────>│                               │
     │                              │                               │
     │                              │ 2. Set RPC context            │
     │                              │    set_access_token(token)    │
     │                              │──────────────────────────────>│
     │                              │                               │
     │                              │ 3. SELECT * FROM exam_results │
     │                              │    (RLS auto-filters by       │
     │                              │     valid token & student_id) │
     │                              │──────────────────────────────>│
     │                              │                               │
     │                              │ 4. Return results             │
     │                              │    (only matching student's)  │
     │                              │<──────────────────────────────│
     │                              │                               │
     │ 5. Display results with      │                               │
     │    grades, GPA, percentage   │                               │
     │<─────────────────────────────│                               │
     │                              │                               │
     │ 6. Click "Download PDF"      │                               │
     │─────────────────────────────>│                               │
     │                              │                               │
     │                              │ 7. Generate PDF with jsPDF    │
     │                              │    + watermark                │
     │                              │                               │
     │ 8. Download mark sheet       │                               │
     │<─────────────────────────────│                               │
     │                              │                               │
```

### 3. Fee Payment Flow

```
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐
│ Student │  │ Frontend │  │ Supabase │  │ SSLCommerz │  │  Admin   │
└────┬────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  └────┬─────┘
     │            │              │               │              │
     │ 1. View    │              │               │              │
     │   Fees     │              │               │              │
     │───────────>│              │               │              │
     │            │              │               │              │
     │            │ 2. Fetch     │               │              │
     │            │   fee_receipts               │              │
     │            │─────────────>│               │              │
     │            │              │               │              │
     │            │ 3. Return    │               │              │
     │            │   pending    │               │              │
     │            │   fees       │               │              │
     │            │<─────────────│               │              │
     │            │              │               │              │
     │ 4. Click   │              │               │              │
     │   "Pay Now"│              │               │              │
     │───────────>│              │               │              │
     │            │              │               │              │
     │            │ 5. Initiate  │               │              │
     │            │   payment    │               │              │
     │            │──────────────────────────────>│              │
     │            │              │               │              │
     │ 6. Redirect to SSLCommerz │               │              │
     │<──────────────────────────────────────────│              │
     │            │              │               │              │
     │ 7. Select  │              │               │              │
     │   payment  │              │               │              │
     │   method   │              │               │              │
     │   (bKash)  │              │               │              │
     │───────────────────────────────────────────>│              │
     │            │              │               │              │
     │ 8. Complete│              │               │              │
     │   payment  │              │               │              │
     │───────────────────────────────────────────>│              │
     │            │              │               │              │
     │ 9. Payment │              │               │              │
     │   success  │              │               │              │
     │<──────────────────────────────────────────│              │
     │            │              │               │              │
     │            │ 10. Update   │               │              │
     │            │   fee_receipt│               │              │
     │            │   status     │               │              │
     │            │─────────────>│               │              │
     │            │              │               │              │
     │            │              │ 11. Notify    │              │
     │            │              │    admin      │              │
     │            │              │──────────────────────────────>│
     │            │              │               │              │
     │ 12. Show   │              │               │              │
     │   receipt  │              │               │              │
     │<───────────│              │               │              │
     │            │              │               │              │
```

---

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Network Security                                       │
│  • HTTPS/TLS 1.3 encryption                                     │
│  • Firewall rules                                               │
│  • DDoS protection (Cloudflare/AWS Shield)                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Frontend Validation                                    │
│  • Input sanitization (XSS prevention)                          │
│  • CAPTCHA (prevent bots)                                       │
│  • Client-side rate limiting                                    │
│  • CSRF token validation                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Token Authentication                                   │
│  • UUID v4 tokens (cryptographically secure)                    │
│  • 30-minute expiry (configurable)                              │
│  • Single-use or limited-use                                    │
│  • IP address binding (optional)                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Row Level Security (RLS)                               │
│  • Database-level access control                                │
│  • Auto-filtering by student_id                                 │
│  • Prevents SQL injection                                       │
│  • Works even if frontend is compromised                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 5: Audit & Monitoring                                     │
│  • All access attempts logged                                   │
│  • Failed attempts tracked                                      │
│  • Suspicious activity alerts                                   │
│  • Real-time security dashboard                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Performance Optimization

### Supabase Serverless Advantages

✅ **No Cold Starts** - Always ready
✅ **Auto-Scaling** - Handles traffic spikes (e.g., result day)
✅ **Edge Caching** - Faster response times globally
✅ **Connection Pooling** - Efficient database connections
✅ **CDN Integration** - Static assets served from edge

### Query Optimization

```sql
-- Indexed columns for fast lookups
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_exam_results_student_id ON exam_results(student_id);
CREATE INDEX idx_fee_receipts_student_id ON fee_receipts(student_id);
CREATE INDEX idx_public_tokens_token ON public_access_tokens(token);
CREATE INDEX idx_public_tokens_expires ON public_access_tokens(expires_at);
```

---

## Deployment Checklist

- [ ] Create `public_access_tokens` table
- [ ] Add RLS policies for public access
- [ ] Implement token generation system
- [ ] Build frontend components
- [ ] Integrate SSLCommerz payment gateway
- [ ] Set up document generation (PDF)
- [ ] Configure admin controls (publish results)
- [ ] Add audit logging
- [ ] Implement rate limiting
- [ ] Security testing (penetration testing)
- [ ] Load testing (handle 1000+ concurrent users)
- [ ] User acceptance testing
- [ ] Documentation (user guide, admin guide)
- [ ] Launch! 🚀

---

**This architecture ensures:**
- ✅ Secure, serverless implementation
- ✅ Fast performance (Supabase edge network)
- ✅ Scalable (handles traffic spikes)
- ✅ Cost-effective (pay per use, no idle servers)
- ✅ Easy to maintain (no complex backend logic)
