import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { userProfile } from '@/hooks/use-supabase-direct-auth';
import { CheckCircle, XCircle, Clock, Eye, User, BookOpen, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function MarksApproval() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  const getCurrentSchoolId = async () => {
    const schoolId = await userProfile.getCurrentUserSchoolId();
    if (!schoolId) throw new Error('School ID not found');
    return schoolId;
  };

  const { data: pendingApprovals, isLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exams(id, name, exam_type, exam_date),
          subjects(id, name, name_bn, code),
          teachers(id, name, email),
          students(id, name, roll_number, class)
        `)
        .eq('school_id', schoolId)
        .eq('verified', false)
        .order('entered_at', { ascending: false });
      
      if (error) throw error;

      const grouped = data?.reduce((acc: any, result: any) => {
        const key = `${result.exam_id}-${result.subject_id}-${result.teacher_id}`;
        if (!acc[key]) {
          acc[key] = {
            exam: result.exams,
            subject: result.subjects,
            teacher: result.teachers,
            class: result.students?.class || 'Unknown',
            results: [],
            entered_at: result.entered_at
          };
        }
        acc[key].results.push(result);
        return acc;
      }, {});

      return Object.values(grouped || {});
    },
    refetchInterval: 30000
  });

  const { data: approvedResults } = useQuery({
    queryKey: ['approved-results'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exams(name),
          subjects(name, name_bn),
          teachers(name)
        `)
        .eq('school_id', schoolId)
        .eq('verified', true)
        .order('verified_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ batch, action }: { batch: any; action: 'approve' | 'reject' }) => {
      const schoolId = await getCurrentSchoolId();
      const { data: { user } } = await supabase.auth.getUser();
      
      const resultIds = batch.results.map((r: any) => r.id);
      
      if (action === 'approve') {
        const { error } = await supabase
          .from('exam_results')
          .update({
            verified: true,
            verified_by: user?.id,
            verified_at: new Date().toISOString()
          })
          .in('id', resultIds);
        
        if (error) throw error;

        await supabase.from('activity_logs').insert({
          user_id: user?.id,
          user_type: 'admin',
          action: 'marks_approved',
          entity_type: 'exam_results',
          entity_id: batch.exam.id,
          description: `Approved marks for ${batch.results.length} students`,
          metadata: {
            exam_id: batch.exam.id,
            subject_id: batch.subject.id,
            teacher_id: batch.teacher.id,
            student_count: batch.results.length
          },
          school_id: schoolId
        });
      } else {
        const { error } = await supabase
          .from('exam_results')
          .delete()
          .in('id', resultIds);
        
        if (error) throw error;

        await supabase.from('activity_logs').insert({
          user_id: user?.id,
          user_type: 'admin',
          action: 'marks_rejected',
          entity_type: 'exam_results',
          entity_id: batch.exam.id,
          description: `Rejected marks for ${batch.results.length} students`,
          metadata: {
            exam_id: batch.exam.id,
            subject_id: batch.subject.id,
            teacher_id: batch.teacher.id
          },
          school_id: schoolId
        });
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.action === 'approve' ? 'মার্ক অনুমোদিত হয়েছে' : 'মার্ক প্রত্যাখ্যান করা হয়েছে',
        description: 'পরিবর্তন সফলভাবে সংরক্ষিত হয়েছে',
      });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approved-results'] });
      setShowDetails(false);
    },
    onError: () => {
      toast({
        title: 'ত্রুটি',
        description: 'অপারেশন সম্পন্ন করতে সমস্যা হয়েছে',
        variant: 'destructive'
      });
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">মার্ক অনুমোদন সিস্টেম</CardTitle>
            <CardDescription>শিক্ষকদের প্রবেশকৃত মার্ক যাচাই ও অনুমোদন করুন</CardDescription>
          </CardHeader>
        </Card>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              অপেক্ষমাণ ({pendingApprovals?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              অনুমোদিত
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {isLoading ? (
              <div className="text-center py-12">লোড হচ্ছে...</div>
            ) : pendingApprovals && pendingApprovals.length > 0 ? (
              <div className="grid gap-4">
                {pendingApprovals.map((batch: any, index: number) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-4">
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Clock className="w-3 h-3 mr-1" />
                              পর্যালোচনার জন্য অপেক্ষমাণ
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {formatDate(batch.entered_at)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                পরীক্ষা
                              </p>
                              <p className="font-medium">{batch.exam?.name}</p>
                              <p className="text-xs text-gray-500">{batch.exam?.exam_type}</p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                বিষয়
                              </p>
                              <p className="font-medium">{batch.subject?.name_bn || batch.subject?.name}</p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                শিক্ষক
                              </p>
                              <p className="font-medium">{batch.teacher?.name}</p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-500">ছাত্রসংখ্যা</p>
                              <p className="font-medium text-lg">{batch.results.length} জন</p>
                              <p className="text-xs text-gray-500">শ্রেণী: {batch.class}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBatch(batch);
                              setShowDetails(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            বিস্তারিত
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => approveMutation.mutate({ batch, action: 'approve' })}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            অনুমোদন
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => approveMutation.mutate({ batch, action: 'reject' })}
                            disabled={approveMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            প্রত্যাখ্যান
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">কোনো অপেক্ষমাণ অনুমোদন নেই</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="approved">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  {approvedResults?.map((result: any) => (
                    <div key={result.id} className="flex items-center justify-between p-3 border-b">
                      <div className="flex-1">
                        <p className="font-medium">{result.exams?.name} - {result.subjects?.name_bn || result.subjects?.name}</p>
                        <p className="text-sm text-gray-500">শিক্ষক: {result.teachers?.name}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        অনুমোদিত
                      </Badge>
                    </div>
                  ))}
                  {!approvedResults?.length && (
                    <p className="text-center text-gray-500 py-8">কোনো অনুমোদিত মার্ক নেই</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>মার্কের বিস্তারিত তথ্য</DialogTitle>
              <DialogDescription>
                {selectedBatch?.exam?.name} - {selectedBatch?.subject?.name_bn}
              </DialogDescription>
            </DialogHeader>
            
            {selectedBatch && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">শিক্ষক</p>
                    <p className="font-medium">{selectedBatch.teacher?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">প্রবেশের সময়</p>
                    <p className="font-medium">{formatDate(selectedBatch.entered_at)}</p>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">রোল</th>
                        <th className="px-4 py-2 text-left">নাম</th>
                        <th className="px-4 py-2 text-left">প্রাপ্ত নম্বর</th>
                        <th className="px-4 py-2 text-left">মোট নম্বর</th>
                        <th className="px-4 py-2 text-left">গ্রেড</th>
                        <th className="px-4 py-2 text-left">জিপিএ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBatch.results.map((result: any) => (
                        <tr key={result.id} className="border-t">
                          <td className="px-4 py-2">{result.students?.roll_number}</td>
                          <td className="px-4 py-2">{result.students?.name}</td>
                          <td className="px-4 py-2">{result.marks_obtained}</td>
                          <td className="px-4 py-2">{result.total_marks}</td>
                          <td className="px-4 py-2">
                            <Badge>{result.grade}</Badge>
                          </td>
                          <td className="px-4 py-2">{result.gpa}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowDetails(false)}
                  >
                    বন্ধ করুন
                  </Button>
                  <Button
                    onClick={() => approveMutation.mutate({ batch: selectedBatch, action: 'approve' })}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    অনুমোদন করুন
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
