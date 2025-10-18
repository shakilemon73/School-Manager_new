import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface ExamResultWithDetails {
  id: number;
  studentId: number;
  marksObtained: string;
  grade: string;
  remarks: string;
  schedule: {
    id: number;
    subject: string;
    fullMarks: number;
    passMarks: number;
    date: string;
    exam: {
      id: number;
      name: string;
      description: string;
      startDate: string;
      endDate: string;
      academicYearId: number;
    };
  };
}

export function usePublicResults(token: string | null, studentId: number | null) {
  return useQuery({
    queryKey: ['/api/public/results', token, studentId],
    queryFn: async () => {
      if (!token || !studentId) {
        throw new Error('No access token or student ID provided');
      }

      console.log('📊 Fetching public results for student:', studentId);

      // Fetch exam results with related data
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          id,
          student_id,
          marks_obtained,
          grade,
          remarks,
          created_at,
          schedule:exam_schedules!schedule_id (
            id,
            subject,
            full_marks,
            pass_marks,
            date,
            start_time,
            end_time,
            exam:exams!exam_id (
              id,
              name,
              description,
              start_date,
              end_date,
              academic_year_id,
              is_publicly_available
            )
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Results fetch error:', error);
        throw new Error('Failed to fetch results');
      }

      // Filter only publicly available results
      const publicResults = data?.filter((result: any) => {
        return result.schedule?.exam?.is_publicly_available === true;
      });

      console.log('✅ Public results fetched:', publicResults?.length || 0);

      return publicResults?.map((result: any) => ({
        id: result.id,
        studentId: result.student_id,
        marksObtained: result.marks_obtained,
        grade: result.grade,
        remarks: result.remarks,
        schedule: {
          id: result.schedule?.id,
          subject: result.schedule?.subject,
          fullMarks: result.schedule?.full_marks,
          passMarks: result.schedule?.pass_marks,
          date: result.schedule?.date,
          exam: {
            id: result.schedule?.exam?.id,
            name: result.schedule?.exam?.name,
            description: result.schedule?.exam?.description,
            startDate: result.schedule?.exam?.start_date,
            endDate: result.schedule?.exam?.end_date,
            academicYearId: result.schedule?.exam?.academic_year_id,
          }
        }
      })) as ExamResultWithDetails[];
    },
    enabled: !!token && !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
