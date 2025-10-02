import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useSupabaseDirectAuth, userProfile } from '@/hooks/use-supabase-direct-auth';
import { ArrowLeft, Save, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { Link } from 'wouter';

export default function TeacherMarkEntry() {
  const { user } = useSupabaseDirectAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [marks, setMarks] = useState<Record<number, { obtained: string; remarks: string }>>({});

  const getCurrentSchoolId = async () => {
    const schoolId = await userProfile.getCurrentUserSchoolId();
    if (!schoolId) throw new Error('School ID not found');
    return schoolId;
  };

  const getCurrentTeacherId = async () => {
    const { data, error } = await supabase
      .from('teachers')
      .select('id')
      .eq('email', user?.email)
      .single();
    
    if (error || !data) throw new Error('Teacher ID not found');
    return data.id;
  };

  const { data: exams } = useQuery({
    queryKey: ['teacher-exams'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: subjects } = useQuery({
    queryKey: ['teacher-subjects'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const teacherId = await getCurrentTeacherId();
      
      const { data, error } = await supabase
        .from('teacher_assignments')
        .select('subject_id, subjects(id, name, name_bn, code)')
        .eq('school_id', schoolId)
        .eq('teacher_id', teacherId);
      
      if (error) throw error;
      return data?.map(ta => ta.subjects).filter(Boolean) || [];
    },
    enabled: !!user
  });

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['exam-students', selectedClass, selectedExam],
    queryFn: async () => {
      if (!selectedClass) return [];
      
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('students')
        .select('id, name, roll_number, class')
        .eq('school_id', schoolId)
        .eq('class', selectedClass)
        .order('roll_number', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClass && !!selectedExam
  });

  const { data: existingMarks } = useQuery({
    queryKey: ['existing-marks', selectedExam, selectedSubject],
    queryFn: async () => {
      if (!selectedExam || !selectedSubject) return [];
      
      const { data, error } = await supabase
        .from('exam_results')
        .select('*')
        .eq('exam_id', parseInt(selectedExam))
        .eq('subject_id', parseInt(selectedSubject));
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedExam && !!selectedSubject
  });

  const saveMarksMutation = useMutation({
    mutationFn: async (marksData: any[]) => {
      const schoolId = await getCurrentSchoolId();
      const teacherId = await getCurrentTeacherId();
      
      const { data, error } = await supabase
        .from('exam_results')
        .upsert(marksData.map(mark => ({
          ...mark,
          school_id: schoolId,
          teacher_id: teacherId,
          verified: false,
          entered_at: new Date().toISOString()
        })), { onConflict: 'student_id, exam_id, subject_id' })
        .select();
      
      if (error) throw error;

      await supabase.from('activity_logs').insert({
        user_id: teacherId,
        user_type: 'teacher',
        action: 'marks_entry',
        entity_type: 'exam_results',
        entity_id: parseInt(selectedExam),
        description: `Entered marks for ${marksData.length} students`,
        metadata: {
          exam_id: selectedExam,
          subject_id: selectedSubject,
          class: selectedClass,
          student_count: marksData.length
        },
        school_id: schoolId
      });
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'মার্ক সফলভাবে সংরক্ষিত হয়েছে',
        description: 'প্রশাসক যাচাইকরণের জন্য অপেক্ষা করছে',
      });
      queryClient.invalidateQueries({ queryKey: ['existing-marks'] });
      setMarks({});
    },
    onError: (error) => {
      toast({
        title: 'ত্রুটি',
        description: 'মার্ক সংরক্ষণে সমস্যা হয়েছে',
        variant: 'destructive'
      });
      console.error('Error saving marks:', error);
    }
  });

  const handleMarkChange = (studentId: number, field: 'obtained' | 'remarks', value: string) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const calculateGrade = (obtained: number, total: number): { grade: string; gpa: number } => {
    const percentage = (obtained / total) * 100;
    if (percentage >= 80) return { grade: 'A+', gpa: 5.0 };
    if (percentage >= 70) return { grade: 'A', gpa: 4.0 };
    if (percentage >= 60) return { grade: 'A-', gpa: 3.5 };
    if (percentage >= 50) return { grade: 'B', gpa: 3.0 };
    if (percentage >= 40) return { grade: 'C', gpa: 2.0 };
    if (percentage >= 33) return { grade: 'D', gpa: 1.0 };
    return { grade: 'F', gpa: 0.0 };
  };

  const handleSaveMarks = () => {
    const exam = exams?.find(e => e.id === parseInt(selectedExam));
    if (!exam) return;

    const marksData = students?.map(student => {
      const localMark = marks[student.id];
      const existingMark = existingMarks?.find(m => m.student_id === student.id);
      const obtained = parseFloat(
        localMark?.obtained || 
        (existingMark ? String(existingMark.marks_obtained) : '0')
      );
      const total = exam.total_marks || 100;
      const { grade, gpa } = calculateGrade(obtained, total);

      return {
        student_id: student.id,
        exam_id: parseInt(selectedExam),
        subject_id: parseInt(selectedSubject),
        marks_obtained: obtained,
        total_marks: total,
        grade,
        gpa,
        remarks: localMark?.remarks || existingMark?.remarks || ''
      };
    }).filter(mark => marks[mark.student_id]?.obtained);

    if (marksData && marksData.length > 0) {
      saveMarksMutation.mutate(marksData);
    }
  };

  const selectedExamData = exams?.find(e => e.id === parseInt(selectedExam));

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/teacher">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              শিক্ষক ড্যাশবোর্ডে ফিরে যান
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">মার্ক এন্ট্রি</CardTitle>
            <CardDescription>ছাত্রছাত্রীদের পরীক্ষার মার্ক প্রবেশ করান</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>পরীক্ষা নির্বাচন করুন</Label>
                <Select value={selectedExam} onValueChange={setSelectedExam}>
                  <SelectTrigger>
                    <SelectValue placeholder="পরীক্ষা বেছে নিন" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams?.map(exam => (
                      <SelectItem key={exam.id} value={exam.id.toString()}>
                        {exam.name} ({exam.exam_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>শ্রেণী</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="শ্রেণী বেছে নিন" />
                  </SelectTrigger>
                  <SelectContent>
                    {['৬', '৭', '৮', '৯', '১০'].map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>বিষয়</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="বিষয় বেছে নিন" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((subject: any) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name_bn || subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedExamData && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>মোট নম্বর:</strong> {selectedExamData.total_marks} | 
                  <strong className="ml-4">পাসমার্ক:</strong> {selectedExamData.pass_marks}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedExam && selectedClass && selectedSubject && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    ছাত্রছাত্রী তালিকা ({students?.length || 0} জন)
                  </CardTitle>
                </div>
                <Button
                  onClick={handleSaveMarks}
                  disabled={saveMarksMutation.isPending || Object.keys(marks).length === 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  মার্ক সংরক্ষণ করুন
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="text-center py-8">লোড হচ্ছে...</div>
              ) : (
                <div className="space-y-3">
                  {students?.map((student) => {
                    const existingMark = existingMarks?.find(m => m.student_id === student.id);
                    const isVerified = existingMark?.verified;
                    
                    return (
                      <div
                        key={student.id}
                        className="grid grid-cols-12 gap-4 p-4 border rounded-lg items-center"
                      >
                        <div className="col-span-4">
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-gray-500">রোল: {student.roll_number}</p>
                        </div>
                        
                        <div className="col-span-2">
                          <Label className="text-xs">প্রাপ্ত নম্বর</Label>
                          <Input
                            type="number"
                            min="0"
                            max={selectedExamData?.total_marks || 100}
                            value={marks[student.id]?.obtained || existingMark?.marks_obtained || ''}
                            onChange={(e) => handleMarkChange(student.id, 'obtained', e.target.value)}
                            disabled={isVerified}
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="col-span-4">
                          <Label className="text-xs">মন্তব্য (ঐচ্ছিক)</Label>
                          <Input
                            value={marks[student.id]?.remarks || existingMark?.remarks || ''}
                            onChange={(e) => handleMarkChange(student.id, 'remarks', e.target.value)}
                            disabled={isVerified}
                            placeholder="মন্তব্য লিখুন"
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="col-span-2">
                          {isVerified ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              যাচাইকৃত
                            </Badge>
                          ) : existingMark ? (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              অপেক্ষমাণ
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
