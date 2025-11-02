import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDesignSystem } from "@/hooks/use-design-system";
import { useRequireSchoolId } from "@/hooks/use-require-school-id";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Users,
  Edit,
  Camera,
  Download,
  School,
  IdCard,
  Heart,
  Loader2
} from "lucide-react";

interface Student {
  id: number;
  name: string;
  nameInBangla?: string;
  studentId: string;
  class: string;
  section: string;
  rollNumber: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  fatherName?: string;
  fatherNameInBangla?: string;
  motherName?: string;
  motherNameInBangla?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  presentAddress?: string;
  permanentAddress?: string;
  village?: string;
  postOffice?: string;
  thana?: string;
  district?: string;
  division?: string;
  phone?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  photo?: string;
  idCardIssueDate?: string;
  idCardValidUntil?: string;
  status: string;
  createdAt: string;
  school_id: number;
}

// Validation schema for editable fields
const editProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  nameInBangla: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  presentAddress: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

export default function StudentProfile() {
  useDesignSystem();
  const schoolId = useRequireSchoolId();
  const { user } = useSupabaseDirectAuth();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch student profile using Supabase direct (serverless)
  const { data: student, isLoading } = useQuery<Student>({
    queryKey: ['student-profile', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id || !schoolId) {
        throw new Error('User ID and School ID are required');
      }
      
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .eq('school_id', schoolId)
        .single();
      
      if (error) throw error;
      
      // Convert snake_case to camelCase
      return {
        id: data.id,
        name: data.name,
        nameInBangla: data.name_in_bangla,
        studentId: data.student_id,
        class: data.class,
        section: data.section,
        rollNumber: data.roll_number,
        dateOfBirth: data.date_of_birth,
        gender: data.gender,
        bloodGroup: data.blood_group,
        fatherName: data.father_name,
        fatherNameInBangla: data.father_name_in_bangla,
        motherName: data.mother_name,
        motherNameInBangla: data.mother_name_in_bangla,
        guardianName: data.guardian_name,
        guardianPhone: data.guardian_phone,
        guardianRelation: data.guardian_relation,
        presentAddress: data.present_address,
        permanentAddress: data.permanent_address,
        village: data.village,
        postOffice: data.post_office,
        thana: data.thana,
        district: data.district,
        division: data.division,
        phone: data.phone,
        email: data.email,
        emergencyContactName: data.emergency_contact_name,
        emergencyContactRelation: data.emergency_contact_relation,
        emergencyContactPhone: data.emergency_contact_phone,
        photo: data.photo,
        idCardIssueDate: data.id_card_issue_date,
        idCardValidUntil: data.id_card_valid_until,
        status: data.status,
        createdAt: data.created_at,
        school_id: data.school_id,
      } as Student;
    },
    enabled: !!user?.id && !!schoolId,
  });

  // Fetch school settings for PDF header
  const { data: schoolSettings } = useQuery({
    queryKey: ['school-settings', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  // Form setup
  const form = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: student?.name || "",
      nameInBangla: student?.nameInBangla || "",
      phone: student?.phone || "",
      email: student?.email || "",
      presentAddress: student?.presentAddress || "",
      emergencyContactName: student?.emergencyContactName || "",
      emergencyContactPhone: student?.emergencyContactPhone || "",
    },
  });

  // Reset form when student data loads
  useState(() => {
    if (student) {
      form.reset({
        name: student.name,
        nameInBangla: student.nameInBangla || "",
        phone: student.phone || "",
        email: student.email || "",
        presentAddress: student.presentAddress || "",
        emergencyContactName: student.emergencyContactName || "",
        emergencyContactPhone: student.emergencyContactPhone || "",
      });
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: EditProfileFormData) => {
      if (!student?.id || !schoolId) {
        throw new Error('Student ID or School ID missing');
      }

      // Convert camelCase to snake_case for Supabase
      const updateData = {
        name: data.name,
        name_in_bangla: data.nameInBangla || null,
        phone: data.phone || null,
        email: data.email || null,
        present_address: data.presentAddress || null,
        emergency_contact_name: data.emergencyContactName || null,
        emergency_contact_phone: data.emergencyContactPhone || null,
      };

      const { data: updatedStudent, error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', student.id)
        .eq('school_id', schoolId)
        .select()
        .single();

      if (error) throw error;
      return updatedStudent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Download PDF function
  const handleDownloadPDF = async () => {
    if (!student || !schoolSettings) {
      toast({
        title: "Error",
        description: "Student or school information not available",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;

      // Add school header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(schoolSettings.name || "School Management System", pageWidth / 2, yPos, { align: "center" });
      
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      if (schoolSettings.address) {
        doc.text(schoolSettings.address, pageWidth / 2, yPos, { align: "center" });
        yPos += 6;
      }
      if (schoolSettings.phone || schoolSettings.email) {
        doc.text(
          `${schoolSettings.phone || ""} ${schoolSettings.email ? " | " + schoolSettings.email : ""}`, 
          pageWidth / 2, 
          yPos, 
          { align: "center" }
        );
        yPos += 10;
      }

      // Add horizontal line
      doc.setLineWidth(0.5);
      doc.line(10, yPos, pageWidth - 10, yPos);
      yPos += 10;

      // Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Student Profile", pageWidth / 2, yPos, { align: "center" });
      yPos += 12;

      // Personal Information Section
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Personal Information", 15, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const personalInfo = [
        ["Full Name:", student.name],
        ["Name (Bangla):", student.nameInBangla || "N/A"],
        ["Student ID:", student.studentId],
        ["Date of Birth:", student.dateOfBirth || "N/A"],
        ["Gender:", student.gender || "N/A"],
        ["Blood Group:", student.bloodGroup || "N/A"],
        ["Email:", student.email || "N/A"],
        ["Phone:", student.phone || "N/A"],
      ];

      personalInfo.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(value, 65, yPos);
        yPos += 7;
      });

      yPos += 5;

      // Academic Information Section
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Academic Information", 15, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const academicInfo = [
        ["Class:", student.class],
        ["Section:", student.section],
        ["Roll Number:", student.rollNumber],
        ["Status:", student.status],
      ];

      academicInfo.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(value, 65, yPos);
        yPos += 7;
      });

      yPos += 5;

      // Family Information Section
      if (student.fatherName || student.motherName || student.guardianName) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Family Information", 15, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const familyInfo = [
          ["Father's Name:", student.fatherName || "N/A"],
          ["Father's Name (Bangla):", student.fatherNameInBangla || "N/A"],
          ["Mother's Name:", student.motherName || "N/A"],
          ["Mother's Name (Bangla):", student.motherNameInBangla || "N/A"],
          ["Guardian Name:", student.guardianName || "N/A"],
          ["Guardian Phone:", student.guardianPhone || "N/A"],
          ["Guardian Relation:", student.guardianRelation || "N/A"],
        ];

        familyInfo.forEach(([label, value]) => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFont("helvetica", "bold");
          doc.text(label, 20, yPos);
          doc.setFont("helvetica", "normal");
          doc.text(value, 70, yPos);
          yPos += 7;
        });

        yPos += 5;
      }

      // Emergency Contact Section
      if (student.emergencyContactName) {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Emergency Contact", 15, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const emergencyInfo = [
          ["Name:", student.emergencyContactName],
          ["Relation:", student.emergencyContactRelation || "N/A"],
          ["Phone:", student.emergencyContactPhone || "N/A"],
        ];

        emergencyInfo.forEach(([label, value]) => {
          doc.setFont("helvetica", "bold");
          doc.text(label, 20, yPos);
          doc.setFont("helvetica", "normal");
          doc.text(value, 70, yPos);
          yPos += 7;
        });

        yPos += 5;
      }

      // Address Section
      if (student.presentAddress || student.permanentAddress) {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Address Information", 15, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        if (student.presentAddress) {
          doc.setFont("helvetica", "bold");
          doc.text("Present Address:", 20, yPos);
          yPos += 7;
          doc.setFont("helvetica", "normal");
          const addressLines = doc.splitTextToSize(student.presentAddress, pageWidth - 50);
          addressLines.forEach((line: string) => {
            doc.text(line, 25, yPos);
            yPos += 6;
          });
          yPos += 3;
        }

        if (student.permanentAddress) {
          doc.setFont("helvetica", "bold");
          doc.text("Permanent Address:", 20, yPos);
          yPos += 7;
          doc.setFont("helvetica", "normal");
          const addressLines = doc.splitTextToSize(student.permanentAddress, pageWidth - 50);
          addressLines.forEach((line: string) => {
            doc.text(line, 25, yPos);
            yPos += 6;
          });
        }
      }

      // Footer
      const footerY = pageHeight - 15;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(
        `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        pageWidth / 2,
        footerY,
        { align: "center" }
      );

      // Save PDF
      doc.save(`Student_Profile_${student.studentId}.pdf`);

      toast({
        title: "Success",
        description: "Profile PDF downloaded successfully",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const onSubmit = (data: EditProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center p-8">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Student Profile Not Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your student profile information is not available. Please contact the administration.
            </p>
            <Link href="/student">
              <Button>Back to Portal</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-blue-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/student">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Portal
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  My Profile
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  আমার প্রোফাইল • Personal Information
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Edit Profile Dialog */}
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    data-testid="button-edit-profile"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent 
                  className="max-w-2xl max-h-[90vh] overflow-y-auto"
                  data-testid="dialog-edit-profile"
                >
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                      Update your personal information. Read-only fields cannot be edited.
                    </DialogDescription>
                  </DialogHeader>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Read-only Information */}
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                          Read-Only Information (Admin Only)
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Student ID:</span>
                            <span className="ml-2 font-medium">{student.studentId}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Class:</span>
                            <span className="ml-2 font-medium">{student.class}-{student.section}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Roll Number:</span>
                            <span className="ml-2 font-medium">{student.rollNumber}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Date of Birth:</span>
                            <span className="ml-2 font-medium">{student.dateOfBirth || "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Editable Fields */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                          Personal Information
                        </h3>

                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter your full name" 
                                  {...field} 
                                  data-testid="input-edit-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="nameInBangla"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name in Bangla (নাম বাংলায়)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="আপনার নাম বাংলায় লিখুন" 
                                  {...field} 
                                  data-testid="input-edit-nameInBangla"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="01XXXXXXXXX" 
                                    {...field} 
                                    data-testid="input-edit-phone"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="email"
                                    placeholder="your.email@example.com" 
                                    {...field} 
                                    data-testid="input-edit-email"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="presentAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Present Address</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter your current address"
                                  rows={3}
                                  {...field} 
                                  data-testid="input-edit-presentAddress"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Emergency Contact */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                          Emergency Contact
                        </h3>

                        <FormField
                          control={form.control}
                          name="emergencyContactName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Emergency Contact Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Contact person name" 
                                  {...field} 
                                  data-testid="input-edit-emergencyContactName"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="emergencyContactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Emergency Contact Phone</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="01XXXXXXXXX" 
                                  {...field} 
                                  data-testid="input-edit-emergencyContactPhone"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end space-x-3 pt-4 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditDialogOpen(false)}
                          disabled={updateProfileMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                          data-testid="button-save-profile"
                        >
                          {updateProfileMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              {/* Download Profile Button */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                data-testid="button-download-profile"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download Profile
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="relative inline-block mb-6">
                  <Avatar className="h-32 w-32 mx-auto border-4 border-white shadow-lg">
                    <AvatarImage src={student.photo} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-3xl font-bold">
                      {student.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    className="absolute bottom-0 right-0 rounded-full h-8 w-8 p-0 shadow-lg"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {student.name}
                </h2>
                {student.nameInBangla && (
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                    {student.nameInBangla}
                  </p>
                )}
                
                <div className="flex justify-center space-x-2 mb-6">
                  <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    Student
                  </Badge>
                  <Badge variant="outline" className={student.status === 'active' ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}>
                    {student.status}
                  </Badge>
                </div>

                {/* Quick Info */}
                <div className="space-y-3 text-left">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <IdCard className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Student ID</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{student.studentId}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <School className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Class & Section</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Class {student.class}-{student.section} • Roll: {student.rollNumber}
                      </p>
                    </div>
                  </div>
                  
                  {student.bloodGroup && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <Heart className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Blood Group</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{student.bloodGroup}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <span>Personal Information</span>
                  <span className="text-sm text-gray-500">• ব্যক্তিগত তথ্য</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                    <p className="text-gray-900 dark:text-white font-medium">{student.name}</p>
                    {student.nameInBangla && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{student.nameInBangla}</p>
                    )}
                  </div>
                  
                  {student.dateOfBirth && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                      <p className="text-gray-900 dark:text-white font-medium">{student.dateOfBirth}</p>
                    </div>
                  )}
                  
                  {student.gender && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
                      <p className="text-gray-900 dark:text-white font-medium">{student.gender}</p>
                    </div>
                  )}
                  
                  {student.email && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                      <p className="text-gray-900 dark:text-white font-medium">{student.email}</p>
                    </div>
                  )}
                  
                  {student.phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                      <p className="text-gray-900 dark:text-white font-medium">{student.phone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Family Information */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <span>Family Information</span>
                  <span className="text-sm text-gray-500">• পারিবারিক তথ্য</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {student.fatherName && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Father's Information</h4>
                      <p className="font-medium text-gray-900 dark:text-white">{student.fatherName}</p>
                      {student.fatherNameInBangla && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{student.fatherNameInBangla}</p>
                      )}
                    </div>
                  )}
                  
                  {student.motherName && (
                    <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                      <h4 className="font-semibold text-pink-900 dark:text-pink-300 mb-2">Mother's Information</h4>
                      <p className="font-medium text-gray-900 dark:text-white">{student.motherName}</p>
                      {student.motherNameInBangla && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{student.motherNameInBangla}</p>
                      )}
                    </div>
                  )}
                  
                  {student.guardianName && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">Guardian Information</h4>
                      <p className="font-medium text-gray-900 dark:text-white">{student.guardianName}</p>
                      {student.guardianRelation && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">Relation: {student.guardianRelation}</p>
                      )}
                      {student.guardianPhone && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">Phone: {student.guardianPhone}</p>
                      )}
                    </div>
                  )}
                  
                  {student.emergencyContactName && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2">Emergency Contact</h4>
                      <p className="font-medium text-gray-900 dark:text-white">{student.emergencyContactName}</p>
                      {student.emergencyContactRelation && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">Relation: {student.emergencyContactRelation}</p>
                      )}
                      {student.emergencyContactPhone && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">Phone: {student.emergencyContactPhone}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  <span>Address Information</span>
                  <span className="text-sm text-gray-500">• ঠিকানা</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {student.presentAddress && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Present Address</label>
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-gray-900 dark:text-white">{student.presentAddress}</p>
                      </div>
                    </div>
                  )}
                  
                  {student.permanentAddress && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Permanent Address</label>
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-gray-900 dark:text-white">{student.permanentAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {(student.village || student.postOffice || student.thana || student.district || student.division) && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Location Details</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {student.village && (
                        <div>
                          <p className="text-xs text-gray-500">Village</p>
                          <p className="font-medium text-gray-900 dark:text-white">{student.village}</p>
                        </div>
                      )}
                      {student.postOffice && (
                        <div>
                          <p className="text-xs text-gray-500">Post Office</p>
                          <p className="font-medium text-gray-900 dark:text-white">{student.postOffice}</p>
                        </div>
                      )}
                      {student.thana && (
                        <div>
                          <p className="text-xs text-gray-500">Thana</p>
                          <p className="font-medium text-gray-900 dark:text-white">{student.thana}</p>
                        </div>
                      )}
                      {student.district && (
                        <div>
                          <p className="text-xs text-gray-500">District</p>
                          <p className="font-medium text-gray-900 dark:text-white">{student.district}</p>
                        </div>
                      )}
                      {student.division && (
                        <div>
                          <p className="text-xs text-gray-500">Division</p>
                          <p className="font-medium text-gray-900 dark:text-white">{student.division}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ID Card Information */}
            {(student.idCardIssueDate || student.idCardValidUntil) && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <IdCard className="h-5 w-5 text-orange-600" />
                    <span>ID Card Information</span>
                    <span className="text-sm text-gray-500">• পরিচয়পত্র</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {student.idCardIssueDate && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Issue Date</label>
                        <p className="text-gray-900 dark:text-white font-medium">{student.idCardIssueDate}</p>
                      </div>
                    )}
                    {student.idCardValidUntil && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Valid Until</label>
                        <p className="text-gray-900 dark:text-white font-medium">{student.idCardValidUntil}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
