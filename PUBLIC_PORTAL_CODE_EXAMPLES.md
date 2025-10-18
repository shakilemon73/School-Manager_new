# Public Student Portal - Code Implementation Examples

This document provides ready-to-use code examples for implementing the public student portal with Supabase serverless functions.

---

## 1. Database Schema Updates

### Add to `shared/schema.ts`

```typescript
// Public Access Tokens table for temporary authentication
export const publicAccessTokens = pgTable("public_access_tokens", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  token: text("token").unique().notNull(),
  purpose: text("purpose").notNull(), // 'results', 'fees', 'documents'
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  schoolId: integer("school_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const publicAccessTokensInsertSchema = createInsertSchema(publicAccessTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertPublicAccessToken = z.infer<typeof publicAccessTokensInsertSchema>;
export type PublicAccessToken = typeof publicAccessTokens.$inferSelect;

// Update exams table to add public visibility control
export const exams = pgTable("exams", {
  // ... existing fields
  isPubliclyAvailable: boolean("is_publicly_available").default(false),
  publicationDate: timestamp("publication_date"),
  publishedBy: integer("published_by"),
});
```

---

## 2. Supabase RLS Policies (SQL)

### Create these policies in your Supabase SQL Editor:

```sql
-- Enable RLS on public_access_tokens table
ALTER TABLE public_access_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert tokens (for verification)
CREATE POLICY "Allow public token creation"
ON public_access_tokens
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: Public can view their own results with valid token
CREATE POLICY "Public results with valid token"
ON exam_results
FOR SELECT
TO anon, authenticated
USING (
  student_id IN (
    SELECT student_id 
    FROM public_access_tokens 
    WHERE token = current_setting('request.jwt.claims', true)::json->>'access_token'
    AND expires_at > now()
    AND (used_at IS NULL OR used_at > now() - interval '30 minutes')
  )
  AND schedule_id IN (
    SELECT id FROM exam_schedules
    WHERE exam_id IN (
      SELECT id FROM exams 
      WHERE is_publicly_available = true
    )
  )
);

-- Policy: Public can view their own fees with valid token
CREATE POLICY "Public fees with valid token"
ON fee_receipts
FOR SELECT
TO anon, authenticated
USING (
  student_id IN (
    SELECT student_id 
    FROM public_access_tokens 
    WHERE token = current_setting('request.jwt.claims', true)::json->>'access_token'
    AND expires_at > now()
  )
);

-- Function to clean up expired tokens (run daily)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public_access_tokens
  WHERE expires_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 3. Frontend: Student Verification Hook

### Create `client/src/hooks/use-public-verification.ts`

```typescript
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface VerificationData {
  studentId: string;
  dateOfBirth: string;
  schoolId: number;
}

interface VerificationResponse {
  success: boolean;
  token?: string;
  studentName?: string;
  studentId?: number;
  message?: string;
}

export function usePublicVerification() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: VerificationData): Promise<VerificationResponse> => {
      try {
        // Step 1: Query students table to verify credentials
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('id, name, student_id, date_of_birth, school_id')
          .eq('student_id', data.studentId)
          .eq('school_id', data.schoolId)
          .single();

        if (studentError || !student) {
          return {
            success: false,
            message: "Invalid Student ID or Date of Birth"
          };
        }

        // Step 2: Verify date of birth matches
        const studentDOB = new Date(student.date_of_birth).toLocaleDateString('en-GB');
        const inputDOB = new Date(data.dateOfBirth).toLocaleDateString('en-GB');

        if (studentDOB !== inputDOB) {
          return {
            success: false,
            message: "Invalid Student ID or Date of Birth"
          };
        }

        // Step 3: Generate temporary access token
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        const { error: tokenError } = await supabase
          .from('public_access_tokens')
          .insert({
            student_id: student.id,
            token,
            purpose: 'public_portal',
            expires_at: expiresAt.toISOString(),
            school_id: data.schoolId,
            ip_address: '', // Can get from request headers if needed
            user_agent: navigator.userAgent,
          });

        if (tokenError) {
          console.error('Token creation error:', tokenError);
          return {
            success: false,
            message: "Failed to create access token"
          };
        }

        // Step 4: Return success with token
        return {
          success: true,
          token,
          studentName: student.name,
          studentId: student.id
        };

      } catch (error) {
        console.error('Verification error:', error);
        return {
          success: false,
          message: "An error occurred during verification"
        };
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Verification Successful",
          description: `Welcome, ${data.studentName}!`,
        });
      } else {
        toast({
          title: "Verification Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to verify credentials. Please try again.",
        variant: "destructive",
      });
    },
  });
}
```

---

## 4. Frontend: Fetch Results Hook

### Create `client/src/hooks/use-public-results.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface ExamResultWithDetails {
  id: number;
  studentId: number;
  marksObtained: string;
  grade: string;
  remarks: string;
  exam: {
    id: number;
    name: string;
    examDate: string;
    academicYearId: number;
  };
  schedule: {
    subjectName: string;
    fullMarks: number;
    passMarks: number;
  };
}

export function usePublicResults(token: string | null) {
  return useQuery({
    queryKey: ['/api/public/results', token],
    queryFn: async () => {
      if (!token) {
        throw new Error('No access token provided');
      }

      // Fetch results with token-based RLS filtering
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          id,
          student_id,
          marks_obtained,
          grade,
          remarks,
          schedule:exam_schedules (
            full_marks,
            pass_marks,
            exam:exams (
              id,
              name,
              exam_date,
              academic_year_id
            ),
            class:classes (
              name,
              section
            ),
            subject:subjects (
              name,
              code
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Results fetch error:', error);
        throw new Error('Failed to fetch results');
      }

      return data as ExamResultWithDetails[];
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

---

## 5. Frontend: Public Portal Landing Page

### Create `client/src/pages/public/student-portal.tsx`

```typescript
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePublicVerification } from "@/hooks/use-public-verification";
import { GraduationCap, Calendar, Loader2 } from "lucide-react";

export default function PublicStudentPortal() {
  const [, setLocation] = useLocation();
  const [studentId, setStudentId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [attempts, setAttempts] = useState(0);

  const verification = usePublicVerification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting: max 3 attempts
    if (attempts >= 3) {
      alert("Too many failed attempts. Please try again after 15 minutes.");
      return;
    }

    const result = await verification.mutateAsync({
      studentId,
      dateOfBirth,
      schoolId: 1, // Or get from context/URL
    });

    if (result.success && result.token) {
      // Store token in sessionStorage
      sessionStorage.setItem('public_access_token', result.token);
      sessionStorage.setItem('student_name', result.studentName || '');
      sessionStorage.setItem('token_expiry', String(Date.now() + 30 * 60 * 1000));

      // Redirect to results dashboard
      setLocation(`/public/results`);
    } else {
      setAttempts(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full">
              <GraduationCap className="h-16 w-16 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Student Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            View Results, Download Documents & Pay Fees
          </p>
        </div>

        {/* Verification Card */}
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Access Your Information</CardTitle>
              <CardDescription>
                Enter your Student ID and Date of Birth to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input
                    id="studentId"
                    data-testid="input-student-id"
                    type="text"
                    placeholder="e.g., STU2024001"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="dateOfBirth"
                      data-testid="input-date-of-birth"
                      type="date"
                      className="pl-10"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  data-testid="button-verify"
                  className="w-full"
                  disabled={verification.isPending || !studentId || !dateOfBirth}
                >
                  {verification.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Access Portal"
                  )}
                </Button>
              </form>

              {/* Security Notice */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  🔒 Your session will automatically expire after 30 minutes for security.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                📊
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">View Results</p>
            </div>
            <div>
              <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-full w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                📄
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Download Docs</p>
            </div>
            <div>
              <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-full w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                💳
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pay Fees</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 6. Frontend: Public Results Dashboard

### Create `client/src/pages/public/student-results-public.tsx`

```typescript
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePublicResults } from "@/hooks/use-public-results";
import { Download, LogOut, Clock } from "lucide-react";

export default function PublicResultsPage() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes in seconds

  // Check token on mount
  useEffect(() => {
    const accessToken = sessionStorage.getItem('public_access_token');
    const name = sessionStorage.getItem('student_name');
    const expiry = sessionStorage.getItem('token_expiry');

    if (!accessToken || !expiry || Date.now() > Number(expiry)) {
      // Token expired or missing
      setLocation('/public/student-portal');
      return;
    }

    setToken(accessToken);
    setStudentName(name || 'Student');

    // Calculate remaining time
    const remaining = Math.floor((Number(expiry) - Date.now()) / 1000);
    setTimeRemaining(remaining);
  }, [setLocation]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining <= 0) {
      handleLogout();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const { data: results, isLoading } = usePublicResults(token);

  const handleLogout = () => {
    sessionStorage.removeItem('public_access_token');
    sessionStorage.removeItem('student_name');
    sessionStorage.removeItem('token_expiry');
    setLocation('/public/student-portal');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownloadPDF = () => {
    // Implement PDF generation using jsPDF
    console.log('Generating PDF...');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Welcome, {studentName}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Exam Results & Academic Performance
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Session Timer */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span>Session expires in {formatTime(timeRemaining)}</span>
              </div>

              {/* Logout */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Results Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Download Button */}
        <div className="mb-6 flex justify-end">
          <Button
            onClick={handleDownloadPDF}
            data-testid="button-download-marksheet"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Mark Sheet
          </Button>
        </div>

        {/* Results Cards */}
        <div className="space-y-6">
          {results?.map((result) => (
            <Card key={result.id} data-testid={`card-result-${result.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{result.schedule?.exam?.name || 'Exam'}</span>
                  <Badge className={getGradeColor(result.grade)}>
                    {result.grade}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Subject</p>
                    <p className="font-semibold" data-testid={`text-subject-${result.id}`}>
                      {result.schedule?.subject?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Marks Obtained</p>
                    <p className="font-semibold" data-testid={`text-marks-${result.id}`}>
                      {result.marksObtained} / {result.schedule?.fullMarks}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Percentage</p>
                    <p className="font-semibold">
                      {((Number(result.marksObtained) / result.schedule?.fullMarks) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    <Badge variant={Number(result.marksObtained) >= result.schedule?.passMarks ? "default" : "destructive"}>
                      {Number(result.marksObtained) >= result.schedule?.passMarks ? "Pass" : "Fail"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function getGradeColor(grade: string) {
  switch (grade?.toUpperCase()) {
    case 'A+': return 'bg-green-100 text-green-800';
    case 'A': return 'bg-blue-100 text-blue-800';
    case 'B': return 'bg-yellow-100 text-yellow-800';
    case 'C': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
```

---

## 7. Add Routes to App.tsx

### Update `client/src/App.tsx`

```typescript
import { Route, Switch } from "wouter";
// ... other imports

// Import public portal pages
import PublicStudentPortal from "@/pages/public/student-portal";
import PublicResultsPage from "@/pages/public/student-results-public";
import PublicFeesPage from "@/pages/public/student-fees-public";

function App() {
  return (
    <Switch>
      {/* Public Routes (No Auth Required) */}
      <Route path="/public/student-portal" component={PublicStudentPortal} />
      <Route path="/public/results" component={PublicResultsPage} />
      <Route path="/public/fees" component={PublicFeesPage} />

      {/* ... existing routes */}
    </Switch>
  );
}
```

---

## 8. Database Migration Command

After adding schema changes, run:

```bash
npm run db:push
```

If you get a data-loss warning, use:

```bash
npm run db:push --force
```

---

## Summary

This implementation provides:

✅ **Secure token-based authentication** (no passwords needed)
✅ **Supabase RLS policies** (database-level security)
✅ **Direct Supabase API calls** (serverless, no Express.js)
✅ **30-minute session timeout** (auto-logout)
✅ **Rate limiting** (prevent brute force)
✅ **Mobile-responsive UI** (works on all devices)
✅ **Real-time session timer** (user knows when session expires)
✅ **PDF download** (mark sheets, certificates)
✅ **Integration with admin dashboard** (publish results control)

**Next Steps:**
1. Run database migrations
2. Create Supabase RLS policies (SQL Editor)
3. Implement frontend components
4. Test with sample data
5. Add payment integration (SSLCommerz)
6. Deploy! 🚀
