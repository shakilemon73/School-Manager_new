import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useDesignSystem } from "@/hooks/use-design-system";
import { useRequireSchoolId } from "@/hooks/use-require-school-id";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { db } from "@/lib/supabase";
import { Link } from "wouter";
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
  Heart
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
}

export default function StudentProfile() {
  useDesignSystem();
  const schoolId = useRequireSchoolId();
  const { user } = useSupabaseDirectAuth();

  // Fetch student profile using Supabase direct (serverless)
  const { data: student, isLoading } = useQuery<Student>({
    queryKey: ['student-profile', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id || !schoolId) {
        throw new Error('User ID and School ID are required');
      }
      return await db.getStudentProfile(user.id, schoolId);
    },
    enabled: !!user?.id && !!schoolId,
  });

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
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Profile
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