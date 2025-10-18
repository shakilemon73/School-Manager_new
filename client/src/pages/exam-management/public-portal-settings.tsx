import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LanguageText } from "@/components/ui/language-text";
import { useDesignSystem } from "@/hooks/use-design-system";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { Globe, Eye, EyeOff, Calendar, Users, BarChart3, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface ExamWithStats {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isPubliclyAvailable: boolean;
  publicationDate: string | null;
  publishedBy: number | null;
  academicYearId: number;
  schoolId: number;
  _count?: {
    results: number;
    students: number;
  };
}

export default function PublicPortalSettings() {
  useDesignSystem();
  const { user } = useSupabaseDirectAuth();
  const { toast } = useToast();

  // Fetch all exams with their publication status
  const { data: exams, isLoading, refetch } = useQuery<ExamWithStats[]>({
    queryKey: ['/api/exams/with-public-status'],
    queryFn: async () => {
      console.log('📊 Fetching exams with public portal status');
      
      const { data, error } = await supabase
        .from('exams')
        .select(`
          id,
          name,
          description,
          start_date,
          end_date,
          is_active,
          is_publicly_available,
          publication_date,
          published_by,
          academic_year_id,
          school_id,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Error fetching exams:', error);
        throw error;
      }

      console.log('✅ Fetched exams:', data?.length);

      return data?.map((exam: any) => ({
        id: exam.id,
        name: exam.name,
        description: exam.description,
        startDate: exam.start_date,
        endDate: exam.end_date,
        isActive: exam.is_active,
        isPubliclyAvailable: exam.is_publicly_available || false,
        publicationDate: exam.publication_date,
        publishedBy: exam.published_by,
        academicYearId: exam.academic_year_id,
        schoolId: exam.school_id,
      })) || [];
    },
    enabled: !!user,
  });

  // Toggle public availability mutation
  const togglePublicAvailability = useMutation({
    mutationFn: async ({ examId, isPublic }: { examId: number; isPublic: boolean }) => {
      console.log('🔄 Toggling public availability for exam:', examId, 'to:', isPublic);

      const updateData = isPublic
        ? {
            is_publicly_available: true,
            publication_date: new Date().toISOString(),
            published_by: user?.id,
          }
        : {
            is_publicly_available: false,
            publication_date: null,
          };

      const { data, error } = await supabase
        .from('exams')
        .update(updateData)
        .eq('id', examId)
        .select();

      if (error) {
        console.error('❌ Error updating exam:', error);
        throw error;
      }

      console.log('✅ Exam updated successfully');
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Public portal settings updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/exams/with-public-status'] });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update public portal settings.",
        variant: "destructive",
      });
      console.error('❌ Mutation error:', error);
    },
  });

  const handleToggle = (examId: number, currentStatus: boolean) => {
    togglePublicAvailability.mutate({
      examId,
      isPublic: !currentStatus,
    });
  };

  return (
    <AppShell>
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              <LanguageText
                en="Public Portal Settings"
                bn="পাবলিক পোর্টাল সেটিংস"
                ar="إعدادات البوابة العامة"
              />
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            <LanguageText
              en="Manage which exam results are publicly accessible to students without login"
              bn="শিক্ষার্থীদের লগইন ছাড়াই কোন পরীক্ষার ফলাফল পাবলিকভাবে অ্যাক্সেসযোগ্য তা পরিচালনা করুন"
              ar="إدارة نتائج الامتحانات المتاحة للطلاب بدون تسجيل دخول"
            />
          </p>
        </div>

        {/* Public Portal Link Card */}
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              <LanguageText
                en="Public Portal URL"
                bn="পাবলিক পোর্টাল URL"
                ar="رابط البوابة العامة"
              />
            </CardTitle>
            <CardDescription>
              <LanguageText
                en="Share this link with students to access their results"
                bn="শিক্ষার্থীদের তাদের ফলাফল অ্যাক্সেস করতে এই লিঙ্কটি শেয়ার করুন"
                ar="شارك هذا الرابط مع الطلاب للوصول إلى نتائجهم"
              />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 rounded border text-sm">
                {window.location.origin}/public/student-portal
              </code>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/public/student-portal`);
                  toast({
                    title: "Copied!",
                    description: "Portal URL copied to clipboard",
                  });
                }}
              >
                <LanguageText en="Copy" bn="কপি করুন" ar="نسخ" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Exams List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              <LanguageText
                en="Manage Exam Results Visibility"
                bn="পরীক্ষার ফলাফলের দৃশ্যমানতা পরিচালনা করুন"
                ar="إدارة رؤية نتائج الامتحانات"
              />
            </h2>
            <Badge variant="outline">
              {exams?.filter(e => e.isPubliclyAvailable).length || 0} <LanguageText en="Published" bn="প্রকাশিত" ar="منشور" />
            </Badge>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                <LanguageText en="Loading exams..." bn="পরীক্ষা লোড হচ্ছে..." ar="تحميل الامتحانات..." />
              </p>
            </div>
          ) : !exams || exams.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  <LanguageText
                    en="No Exams Found"
                    bn="কোনো পরীক্ষা পাওয়া যায়নি"
                    ar="لم يتم العثور على امتحانات"
                  />
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  <LanguageText
                    en="Create exams first to publish results"
                    bn="ফলাফল প্রকাশ করতে প্রথমে পরীক্ষা তৈরি করুন"
                    ar="إنشاء امتحانات أولاً لنشر النتائج"
                  />
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {exams.map((exam) => (
                <Card key={exam.id} className="overflow-hidden" data-testid={`exam-card-${exam.id}`}>
                  <CardHeader className="bg-gray-50 dark:bg-gray-800 border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{exam.name}</CardTitle>
                        {exam.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{exam.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(exam.startDate), 'MMM dd, yyyy')} - {format(new Date(exam.endDate), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                      <Badge variant={exam.isPubliclyAvailable ? "default" : "outline"} className="ml-4">
                        {exam.isPubliclyAvailable ? (
                          <><Eye className="h-3 w-3 mr-1" /> <LanguageText en="Public" bn="পাবলিক" ar="عام" /></>
                        ) : (
                          <><EyeOff className="h-3 w-3 mr-1" /> <LanguageText en="Private" bn="প্রাইভেট" ar="خاص" /></>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                        {exam.isPubliclyAvailable && exam.publicationDate && (
                          <div>
                            <span className="font-medium">
                              <LanguageText en="Published:" bn="প্রকাশিত:" ar="نُشر:" />
                            </span>{' '}
                            {format(new Date(exam.publicationDate), 'MMM dd, yyyy HH:mm')}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`exam-${exam.id}`} className="text-sm font-medium">
                          <LanguageText
                            en="Make Publicly Available"
                            bn="পাবলিকভাবে উপলব্ধ করুন"
                            ar="جعله متاحًا للعامة"
                          />
                        </Label>
                        <Switch
                          id={`exam-${exam.id}`}
                          checked={exam.isPubliclyAvailable}
                          onCheckedChange={() => handleToggle(exam.id, exam.isPubliclyAvailable)}
                          data-testid={`switch-exam-${exam.id}`}
                          disabled={togglePublicAvailability.isPending}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Help Section */}
        <Card className="mt-8 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-lg">
              <LanguageText
                en="How it Works"
                bn="এটি কীভাবে কাজ করে"
                ar="كيف يعمل"
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex gap-2">
              <span className="font-bold">1.</span>
              <span>
                <LanguageText
                  en="Toggle the switch to make exam results publicly accessible"
                  bn="পরীক্ষার ফলাফল পাবলিকভাবে অ্যাক্সেসযোগ্য করতে সুইচ টগল করুন"
                  ar="قم بتبديل المفتাح لجعل نتائج الامتحان متاحة للعامة"
                />
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold">2.</span>
              <span>
                <LanguageText
                  en="Students can access their results using Student ID + Date of Birth"
                  bn="শিক্ষার্থীরা শিক্ষার্থী আইডি + জন্ম তারিখ ব্যবহার করে তাদের ফলাফল অ্যাক্সেস করতে পারে"
                  ar="يمكن للطلاب الوصول إلى نتائجهم باستخدام معرف الطالب + تاريخ الميلاد"
                />
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold">3.</span>
              <span>
                <LanguageText
                  en="Sessions expire after 30 minutes for security"
                  bn="নিরাপত্তার জন্য সেশন ৩০ মিনিট পরে মেয়াদ শেষ হয়"
                  ar="تنتهي صلاحية الجلسات بعد 30 دقيقة للأمان"
                />
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
