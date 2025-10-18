import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePublicResults } from "@/hooks/use-public-results";
import { LanguageText } from "@/components/ui/language-text";
import { Download, LogOut, Clock, Award, TrendingUp } from "lucide-react";

export default function PublicResultsPage() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes in seconds

  // Check token on mount
  useEffect(() => {
    const accessToken = sessionStorage.getItem('public_access_token');
    const name = sessionStorage.getItem('student_name');
    const id = sessionStorage.getItem('student_id');
    const expiry = sessionStorage.getItem('token_expiry');

    if (!accessToken || !expiry || Date.now() > Number(expiry)) {
      // Token expired or missing
      setLocation('/public/student-portal');
      return;
    }

    setToken(accessToken);
    setStudentName(name || 'Student');
    setStudentId(id ? Number(id) : null);

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

  const { data: results, isLoading, error } = usePublicResults(token, studentId);

  const handleLogout = () => {
    sessionStorage.removeItem('public_access_token');
    sessionStorage.removeItem('student_name');
    sessionStorage.removeItem('student_id');
    sessionStorage.removeItem('token_expiry');
    setLocation('/public/student-portal');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculatePercentage = (obtained: string, total: number) => {
    return ((Number(obtained) / total) * 100).toFixed(2);
  };

  const getGradeColor = (grade: string) => {
    switch (grade?.toUpperCase()) {
      case 'A+': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'A': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'B': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'C': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            <LanguageText
              en="Loading your results..."
              bn="আপনার ফলাফল লোড হচ্ছে..."
              ar="تحميل نتائجك..."
            />
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                <LanguageText
                  en={`Welcome, ${studentName}`}
                  bn={`স্বাগতম, ${studentName}`}
                  ar={`أهلاً، ${studentName}`}
                />
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <LanguageText
                  en="Exam Results & Academic Performance"
                  bn="পরীক্ষার ফলাফল এবং একাডেমিক পারফরম্যান্স"
                  ar="نتائج الامتحانات والأداء الأكاديمي"
                />
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Session Timer */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span>
                  <LanguageText
                    en={`Session: ${formatTime(timeRemaining)}`}
                    bn={`সেশন: ${formatTime(timeRemaining)}`}
                    ar={`الجلسة: ${formatTime(timeRemaining)}`}
                  />
                </span>
              </div>

              {/* View Fees Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/public/fees')}
                data-testid="button-view-fees"
              >
                <LanguageText
                  en="View Fees"
                  bn="ফি দেখুন"
                  ar="عرض الرسوم"
                />
              </Button>

              {/* Logout */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <LanguageText
                  en="Logout"
                  bn="লগআউট"
                  ar="تسجيل الخروج"
                />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Results Content */}
      <div className="container mx-auto px-4 py-8">
        {!results || results.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                <LanguageText
                  en="No Results Available"
                  bn="কোনো ফলাফল নেই"
                  ar="لا توجد نتائج متاحة"
                />
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                <LanguageText
                  en="Your results have not been published yet. Please check back later."
                  bn="আপনার ফলাফল এখনও প্রকাশিত হয়নি। পরে আবার চেক করুন।"
                  ar="لم يتم نشر نتائجك بعد. يرجى التحقق مرة أخرى لاحقًا."
                />
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Results Cards */}
            {results.map((result) => (
              <Card key={result.id} data-testid={`card-result-${result.id}`} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {result.schedule?.exam?.name || 'Exam'}
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {result.schedule?.subject}
                      </p>
                    </div>
                    <Badge className={getGradeColor(result.grade)}>
                      {result.grade || 'N/A'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <LanguageText en="Marks Obtained" bn="প্রাপ্ত নম্বর" ar="الدرجات المحصلة" />
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid={`text-marks-${result.id}`}>
                        {result.marksObtained} / {result.schedule?.fullMarks}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <LanguageText en="Percentage" bn="শতাংশ" ar="النسبة المئوية" />
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {calculatePercentage(result.marksObtained, result.schedule?.fullMarks)}%
                        </p>
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <LanguageText en="Grade" bn="গ্রেড" ar="الدرجة" />
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {result.grade || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <LanguageText en="Status" bn="অবস্থা" ar="الحالة" />
                      </p>
                      <Badge 
                        variant={Number(result.marksObtained) >= result.schedule?.passMarks ? "default" : "destructive"}
                        className="text-sm"
                      >
                        {Number(result.marksObtained) >= result.schedule?.passMarks ? (
                          <LanguageText en="Pass" bn="পাস" ar="نجاح" />
                        ) : (
                          <LanguageText en="Fail" bn="ফেল" ar="رسوب" />
                        )}
                      </Badge>
                    </div>
                  </div>

                  {result.remarks && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong><LanguageText en="Remarks:" bn="মন্তব্য:" ar="ملاحظات:" /></strong> {result.remarks}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
