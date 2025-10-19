import { Request, Response, Express } from "express";
import { supabase } from "../shared/supabase";
import { requireSchoolId, getSchoolId } from "./middleware/supabase-auth";

export function registerMeetingRoutes(app: Express) {
  
  // Get all meetings for the current user
  app.get("/api/meetings", requireSchoolId, async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "অননুমোদিত। Unauthorized."
        });
      }

      // Fetch meetings from Supabase
      const { data: meetings, error } = await supabase
        .from('video_conferences')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching meetings:', error);
        return res.status(500).json({
          success: false,
          message: "মিটিং ডেটা লোড করতে ত্রুটি। Error loading meetings data."
        });
      }

      // Transform data to match frontend expectations
      const transformedMeetings = (meetings || []).map((meeting: any) => ({
        id: meeting.id,
        title: meeting.name || meeting.title,
        titleBn: meeting.name_bn || meeting.title_bn || meeting.name,
        description: meeting.description || "Video conference meeting",
        descriptionBn: meeting.description_bn || meeting.description || "ভিডিও কনফারেন্স মিটিং",
        startTime: meeting.start_time || new Date().toISOString(),
        endTime: meeting.end_time || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        status: meeting.status || "scheduled",
        participants: meeting.current_participants || 0,
        maxParticipants: meeting.max_participants || 50,
        meetingId: meeting.meeting_id || `MEET-${meeting.id}`,
        isRecording: meeting.is_recording || false,
        type: meeting.type || "class",
        duration: meeting.duration || 60,
        hostId: meeting.host || userId,
        hostName: meeting.host_name || req.user?.name || "Host",
        roomId: meeting.room_id || `room-${meeting.id}`,
        createdAt: meeting.created_at
      }));

      return res.json({
        success: true,
        data: transformedMeetings
      });

    } catch (error) {
      console.error('Get meetings error:', error);
      return res.status(500).json({
        success: false,
        message: "মিটিং লোড করতে ত্রুটি। Error loading meetings."
      });
    }
  });

  // Create a new meeting
  app.post("/api/meetings", requireSchoolId, async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "অননুমোদিত। Unauthorized."
        });
      }

      const {
        title,
        titleBn,
        description,
        descriptionBn,
        meetingType,
        scheduledTime,
        duration,
        maxParticipants
      } = req.body;

      // Create meeting in Supabase
      const { data: newMeeting, error } = await supabase
        .from('video_conferences')
        .insert({
          name: title,
          name_bn: titleBn,
          description: description,
          description_bn: descriptionBn,
          type: meetingType,
          start_time: scheduledTime,
          duration: duration,
          max_participants: maxParticipants || 50,
          host: userId,
          host_name: req.user?.name || "Host",
          meeting_id: `MEET_${Date.now()}`,
          room_id: `room_${Date.now()}`,
          status: 'scheduled',
          current_participants: 0,
          is_recording: false,
          school_id: schoolId
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating meeting:', error);
        return res.status(500).json({
          success: false,
          message: "মিটিং তৈরি করতে ত্রুটি। Error creating meeting."
        });
      }

      return res.json({
        success: true,
        data: newMeeting,
        message: "মিটিং সফলভাবে তৈরি হয়েছে। Meeting created successfully."
      });

    } catch (error) {
      console.error('Create meeting error:', error);
      return res.status(500).json({
        success: false,
        message: "মিটিং তৈরি করতে ত্রুটি। Error creating meeting."
      });
    }
  });

  // Update meeting status
  app.patch("/api/meetings/:id/status", requireSchoolId, async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id;
      const { id } = req.params;
      const { status } = req.body;

      const { data: updatedMeeting, error } = await supabase
        .from('video_conferences')
        .update({ status })
        .eq('id', id)
        .eq('school_id', schoolId)
        .select()
        .single();

      if (error) {
        console.error('Error updating meeting status:', error);
        return res.status(500).json({
          success: false,
          message: "মিটিং স্ট্যাটাস আপডেট করতে ত্রুটি। Error updating meeting status."
        });
      }

      return res.json({
        success: true,
        data: updatedMeeting,
        message: "মিটিং স্ট্যাটাস আপডেট হয়েছে। Meeting status updated."
      });

    } catch (error) {
      console.error('Update meeting status error:', error);
      return res.status(500).json({
        success: false,
        message: "মিটিং স্ট্যাটাস আপডেট করতে ত্রুটি। Error updating meeting status."
      });
    }
  });

  // Get meeting statistics
  app.get("/api/meetings/stats", requireSchoolId, async (req: Request, res: Response) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id;
      const { data: meetings, error } = await supabase
        .from('video_conferences')
        .select('*')
        .eq('school_id', schoolId);

      if (error) {
        console.error('Error fetching meeting stats:', error);
        return res.status(500).json({
          success: false,
          message: "পরিসংখ্যান লোড করতে ত্রুটি। Error loading statistics."
        });
      }

      const stats = {
        totalMeetings: meetings?.length || 0,
        scheduledMeetings: meetings?.filter(m => m.status === 'scheduled').length || 0,
        ongoingMeetings: meetings?.filter(m => m.status === 'ongoing').length || 0,
        completedMeetings: meetings?.filter(m => m.status === 'completed').length || 0,
        totalParticipants: meetings?.reduce((sum, m) => sum + (m.current_participants || 0), 0) || 0
      };

      return res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get meeting stats error:', error);
      return res.status(500).json({
        success: false,
        message: "পরিসংখ্যান লোড করতে ত্রুটি। Error loading statistics."
      });
    }
  });
}