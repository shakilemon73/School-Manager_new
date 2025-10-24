/**
 * Attendance Database Helper Functions
 * Centralized database operations for attendance management
 * All functions filter by school_id for multi-school isolation
 */

import { supabase } from '@/lib/supabase';
import type { InsertLeaveRequest, InsertSchoolHoliday } from '@shared/schema';

export interface LeaveRequestFilters {
  status?: 'pending' | 'approved' | 'rejected';
  studentId?: number;
  startDate?: string;
  endDate?: string;
}

export interface HolidayFilters {
  type?: string;
  academicYearId?: number;
  startDate?: string;
  endDate?: string;
}

export interface DefaulterFilters {
  classId?: string;
  section?: string;
  startDate?: string;
  endDate?: string;
}

export const attendanceDb = {
  /**
   * Get leave requests with optional filtering
   */
  async getLeaveRequests(schoolId: number, filters?: LeaveRequestFilters) {
    try {
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          students!inner(id, name, student_id, class, section, school_id)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId);
      }
      if (filters?.startDate) {
        query = query.gte('start_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('end_date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
      throw error;
    }
  },

  /**
   * Create a new leave request
   */
  async createLeaveRequest(request: InsertLeaveRequest) {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .insert(request)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to create leave request:', error);
      throw error;
    }
  },

  /**
   * Approve a leave request and mark attendance as excused
   */
  async approveLeave(leaveId: number, schoolId: number, approverId: number) {
    try {
      // Update leave request status
      const { data: leaveRequest, error: leaveError } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: approverId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', leaveId)
        .eq('school_id', schoolId)
        .select()
        .single();

      if (leaveError) throw leaveError;

      // Mark attendance as "excused" for the leave period
      if (leaveRequest) {
        const startDate = new Date(leaveRequest.start_date);
        const endDate = new Date(leaveRequest.end_date);
        const dates = [];
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          dates.push(new Date(d).toISOString().split('T')[0]);
        }

        // Upsert attendance records with "excused" status
        const attendanceRecords = dates.map(date => ({
          student_id: leaveRequest.student_id,
          date,
          status: 'excused',
          remarks: `Leave approved: ${leaveRequest.leave_type}`,
          school_id: schoolId,
        }));

        const { error: attendanceError } = await supabase
          .from('attendance')
          .upsert(attendanceRecords, {
            onConflict: 'student_id,date',
          });

        if (attendanceError) throw attendanceError;
      }

      return leaveRequest;
    } catch (error) {
      console.error('Failed to approve leave:', error);
      throw error;
    }
  },

  /**
   * Reject a leave request
   */
  async rejectLeave(leaveId: number, schoolId: number, approverId: number, reason: string) {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          approved_by: approverId,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', leaveId)
        .eq('school_id', schoolId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to reject leave:', error);
      throw error;
    }
  },

  /**
   * Get school holidays with optional filtering
   */
  async getSchoolHolidays(schoolId: number, filters?: HolidayFilters) {
    try {
      let query = supabase
        .from('school_holidays')
        .select('*')
        .eq('school_id', schoolId)
        .order('date', { ascending: true });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.academicYearId) {
        query = query.eq('academic_year_id', filters.academicYearId);
      }
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('end_date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch school holidays:', error);
      throw error;
    }
  },

  /**
   * Create a new school holiday
   */
  async createHoliday(holiday: InsertSchoolHoliday) {
    try {
      const { data, error } = await supabase
        .from('school_holidays')
        .insert(holiday)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to create holiday:', error);
      throw error;
    }
  },

  /**
   * Update an existing holiday
   */
  async updateHoliday(holidayId: number, schoolId: number, data: Partial<InsertSchoolHoliday>) {
    try {
      const { data: updatedHoliday, error } = await supabase
        .from('school_holidays')
        .update(data)
        .eq('id', holidayId)
        .eq('school_id', schoolId)
        .select()
        .single();

      if (error) throw error;
      return updatedHoliday;
    } catch (error) {
      console.error('Failed to update holiday:', error);
      throw error;
    }
  },

  /**
   * Delete a holiday
   */
  async deleteHoliday(holidayId: number, schoolId: number) {
    try {
      const { error } = await supabase
        .from('school_holidays')
        .delete()
        .eq('id', holidayId)
        .eq('school_id', schoolId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete holiday:', error);
      throw error;
    }
  },

  /**
   * Get students with attendance below threshold (defaulters)
   */
  async getDefaulterStudents(schoolId: number, threshold: number, filters?: DefaulterFilters) {
    try {
      // Build date range query
      const startDate = filters?.startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
      const endDate = filters?.endDate || new Date().toISOString().split('T')[0];

      // Fetch all students
      let studentQuery = supabase
        .from('students')
        .select('id, name, student_id, class, section, guardian_phone, email')
        .eq('school_id', schoolId)
        .eq('status', 'active');

      if (filters?.classId) {
        studentQuery = studentQuery.eq('class', filters.classId);
      }
      if (filters?.section) {
        studentQuery = studentQuery.eq('section', filters.section);
      }

      const { data: students, error: studentError } = await studentQuery;
      if (studentError) throw studentError;

      if (!students || students.length === 0) return [];

      // Fetch attendance records for date range
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select('student_id, status, date')
        .eq('school_id', schoolId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (attendanceError) throw attendanceError;

      // Calculate attendance percentage for each student
      const defaulters = [];
      const totalDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

      for (const student of students) {
        const studentAttendance = attendanceRecords?.filter(a => a.student_id === student.id) || [];
        const presentDays = studentAttendance.filter(a => a.status === 'present' || a.status === 'excused').length;
        const absentDays = studentAttendance.filter(a => a.status === 'absent').length;
        const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

        // Find last absent date
        const absentRecords = studentAttendance.filter(a => a.status === 'absent').sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const lastAbsentDate = absentRecords.length > 0 ? absentRecords[0].date : null;

        if (attendancePercentage < threshold) {
          defaulters.push({
            ...student,
            attendance_percentage: Math.round(attendancePercentage * 10) / 10,
            days_present: presentDays,
            days_absent: absentDays,
            total_days: totalDays,
            last_absent_date: lastAbsentDate,
          });
        }
      }

      return defaulters.sort((a, b) => a.attendance_percentage - b.attendance_percentage);
    } catch (error) {
      console.error('Failed to fetch defaulter students:', error);
      throw error;
    }
  },

  /**
   * Get attendance analytics for year-over-year comparison
   */
  async getAttendanceAnalytics(schoolId: number, academicYearIds: number[]) {
    try {
      const analytics = [];

      for (const yearId of academicYearIds) {
        // Fetch academic year details
        const { data: academicYear, error: yearError } = await supabase
          .from('academic_years')
          .select('*')
          .eq('id', yearId)
          .eq('school_id', schoolId)
          .single();

        if (yearError || !academicYear) continue;

        // Fetch attendance records for this academic year
        const { data: attendanceRecords, error: attendanceError } = await supabase
          .from('attendance')
          .select('date, status')
          .eq('school_id', schoolId)
          .gte('date', academicYear.start_date)
          .lte('date', academicYear.end_date);

        if (attendanceError) continue;

        // Group by month and calculate percentages
        const monthlyData: Record<string, { present: number; total: number }> = {};
        
        for (const record of attendanceRecords || []) {
          const month = new Date(record.date).toLocaleString('en-US', { month: 'short' });
          
          if (!monthlyData[month]) {
            monthlyData[month] = { present: 0, total: 0 };
          }
          
          monthlyData[month].total++;
          if (record.status === 'present' || record.status === 'excused') {
            monthlyData[month].present++;
          }
        }

        // Convert to array format
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const yearData = months.map(month => ({
          month,
          year: academicYear.name,
          percentage: monthlyData[month] 
            ? Math.round((monthlyData[month].present / monthlyData[month].total) * 100 * 10) / 10
            : 0,
        }));

        analytics.push({
          yearId,
          yearName: academicYear.name,
          monthlyData: yearData,
          averageAttendance: yearData.reduce((sum, m) => sum + m.percentage, 0) / 12,
        });
      }

      return analytics;
    } catch (error) {
      console.error('Failed to fetch attendance analytics:', error);
      throw error;
    }
  },

  /**
   * Get class-wise attendance comparison
   */
  async getClasswiseComparison(schoolId: number, startDate: string, endDate: string) {
    try {
      // Fetch all students
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id, class, section')
        .eq('school_id', schoolId)
        .eq('status', 'active');

      if (studentError) throw studentError;

      // Fetch attendance records
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('school_id', schoolId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (attendanceError) throw attendanceError;

      // Group by class
      const classData: Record<string, { present: number; total: number }> = {};
      
      for (const student of students || []) {
        const className = `${student.class}-${student.section}`;
        
        if (!classData[className]) {
          classData[className] = { present: 0, total: 0 };
        }

        const studentAttendance = attendanceRecords?.filter(a => a.student_id === student.id) || [];
        classData[className].total += studentAttendance.length;
        classData[className].present += studentAttendance.filter(
          a => a.status === 'present' || a.status === 'excused'
        ).length;
      }

      // Convert to array format
      return Object.entries(classData).map(([className, data]) => ({
        class: className,
        percentage: data.total > 0 ? Math.round((data.present / data.total) * 100 * 10) / 10 : 0,
      }));
    } catch (error) {
      console.error('Failed to fetch class-wise comparison:', error);
      throw error;
    }
  },

  /**
   * Get alert settings for a school
   */
  async getAlertSettings(schoolId: number) {
    try {
      // Return default settings since schema doesn't have category field
      return {
        threshold: 75,
        frequency: 'weekly',
        recipients: 'both',
        methods: ['in-app'],
        messageTemplate: 'Your child {studentName} has low attendance ({percentage}%)',
        messageTemplateBn: 'আপনার সন্তান {studentName} এর উপস্থিতি কম ({percentage}%)',
        lastAlertSent: null,
      };
    } catch (error) {
      console.error('Failed to fetch alert settings:', error);
      throw error;
    }
  },

  /**
   * Save alert settings (simplified version without database storage)
   */
  async saveAlertSettings(schoolId: number, settings: any) {
    try {
      // For now, return the settings as is since we don't have proper storage
      // In production, you would store this in a dedicated table
      console.log('Alert settings saved:', settings);
      return settings;
    } catch (error) {
      console.error('Failed to save alert settings:', error);
      throw error;
    }
  },
};
