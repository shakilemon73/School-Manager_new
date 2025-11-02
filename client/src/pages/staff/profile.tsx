import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useDesignSystem } from "@/hooks/use-design-system";
import { useRequireSchoolId } from "@/hooks/use-require-school-id";
import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { supabase } from "@/lib/supabase";
import { Link } from "wouter";
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  Edit,
  Camera,
  Download,
  IdCard,
  DollarSign,
  Clock
} from "lucide-react";

interface Staff {
  id: number;
  name: string;
  nameInBangla?: string;
  staffId: string;
  department: string;
  designation: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  phone: string;
  email: string;
  joinDate?: string;
  salary?: number;
  schoolId: number;
  status: string;
  photo?: string;
  createdAt?: string;
  user_id?: string;
}

export default function StaffProfile() {
  useDesignSystem();
  const schoolId = useRequireSchoolId();
  const { user } = useSupabaseDirectAuth();

  // Fetch staff profile using Supabase direct
  const { data: staff, isLoading } = useQuery<Staff>({
    queryKey: ['staff-profile', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id || !schoolId) {
        throw new Error('User ID and School ID are required');
      }
      
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user.id)
        .eq('schoolId', schoolId)
        .single();
      
      if (error) {
        console.error('Error fetching staff profile:', error);
        throw error;
      }
      
      return data;
    },
    enabled: !!user?.id && !!schoolId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600" data-testid="loading-spinner"></div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="max-w-md" data-testid="card-no-profile">
          <CardContent className="text-center p-8">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2" data-testid="text-no-profile-title">
              Staff Profile Not Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4" data-testid="text-no-profile-desc">
              Your staff profile information is not available. Please contact the administration.
            </p>
            <Link href="/staff">
              <Button data-testid="button-back-portal">Back to Portal</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-green-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/staff">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Portal
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid="text-page-title">
                  Profile / প্রোফাইল
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" data-testid="button-download">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="shadow-xl border-2 border-green-200" data-testid="card-profile-photo">
              <CardContent className="p-6 text-center">
                <div className="relative inline-block">
                  <Avatar className="h-40 w-40 border-4 border-green-200" data-testid="avatar-staff">
                    <AvatarImage src={staff.photo} alt={staff.name} />
                    <AvatarFallback className="bg-gradient-to-r from-green-600 to-teal-600 text-white text-4xl">
                      {staff.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute bottom-0 right-0 bg-green-600 hover:bg-green-700 text-white rounded-full p-2 shadow-lg" data-testid="button-change-photo">
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-4" data-testid="text-name">
                  {staff.name}
                </h2>
                {staff.nameInBangla && (
                  <p className="text-lg text-gray-600 dark:text-gray-400 mt-1" data-testid="text-name-bn">
                    {staff.nameInBangla}
                  </p>
                )}
                <div className="mt-4 space-y-2">
                  <Badge className="bg-green-100 text-green-800" data-testid="badge-staff-id">
                    Staff ID: {staff.staffId}
                  </Badge>
                  <Badge 
                    className={staff.status === 'active' ? 'bg-green-500' : 'bg-gray-500'} 
                    data-testid="badge-status"
                  >
                    {staff.status === 'active' ? 'Active / সক্রিয়' : 'Inactive / নিষ্ক্রিয়'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="shadow-xl" data-testid="card-personal-info">
              <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center" data-testid="text-personal-title">
                  <User className="h-5 w-5 mr-2" />
                  Personal Information / ব্যক্তিগত তথ্য
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Full Name / পূর্ণ নাম
                    </label>
                    <p className="text-base font-semibold text-gray-900 dark:text-white mt-1" data-testid="text-full-name">
                      {staff.name}
                    </p>
                  </div>

                  {staff.nameInBangla && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Name in Bangla / বাংলায় নাম
                      </label>
                      <p className="text-base font-semibold text-gray-900 dark:text-white mt-1" data-testid="text-name-bangla">
                        {staff.nameInBangla}
                      </p>
                    </div>
                  )}

                  {staff.dateOfBirth && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Date of Birth / জন্ম তারিখ
                      </label>
                      <p className="text-base font-semibold text-gray-900 dark:text-white mt-1" data-testid="text-dob">
                        {new Date(staff.dateOfBirth).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {staff.gender && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Gender / লিঙ্গ
                      </label>
                      <p className="text-base font-semibold text-gray-900 dark:text-white mt-1" data-testid="text-gender">
                        {staff.gender}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Employment Information */}
            <Card className="shadow-xl" data-testid="card-employment-info">
              <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center" data-testid="text-employment-title">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Employment Information / চাকরির তথ্য
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                      <IdCard className="h-4 w-4 mr-1" />
                      Staff ID / কর্মচারী আইডি
                    </label>
                    <p className="text-base font-semibold text-gray-900 dark:text-white mt-1" data-testid="text-staff-id">
                      {staff.staffId}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                      <Building2 className="h-4 w-4 mr-1" />
                      Department / বিভাগ
                    </label>
                    <p className="text-base font-semibold text-gray-900 dark:text-white mt-1" data-testid="text-department">
                      {staff.department}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                      <Briefcase className="h-4 w-4 mr-1" />
                      Designation / পদবি
                    </label>
                    <p className="text-base font-semibold text-gray-900 dark:text-white mt-1" data-testid="text-designation">
                      {staff.designation}
                    </p>
                  </div>

                  {staff.joinDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Join Date / যোগদানের তারিখ
                      </label>
                      <p className="text-base font-semibold text-gray-900 dark:text-white mt-1" data-testid="text-join-date">
                        {new Date(staff.joinDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {staff.salary && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        Monthly Salary / মাসিক বেতন
                      </label>
                      <p className="text-base font-semibold text-gray-900 dark:text-white mt-1" data-testid="text-salary">
                        ৳{staff.salary.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="shadow-xl" data-testid="card-contact-info">
              <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center" data-testid="text-contact-title">
                  <Phone className="h-5 w-5 mr-2" />
                  Contact Information / যোগাযোগের তথ্য
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      Phone Number / ফোন নম্বর
                    </label>
                    <p className="text-base font-semibold text-gray-900 dark:text-white mt-1" data-testid="text-phone">
                      {staff.phone}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      Email Address / ইমেল ঠিকানা
                    </label>
                    <p className="text-base font-semibold text-gray-900 dark:text-white mt-1 break-all" data-testid="text-email">
                      {staff.email}
                    </p>
                  </div>

                  {staff.address && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        Address / ঠিকানা
                      </label>
                      <p className="text-base font-semibold text-gray-900 dark:text-white mt-1" data-testid="text-address">
                        {staff.address}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
