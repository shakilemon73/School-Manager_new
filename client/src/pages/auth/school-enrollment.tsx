import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  School, 
  Loader2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Lock,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const enrollmentSchema = z.object({
  // School Information
  schoolName: z.string().min(3, 'School name must be at least 3 characters'),
  schoolType: z.enum(['primary', 'secondary', 'high_school', 'college', 'university', 'other']),
  schoolAddress: z.string().min(10, 'Please provide complete address'),
  schoolCity: z.string().min(2, 'City is required'),
  schoolState: z.string().min(2, 'State/Province is required'),
  schoolPostalCode: z.string().min(3, 'Postal code is required'),
  schoolPhone: z.string().min(10, 'Valid phone number required'),
  schoolEmail: z.string().email('Valid school email required'),
  
  // Administrator Information
  adminFullName: z.string().min(3, 'Administrator name is required'),
  adminEmail: z.string().email('Valid email address required'),
  adminPhone: z.string().min(10, 'Valid phone number required'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
  
  // Additional Information
  studentCount: z.string().optional(),
  teacherCount: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ['confirmPassword'],
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

export default function SchoolEnrollment() {
  const [_, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      schoolName: '',
      schoolType: 'high_school',
      schoolAddress: '',
      schoolCity: '',
      schoolState: '',
      schoolPostalCode: '',
      schoolPhone: '',
      schoolEmail: '',
      adminFullName: '',
      adminEmail: '',
      adminPhone: '',
      adminPassword: '',
      confirmPassword: '',
      studentCount: '',
      teacherCount: '',
      notes: '',
    },
  });

  const onSubmit = async (data: EnrollmentFormData) => {
    setIsLoading(true);

    try {
      // Create the school admin account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.adminEmail,
        password: data.adminPassword,
        options: {
          data: {
            full_name: data.adminFullName,
            phone: data.adminPhone,
            role: 'school_admin',
            school_name: data.schoolName,
            school_type: data.schoolType,
            school_address: data.schoolAddress,
            school_city: data.schoolCity,
            school_state: data.schoolState,
            school_postal_code: data.schoolPostalCode,
            school_phone: data.schoolPhone,
            school_email: data.schoolEmail,
            student_count: data.studentCount,
            teacher_count: data.teacherCount,
            enrollment_notes: data.notes,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      toast({
        title: "School Enrolled Successfully!",
        description: "Please check your email to verify your account. You'll receive a confirmation link.",
      });

      // Redirect to login page after successful enrollment
      setTimeout(() => {
        setLocation('/login');
      }, 3000);

    } catch (err: any) {
      toast({
        title: "Enrollment Failed",
        description: err.message || 'Please try again or contact support.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-xl">
              <School className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Enroll Your School
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Join our comprehensive school management platform
          </p>
        </div>

        {/* Enrollment Form */}
        <Card className="shadow-2xl border-0 bg-white/95 dark:bg-slate-900/95">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-900 dark:text-slate-100">
              School Registration
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Complete the form below to register your school. All fields are required unless marked optional.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* School Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    School Information
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="schoolName">School Name *</Label>
                    <Input
                      {...form.register('schoolName')}
                      id="schoolName"
                      placeholder="e.g., Springfield High School"
                      disabled={isLoading}
                      data-testid="input-school-name"
                    />
                    {form.formState.errors.schoolName && (
                      <p className="text-sm text-red-600">{form.formState.errors.schoolName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schoolType">School Type *</Label>
                    <Select
                      value={form.watch('schoolType')}
                      onValueChange={(value: any) => form.setValue('schoolType', value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger data-testid="select-school-type">
                        <SelectValue placeholder="Select school type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary School</SelectItem>
                        <SelectItem value="secondary">Secondary School</SelectItem>
                        <SelectItem value="high_school">High School</SelectItem>
                        <SelectItem value="college">College</SelectItem>
                        <SelectItem value="university">University</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schoolEmail">School Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        {...form.register('schoolEmail')}
                        id="schoolEmail"
                        type="email"
                        placeholder="info@school.edu"
                        className="pl-10"
                        disabled={isLoading}
                        data-testid="input-school-email"
                      />
                    </div>
                    {form.formState.errors.schoolEmail && (
                      <p className="text-sm text-red-600">{form.formState.errors.schoolEmail.message}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="schoolAddress">School Address *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        {...form.register('schoolAddress')}
                        id="schoolAddress"
                        placeholder="Street address"
                        className="pl-10"
                        disabled={isLoading}
                        data-testid="input-school-address"
                      />
                    </div>
                    {form.formState.errors.schoolAddress && (
                      <p className="text-sm text-red-600">{form.formState.errors.schoolAddress.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schoolCity">City *</Label>
                    <Input
                      {...form.register('schoolCity')}
                      id="schoolCity"
                      placeholder="City"
                      disabled={isLoading}
                      data-testid="input-school-city"
                    />
                    {form.formState.errors.schoolCity && (
                      <p className="text-sm text-red-600">{form.formState.errors.schoolCity.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schoolState">State/Province *</Label>
                    <Input
                      {...form.register('schoolState')}
                      id="schoolState"
                      placeholder="State or Province"
                      disabled={isLoading}
                      data-testid="input-school-state"
                    />
                    {form.formState.errors.schoolState && (
                      <p className="text-sm text-red-600">{form.formState.errors.schoolState.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schoolPostalCode">Postal Code *</Label>
                    <Input
                      {...form.register('schoolPostalCode')}
                      id="schoolPostalCode"
                      placeholder="Postal/ZIP code"
                      disabled={isLoading}
                      data-testid="input-school-postal"
                    />
                    {form.formState.errors.schoolPostalCode && (
                      <p className="text-sm text-red-600">{form.formState.errors.schoolPostalCode.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schoolPhone">School Phone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        {...form.register('schoolPhone')}
                        id="schoolPhone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className="pl-10"
                        disabled={isLoading}
                        data-testid="input-school-phone"
                      />
                    </div>
                    {form.formState.errors.schoolPhone && (
                      <p className="text-sm text-red-600">{form.formState.errors.schoolPhone.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Administrator Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <User className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Administrator Information
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="adminFullName">Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        {...form.register('adminFullName')}
                        id="adminFullName"
                        placeholder="Your full name"
                        className="pl-10"
                        disabled={isLoading}
                        data-testid="input-admin-name"
                      />
                    </div>
                    {form.formState.errors.adminFullName && (
                      <p className="text-sm text-red-600">{form.formState.errors.adminFullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        {...form.register('adminEmail')}
                        id="adminEmail"
                        type="email"
                        placeholder="your.email@school.edu"
                        className="pl-10"
                        disabled={isLoading}
                        data-testid="input-admin-email"
                      />
                    </div>
                    {form.formState.errors.adminEmail && (
                      <p className="text-sm text-red-600">{form.formState.errors.adminEmail.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminPhone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        {...form.register('adminPhone')}
                        id="adminPhone"
                        type="tel"
                        placeholder="+1 (555) 987-6543"
                        className="pl-10"
                        disabled={isLoading}
                        data-testid="input-admin-phone"
                      />
                    </div>
                    {form.formState.errors.adminPhone && (
                      <p className="text-sm text-red-600">{form.formState.errors.adminPhone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        {...form.register('adminPassword')}
                        id="adminPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 8 characters"
                        className="pl-10 pr-10"
                        disabled={isLoading}
                        data-testid="input-admin-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {form.formState.errors.adminPassword && (
                      <p className="text-sm text-red-600">{form.formState.errors.adminPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        {...form.register('confirmPassword')}
                        id="confirmPassword"
                        type="password"
                        placeholder="Re-enter password"
                        className="pl-10"
                        disabled={isLoading}
                        data-testid="input-confirm-password"
                      />
                    </div>
                    {form.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-600">{form.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Additional Information (Optional)
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentCount">Approximate Student Count</Label>
                    <Input
                      {...form.register('studentCount')}
                      id="studentCount"
                      type="number"
                      placeholder="e.g., 500"
                      disabled={isLoading}
                      data-testid="input-student-count"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teacherCount">Approximate Teacher Count</Label>
                    <Input
                      {...form.register('teacherCount')}
                      id="teacherCount"
                      type="number"
                      placeholder="e.g., 50"
                      disabled={isLoading}
                      data-testid="input-teacher-count"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      {...form.register('notes')}
                      id="notes"
                      placeholder="Any additional information or special requirements..."
                      rows={4}
                      disabled={isLoading}
                      data-testid="input-notes"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                  disabled={isLoading}
                  data-testid="button-submit-enrollment"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting Enrollment...
                    </>
                  ) : (
                    'Complete School Enrollment'
                  )}
                </Button>

                <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-4">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setLocation('/login')}
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Alert */}
        <Alert className="mt-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-300">
            <strong>What happens next?</strong><br/>
            After submitting, you'll receive a confirmation email. Once verified, you can access your school's dashboard and begin setting up your system.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
