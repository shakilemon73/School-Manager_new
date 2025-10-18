import { supabase } from '@/lib/supabase';
import type {
  Subject,
  InsertSubject,
  GradeScale,
  InsertGradeScale,
  Assessment,
  InsertAssessment,
  AssessmentComponent,
  InsertAssessmentComponent,
  StudentScore,
  InsertStudentScore,
  GradeOverride,
  InsertGradeOverride,
} from '@shared/schema';

export const gradesDb = {
  async getSubjects(schoolId: number) {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('school_id', schoolId)
      .order('name');

    if (error) throw error;
    return data as Subject[];
  },

  async createSubject(subject: InsertSubject) {
    const { data, error } = await supabase
      .from('subjects')
      .insert(subject)
      .select()
      .single();

    if (error) throw error;
    return data as Subject;
  },

  async getGradeScales(schoolId: number) {
    const { data, error } = await supabase
      .from('grade_scales')
      .select('*')
      .eq('school_id', schoolId)
      .order('is_default', { ascending: false });

    if (error) throw error;
    return data as GradeScale[];
  },

  async createGradeScale(gradeScale: InsertGradeScale) {
    const { data, error } = await supabase
      .from('grade_scales')
      .insert(gradeScale)
      .select()
      .single();

    if (error) throw error;
    return data as GradeScale;
  },

  async createAssessment(assessment: InsertAssessment) {
    const { data, error } = await supabase
      .from('assessments')
      .insert(assessment)
      .select(`
        *,
        subject:subjects(*),
        created_by:teachers(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async updateAssessment(id: number, schoolId: number, assessment: Partial<InsertAssessment>) {
    const { data, error } = await supabase
      .from('assessments')
      .update(assessment)
      .eq('id', id)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) throw error;
    return data as Assessment;
  },

  async deleteAssessment(id: number, schoolId: number) {
    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;
  },

  async getAssessmentsByClass(
    schoolId: number,
    classValue: string,
    section: string,
    subjectId?: number,
    termId?: number
  ) {
    let query = supabase
      .from('assessments')
      .select(`
        *,
        subject:subjects(*),
        created_by:teachers(*),
        term:academic_terms(*)
      `)
      .eq('school_id', schoolId)
      .eq('class', classValue)
      .eq('section', section)
      .order('date', { ascending: false });

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    if (termId) {
      query = query.eq('term_id', termId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  async getAssessment(id: number, schoolId: number) {
    const { data, error } = await supabase
      .from('assessments')
      .select(`
        *,
        subject:subjects(*),
        created_by:teachers(*),
        term:academic_terms(*),
        components:assessment_components(*)
      `)
      .eq('id', id)
      .eq('school_id', schoolId)
      .single();

    if (error) throw error;
    return data;
  },

  async recordStudentScore(score: InsertStudentScore) {
    const { data, error } = await supabase
      .from('student_scores')
      .upsert(score, {
        onConflict: 'assessment_id,student_id',
      })
      .select(`
        *,
        student:students(*),
        assessment:assessments(*),
        graded_by:teachers(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async recordBulkStudentScores(scores: InsertStudentScore[]) {
    const { data, error } = await supabase
      .from('student_scores')
      .upsert(scores, {
        onConflict: 'assessment_id,student_id',
      })
      .select();

    if (error) throw error;
    return data as StudentScore[];
  },

  async getStudentScoresForAssessment(assessmentId: number, schoolId: number) {
    const { data, error } = await supabase
      .from('student_scores')
      .select(`
        *,
        student:students!inner(*),
        assessment:assessments!inner(*)
      `)
      .eq('assessment_id', assessmentId)
      .eq('students.school_id', schoolId)
      .eq('assessments.school_id', schoolId)
      .order('student_id');

    if (error) throw error;
    return data;
  },

  async calculateWeightedGrade(studentId: number, subjectId: number, termId: number, schoolId: number) {
    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select(`
        id,
        total_marks,
        weight_percentage
      `)
      .eq('subject_id', subjectId)
      .eq('term_id', termId)
      .eq('school_id', schoolId);

    if (assessmentsError) throw assessmentsError;

    if (!assessments || assessments.length === 0) {
      return {
        weightedGrade: 0,
        percentage: 0,
        totalWeight: 0,
      };
    }

    const { data: scores, error: scoresError } = await supabase
      .from('student_scores')
      .select('*')
      .eq('student_id', studentId)
      .in('assessment_id', assessments.map(a => a.id));

    if (scoresError) throw scoresError;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    assessments.forEach(assessment => {
      const score = scores?.find(s => s.assessment_id === assessment.id);
      if (score && !score.is_absent && score.score_obtained !== null) {
        const weight = Number(assessment.weight_percentage || 100);
        const percentage = (Number(score.score_obtained) / Number(assessment.total_marks)) * 100;
        totalWeightedScore += (percentage * weight) / 100;
        totalWeight += weight;
      }
    });

    const weightedGrade = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;

    return {
      weightedGrade: Math.round(weightedGrade * 100) / 100,
      percentage: Math.round(weightedGrade * 100) / 100,
      totalWeight,
    };
  },

  async getStudentGradeBook(studentId: number, schoolId: number, termId?: number) {
    let query = supabase
      .from('student_scores')
      .select(`
        *,
        assessment:assessments!inner(
          *,
          subject:subjects(*),
          term:academic_terms(*)
        ),
        student:students!inner(*)
      `)
      .eq('student_id', studentId)
      .eq('students.school_id', schoolId)
      .eq('assessments.school_id', schoolId)
      .order('created_at', { ascending: false });

    if (termId) {
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id')
        .eq('term_id', termId);

      if (assessments && assessments.length > 0) {
        query = query.in('assessment_id', assessments.map(a => a.id));
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  async getClassGradeBook(
    schoolId: number,
    classValue: string,
    section: string,
    subjectId?: number,
    termId?: number
  ) {
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', schoolId)
      .eq('class', classValue)
      .eq('section', section)
      .eq('status', 'active')
      .order('roll_number');

    if (studentsError) throw studentsError;

    const assessmentsData = await this.getAssessmentsByClass(
      schoolId,
      classValue,
      section,
      subjectId,
      termId
    );

    const assessmentIds = assessmentsData?.map((a: any) => a.id) || [];

    if (assessmentIds.length === 0) {
      return {
        students: students || [],
        assessments: [],
        scores: [],
      };
    }

    const { data: scores, error: scoresError } = await supabase
      .from('student_scores')
      .select('*')
      .in('assessment_id', assessmentIds);

    if (scoresError) throw scoresError;

    return {
      students: students || [],
      assessments: assessmentsData || [],
      scores: scores || [],
    };
  },

  async getGradeDistribution(assessmentId: number, schoolId: number) {
    const { data, error } = await supabase
      .from('student_scores')
      .select(`
        score_obtained,
        grade_letter,
        assessment:assessments!inner(*)
      `)
      .eq('assessment_id', assessmentId)
      .eq('assessments.school_id', schoolId)
      .not('is_absent', 'eq', true);

    if (error) throw error;

    const { data: assessment } = await supabase
      .from('assessments')
      .select('total_marks')
      .eq('id', assessmentId)
      .eq('school_id', schoolId)
      .single();

    const totalMarks = Number(assessment?.total_marks || 100);

    const distribution = {
      'A+ (90-100%)': 0,
      'A (80-89%)': 0,
      'B (70-79%)': 0,
      'C (60-69%)': 0,
      'F (<60%)': 0,
    };

    data?.forEach(score => {
      if (score.score_obtained !== null) {
        const percentage = (Number(score.score_obtained) / totalMarks) * 100;
        if (percentage >= 90) distribution['A+ (90-100%)']++;
        else if (percentage >= 80) distribution['A (80-89%)']++;
        else if (percentage >= 70) distribution['B (70-79%)']++;
        else if (percentage >= 60) distribution['C (60-69%)']++;
        else distribution['F (<60%)']++;
      }
    });

    return {
      distribution,
      total: data?.length || 0,
      average: data && data.length > 0
        ? data.reduce((sum, s) => sum + Number(s.score_obtained || 0), 0) / data.length
        : 0,
    };
  },

  async createGradeOverride(override: InsertGradeOverride) {
    const { data, error } = await supabase
      .from('grade_overrides')
      .insert(override)
      .select(`
        *,
        student:students(*),
        subject:subjects(*),
        created_by_user:teachers!grade_overrides_created_by_fkey(*),
        approved_by_user:teachers!grade_overrides_approved_by_fkey(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async getGradeOverrides(studentId: number, schoolId: number, termId?: number) {
    let query = supabase
      .from('grade_overrides')
      .select(`
        *,
        subject:subjects!inner(*),
        student:students!inner(*),
        created_by_user:teachers!grade_overrides_created_by_fkey(*),
        approved_by_user:teachers!grade_overrides_approved_by_fkey(*)
      `)
      .eq('student_id', studentId)
      .eq('students.school_id', schoolId);

    if (termId) {
      query = query.eq('term_id', termId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  async exportGradesToCSV(
    schoolId: number,
    classValue: string,
    section: string,
    subjectId?: number,
    termId?: number
  ) {
    const gradeBook = await this.getClassGradeBook(
      schoolId,
      classValue,
      section,
      subjectId,
      termId
    );

    const headers = [
      'Student ID',
      'Name',
      'Roll Number',
      ...gradeBook.assessments.map((a: any) => a.assessment_name),
      'Weighted Grade',
    ];

    const rows = await Promise.all(
      gradeBook.students.map(async (student: any) => {
        const studentScores = gradeBook.scores.filter(
          (s: any) => s.student_id === student.id
        );

        const assessmentScores = gradeBook.assessments.map((assessment: any) => {
          const score = studentScores.find((s: any) => s.assessment_id === assessment.id);
          if (!score) return '';
          if (score.is_absent) return 'Absent';
          return score.score_obtained || '';
        });

        let weightedGrade = '';
        if (subjectId && termId) {
          const grade = await this.calculateWeightedGrade(student.id, subjectId, termId, schoolId);
          weightedGrade = grade.percentage.toFixed(2);
        }

        return [
          student.student_id,
          student.name,
          student.roll_number,
          ...assessmentScores,
          weightedGrade,
        ];
      })
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    return csvContent;
  },
};
