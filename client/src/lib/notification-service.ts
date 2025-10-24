/**
 * Central Notification Service
 * Reusable service for sending notifications across all academic pages
 * Supports email, SMS, and in-app notifications
 * Filters by school_id for multi-school isolation
 */

import { supabase } from '@/lib/supabase';
import type { InsertNotification } from '@shared/schema';

export type NotificationType = 'result_published' | 'assignment_posted' | 'assignment_due' | 'attendance_alert' | 'leave_approved' | 'leave_rejected' | 'general';

export interface NotificationPayload {
  schoolId: number;
  type: NotificationType;
  title: string;
  titleBn: string;
  message: string;
  messageBn: string;
  recipientIds?: number[]; // Supabase user IDs
  recipientType?: 'student' | 'parent' | 'teacher' | 'all';
  category: string;
  categoryBn: string;
  priority?: 'low' | 'medium' | 'high';
  sendEmail?: boolean;
  sendSMS?: boolean;
}

class NotificationService {
  /**
   * Send notification to specific recipients or all users of a type
   */
  async send(payload: NotificationPayload): Promise<void> {
    try {
      const {
        schoolId,
        type,
        title,
        titleBn,
        message,
        messageBn,
        recipientIds,
        recipientType = 'all',
        category,
        categoryBn,
        priority = 'medium',
        sendEmail = false,
        sendSMS = false,
      } = payload;

      // If specific recipients provided, send to them
      if (recipientIds && recipientIds.length > 0) {
        const notifications: InsertNotification[] = recipientIds.map(recipientId => ({
          school_id: schoolId,
          title,
          title_bn: titleBn,
          message,
          message_bn: messageBn,
          recipient_id: recipientId,
          recipient_type: recipientType,
          category,
          category_bn: categoryBn,
          type: type,
          priority,
          is_read: false,
          is_live: true,
          is_active: true,
        }));

        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) throw error;
      } else {
        // Send to all users of the specified type in this school
        // Fetch users based on recipient type and school
        let userQuery = supabase
          .from('role_assignments')
          .select('user_id')
          .eq('school_id', schoolId);

        if (recipientType !== 'all') {
          userQuery = userQuery.eq('role', recipientType);
        }

        const { data: users, error: userError } = await userQuery;

        if (userError) throw userError;

        if (users && users.length > 0) {
          const notifications: InsertNotification[] = users.map(user => ({
            school_id: schoolId,
            title,
            title_bn: titleBn,
            message,
            message_bn: messageBn,
            recipient_id: user.user_id,
            recipient_type: recipientType,
            category,
            category_bn: categoryBn,
            type: type,
            priority,
            is_read: false,
            is_live: true,
            is_active: true,
          }));

          const { error } = await supabase
            .from('notifications')
            .insert(notifications);

          if (error) throw error;
        }
      }

      // TODO: Implement email/SMS sending if enabled
      // This would integrate with external services like SendGrid, Twilio, etc.
      if (sendEmail) {
        console.log('Email notification would be sent here');
      }

      if (sendSMS) {
        console.log('SMS notification would be sent here');
      }

    } catch (error) {
      console.error('Notification service error:', error);
      throw error;
    }
  }

  /**
   * Notify about published results
   */
  async notifyResultsPublished(
    schoolId: number,
    className: string,
    section: string,
    termName: string,
    studentIds?: number[]
  ): Promise<void> {
    await this.send({
      schoolId,
      type: 'result_published',
      title: `Results Published: ${className}-${section}`,
      titleBn: `ফলাফল প্রকাশিত: ${className}-${section}`,
      message: `${termName} term results for Class ${className} Section ${section} have been published.`,
      messageBn: `${className} শ্রেণি ${section} বিভাগের ${termName} টার্মের ফলাফল প্রকাশিত হয়েছে।`,
      recipientIds: studentIds,
      recipientType: 'student',
      category: 'Results',
      categoryBn: 'ফলাফল',
      priority: 'high',
    });
  }

  /**
   * Notify about new assignment
   */
  async notifyAssignmentPosted(
    schoolId: number,
    assignmentName: string,
    subjectName: string,
    dueDate: string,
    studentIds?: number[]
  ): Promise<void> {
    await this.send({
      schoolId,
      type: 'assignment_posted',
      title: `New Assignment: ${assignmentName}`,
      titleBn: `নতুন অ্যাসাইনমেন্ট: ${assignmentName}`,
      message: `A new ${subjectName} assignment has been posted. Due date: ${dueDate}`,
      messageBn: `${subjectName} বিষয়ের একটি নতুন অ্যাসাইনমেন্ট দেওয়া হয়েছে। শেষ তারিখ: ${dueDate}`,
      recipientIds: studentIds,
      recipientType: 'student',
      category: 'Assignment',
      categoryBn: 'অ্যাসাইনমেন্ট',
      priority: 'medium',
    });
  }

  /**
   * Notify about assignment due soon
   */
  async notifyAssignmentDueSoon(
    schoolId: number,
    assignmentName: string,
    dueDate: string,
    studentIds?: number[]
  ): Promise<void> {
    await this.send({
      schoolId,
      type: 'assignment_due',
      title: `Assignment Due Soon: ${assignmentName}`,
      titleBn: `অ্যাসাইনমেন্ট শীঘ্রই জমা দিতে হবে: ${assignmentName}`,
      message: `Reminder: Assignment "${assignmentName}" is due on ${dueDate}`,
      messageBn: `মনে করিয়ে দেওয়া: "${assignmentName}" অ্যাসাইনমেন্ট ${dueDate} তারিখে জমা দিতে হবে`,
      recipientIds: studentIds,
      recipientType: 'student',
      category: 'Assignment',
      categoryBn: 'অ্যাসাইনমেন্ট',
      priority: 'high',
    });
  }

  /**
   * Notify about low attendance
   */
  async notifyLowAttendance(
    schoolId: number,
    studentName: string,
    attendancePercentage: number,
    recipientIds: number[]
  ): Promise<void> {
    await this.send({
      schoolId,
      type: 'attendance_alert',
      title: `Low Attendance Alert: ${studentName}`,
      titleBn: `কম উপস্থিতির সতর্কতা: ${studentName}`,
      message: `Attendance for ${studentName} has dropped to ${attendancePercentage.toFixed(1)}%`,
      messageBn: `${studentName} এর উপস্থিতি ${attendancePercentage.toFixed(1)}% এ নেমে গেছে`,
      recipientIds,
      recipientType: 'parent',
      category: 'Attendance',
      categoryBn: 'উপস্থিতি',
      priority: 'high',
      sendEmail: true,
      sendSMS: true,
    });
  }

  /**
   * Notify about leave request approval/rejection
   */
  async notifyLeaveStatus(
    schoolId: number,
    studentName: string,
    leaveType: string,
    status: 'approved' | 'rejected',
    recipientIds: number[]
  ): Promise<void> {
    const isApproved = status === 'approved';
    await this.send({
      schoolId,
      type: isApproved ? 'leave_approved' : 'leave_rejected',
      title: `Leave ${isApproved ? 'Approved' : 'Rejected'}: ${studentName}`,
      titleBn: `ছুটি ${isApproved ? 'অনুমোদিত' : 'প্রত্যাখ্যাত'}: ${studentName}`,
      message: `The ${leaveType} leave request for ${studentName} has been ${status}`,
      messageBn: `${studentName} এর ${leaveType} ছুটির আবেদন ${isApproved ? 'অনুমোদিত' : 'প্রত্যাখ্যাত'} হয়েছে`,
      recipientIds,
      recipientType: 'student',
      category: 'Leave',
      categoryBn: 'ছুটি',
      priority: 'medium',
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number, schoolId: number): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('school_id', schoolId);

    if (error) throw error;
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: number, schoolId: number): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('school_id', schoolId)
      .eq('is_read', false)
      .eq('is_active', true);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: number,
    schoolId: number,
    limit: number = 50,
    unreadOnly: boolean = false
  ) {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }
}

export const notificationService = new NotificationService();
