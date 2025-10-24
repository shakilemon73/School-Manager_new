import { supabase } from '@/lib/supabase';

export const resultsDb = {
  /**
   * Get student scores for a specific assessment
   */
  async getStudentScores(schoolId: number, assessmentId: number) {
    const { data, error } = await supabase
      .from('student_scores')
      .select(`
        *,
        students!inner(id, name, student_id, class, section, school_id, photo, roll_number),
        assessments!inner(id, assessment_name, total_marks, subject_id, term_id, is_published, status)
      `)
      .eq('assessment_id', assessmentId)
      .eq('students.school_id', schoolId);

    if (error) throw error;
    return data || [];
  },

  /**
   * Update assessment status for approval workflow
   */
  async updateAssessmentStatus(
    assessmentId: number,
    schoolId: number,
    status: 'draft' | 'pending' | 'approved' | 'rejected',
    rejectionReason?: string
  ) {
    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };
    
    if (status === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    const { data, error } = await supabase
      .from('assessments')
      .update(updateData)
      .eq('id', assessmentId)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get student performance trends across multiple terms
   */
  async getStudentPerformanceTrends(
    studentId: number,
    schoolId: number,
    termIds: number[]
  ) {
    const { data, error } = await supabase
      .from('student_scores')
      .select(`
        *,
        assessments!inner(
          id,
          assessment_name,
          total_marks,
          term_id,
          subject_id,
          subjects(id, name, name_bn),
          academic_terms(id, name, name_bn)
        )
      `)
      .eq('student_id', studentId)
      .in('assessments.term_id', termIds);

    if (error) throw error;

    // Group by term and subject
    const trendsByTerm: Record<number, any> = {};
    
    data?.forEach((score: any) => {
      const termId = score.assessments?.term_id;
      const subjectId = score.assessments?.subject_id;
      
      if (!trendsByTerm[termId]) {
        trendsByTerm[termId] = {
          termId,
          termName: score.assessments?.academic_terms?.name,
          termNameBn: score.assessments?.academic_terms?.name_bn,
          subjects: {},
          averageMarks: 0,
          totalMarks: 0,
          obtainedMarks: 0,
        };
      }

      if (!trendsByTerm[termId].subjects[subjectId]) {
        trendsByTerm[termId].subjects[subjectId] = {
          subjectId,
          subjectName: score.assessments?.subjects?.name,
          subjectNameBn: score.assessments?.subjects?.name_bn,
          scores: [],
          average: 0,
        };
      }

      const percentage = (parseFloat(score.score_obtained || '0') / parseFloat(score.assessments?.total_marks || '100')) * 100;
      trendsByTerm[termId].subjects[subjectId].scores.push(percentage);
      trendsByTerm[termId].totalMarks += parseFloat(score.assessments?.total_marks || '0');
      trendsByTerm[termId].obtainedMarks += parseFloat(score.score_obtained || '0');
    });

    // Calculate averages
    Object.values(trendsByTerm).forEach((term: any) => {
      Object.values(term.subjects).forEach((subject: any) => {
        subject.average = subject.scores.reduce((a: number, b: number) => a + b, 0) / subject.scores.length;
      });
      term.averageMarks = term.totalMarks > 0 ? (term.obtainedMarks / term.totalMarks) * 100 : 0;
    });

    return Object.values(trendsByTerm);
  },

  /**
   * Get detailed analytics for a class
   */
  async getClassAnalytics(
    schoolId: number,
    classValue: string,
    section: string,
    termId?: number
  ) {
    // Get all students in the class
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, student_id, class, section, roll_number')
      .eq('school_id', schoolId)
      .eq('class', classValue)
      .eq('section', section)
      .eq('status', 'active');

    if (studentsError) throw studentsError;

    if (!students || students.length === 0) {
      return {
        subjectPerformance: [],
        passFailRate: { pass: 0, fail: 0, total: 0 },
        gradeDistribution: {},
        classAverage: 0,
      };
    }

    const studentIds = students.map(s => s.id);

    // Get all scores for these students
    let scoresQuery = supabase
      .from('student_scores')
      .select(`
        *,
        assessments!inner(
          id,
          assessment_name,
          total_marks,
          subject_id,
          term_id,
          subjects(id, name, name_bn)
        )
      `)
      .in('student_id', studentIds);

    if (termId) {
      scoresQuery = scoresQuery.eq('assessments.term_id', termId);
    }

    const { data: scores, error: scoresError } = await scoresQuery;

    if (scoresError) throw scoresError;

    // Calculate subject-wise performance
    const subjectPerformance: Record<number, any> = {};
    const gradeDistribution: Record<string, number> = {
      'A+': 0,
      'A': 0,
      'A-': 0,
      'B': 0,
      'C': 0,
      'D': 0,
      'F': 0,
    };

    let totalPercentage = 0;
    let scoreCount = 0;
    let passCount = 0;
    let failCount = 0;

    scores?.forEach((score: any) => {
      const subjectId = score.assessments?.subject_id;
      const percentage = !score.is_absent 
        ? (parseFloat(score.score_obtained || '0') / parseFloat(score.assessments?.total_marks || '100')) * 100 
        : 0;

      if (!score.is_absent) {
        // Subject performance
        if (!subjectPerformance[subjectId]) {
          subjectPerformance[subjectId] = {
            subjectId,
            subjectName: score.assessments?.subjects?.name,
            subjectNameBn: score.assessments?.subjects?.name_bn,
            totalPercentage: 0,
            count: 0,
            average: 0,
          };
        }
        subjectPerformance[subjectId].totalPercentage += percentage;
        subjectPerformance[subjectId].count++;

        // Grade distribution
        const grade = score.grade_letter || 'F';
        gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;

        // Overall stats
        totalPercentage += percentage;
        scoreCount++;

        if (percentage >= 40) {
          passCount++;
        } else {
          failCount++;
        }
      }
    });

    // Calculate averages
    Object.values(subjectPerformance).forEach((subject: any) => {
      subject.average = subject.count > 0 ? subject.totalPercentage / subject.count : 0;
    });

    const classAverage = scoreCount > 0 ? totalPercentage / scoreCount : 0;

    return {
      subjectPerformance: Object.values(subjectPerformance),
      passFailRate: {
        pass: passCount,
        fail: failCount,
        total: scoreCount,
        passPercentage: scoreCount > 0 ? (passCount / scoreCount) * 100 : 0,
      },
      gradeDistribution,
      classAverage,
    };
  },

  /**
   * Get top performing students in a class
   */
  async getClassToppers(
    schoolId: number,
    classValue: string,
    section: string,
    termId?: number,
    limit: number = 10
  ) {
    // Get all students in the class
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, student_id, class, section, roll_number, photo')
      .eq('school_id', schoolId)
      .eq('class', classValue)
      .eq('section', section)
      .eq('status', 'active');

    if (studentsError) throw studentsError;

    if (!students || students.length === 0) {
      return [];
    }

    const studentIds = students.map(s => s.id);

    // Get all scores
    let scoresQuery = supabase
      .from('student_scores')
      .select(`
        *,
        assessments!inner(
          id,
          total_marks,
          term_id
        )
      `)
      .in('student_id', studentIds)
      .eq('is_absent', false);

    if (termId) {
      scoresQuery = scoresQuery.eq('assessments.term_id', termId);
    }

    const { data: scores, error: scoresError } = await scoresQuery;

    if (scoresError) throw scoresError;

    // Calculate total marks for each student
    const studentMarks: Record<number, any> = {};

    students.forEach(student => {
      studentMarks[student.id] = {
        ...student,
        totalObtained: 0,
        totalMaxMarks: 0,
        percentage: 0,
        gpa: 0,
        gradeCount: {} as Record<string, number>,
      };
    });

    scores?.forEach((score: any) => {
      const studentId = score.student_id;
      if (studentMarks[studentId]) {
        studentMarks[studentId].totalObtained += parseFloat(score.score_obtained || '0');
        studentMarks[studentId].totalMaxMarks += parseFloat(score.assessments?.total_marks || '100');
        
        const grade = score.grade_letter || 'F';
        studentMarks[studentId].gradeCount[grade] = (studentMarks[studentId].gradeCount[grade] || 0) + 1;
      }
    });

    // Calculate percentages and sort
    const rankedStudents = Object.values(studentMarks)
      .map((student: any) => {
        student.percentage = student.totalMaxMarks > 0 
          ? (student.totalObtained / student.totalMaxMarks) * 100 
          : 0;
        
        // Simple GPA calculation (can be customized)
        student.gpa = student.percentage >= 80 ? 5.0 :
                      student.percentage >= 70 ? 4.0 :
                      student.percentage >= 60 ? 3.5 :
                      student.percentage >= 50 ? 3.0 :
                      student.percentage >= 40 ? 2.0 : 0;
        
        return student;
      })
      .filter((student: any) => student.totalMaxMarks > 0)
      .sort((a: any, b: any) => b.percentage - a.percentage)
      .slice(0, limit);

    return rankedStudents;
  },

  /**
   * Get students in a class/section for notification purposes
   */
  async getStudentsInClass(
    schoolId: number,
    classValue: string,
    section: string
  ) {
    const { data, error } = await supabase
      .from('students')
      .select('id, name, student_id')
      .eq('school_id', schoolId)
      .eq('class', classValue)
      .eq('section', section)
      .eq('status', 'active');

    if (error) throw error;
    return data || [];
  },
};
