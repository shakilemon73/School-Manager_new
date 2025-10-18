import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface VerificationData {
  studentId: string;
  dateOfBirth: string;
  schoolId: number;
}

interface VerificationResponse {
  success: boolean;
  token?: string;
  studentName?: string;
  studentInternalId?: number;
  message?: string;
}

export function usePublicVerification() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: VerificationData): Promise<VerificationResponse> => {
      try {
        // Step 1: Query students table to verify credentials
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('id, name, student_id, date_of_birth, school_id')
          .eq('student_id', data.studentId)
          .eq('school_id', data.schoolId)
          .single();

        if (studentError || !student) {
          return {
            success: false,
            message: "Invalid Student ID or Date of Birth. Please check and try again."
          };
        }

        // Step 2: Verify date of birth matches
        const studentDOB = new Date(student.date_of_birth).toISOString().split('T')[0];
        const inputDOB = new Date(data.dateOfBirth).toISOString().split('T')[0];

        if (studentDOB !== inputDOB) {
          return {
            success: false,
            message: "Invalid Student ID or Date of Birth. Please check and try again."
          };
        }

        // Step 3: Generate temporary access token (30 minutes validity)
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

        const { error: tokenError } = await supabase
          .from('public_access_tokens')
          .insert({
            student_id: student.id,
            token,
            purpose: 'public_portal',
            expires_at: expiresAt.toISOString(),
            school_id: data.schoolId,
            ip_address: '', // Can be enhanced with actual IP if needed
            user_agent: navigator.userAgent,
          });

        if (tokenError) {
          console.error('❌ Token creation error:', tokenError);
          return {
            success: false,
            message: "Failed to create access session. Please try again."
          };
        }

        console.log('✅ Public portal access granted for student:', student.name);

        // Step 4: Return success with token
        return {
          success: true,
          token,
          studentName: student.name,
          studentInternalId: student.id
        };

      } catch (error) {
        console.error('❌ Verification error:', error);
        return {
          success: false,
          message: "An error occurred during verification. Please try again."
        };
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "✅ Verification Successful",
          description: `Welcome, ${data.studentName}!`,
        });
      } else {
        toast({
          title: "❌ Verification Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('❌ Mutation error:', error);
      toast({
        title: "Error",
        description: "Failed to verify credentials. Please try again.",
        variant: "destructive",
      });
    },
  });
}
