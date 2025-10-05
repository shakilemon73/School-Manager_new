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
  EyeOff,
  Sparkles,
  ArrowRight
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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      // Step 1: Create school record in the database first
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .insert({
          name: data.schoolName,
          address: `${data.schoolAddress}, ${data.schoolCity}, ${data.schoolState} ${data.schoolPostalCode}`,
          phone: data.schoolPhone,
          email: data.schoolEmail,
          principal_name: data.adminFullName,
        })
        .select()
        .single();

      if (schoolError) {
        console.error('School creation error:', schoolError);
        throw new Error('Failed to create school record: ' + schoolError.message);
      }

      const schoolId = schoolData.id;

      // Step 2: Create the school admin auth account with school_id
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.adminEmail,
        password: data.adminPassword,
        options: {
          data: {
            full_name: data.adminFullName,
            phone: data.adminPhone,
            role: 'school_admin',
            school_id: schoolId, // Link to the school record
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
        // Rollback: Delete the school record if auth creation fails
        await supabase.from('schools').delete().eq('id', schoolId);
        throw authError;
      }

      toast({
        title: "স্কুল নিবন্ধন সফল!",
        description: `স্কুল আইডি: ${schoolId} | আপনার ইমেইল যাচাই করুন। একটি নিশ্চিতকরণ লিংক পাঠানো হয়েছে।`,
      });

      // Redirect to auth page after successful enrollment
      setTimeout(() => {
        setLocation('/auth');
      }, 3000);

    } catch (err: any) {
      console.error('Enrollment error:', err);
      toast({
        title: "নিবন্ধন ব্যর্থ",
        description: err.message || 'অনুগ্রহ করে আবার চেষ্টা করুন অথবা সাপোর্টে যোগাযোগ করুন।',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-slate-100/[0.03]" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-400/20 to-emerald-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-400/20 to-blue-400/20 rounded-full blur-3xl" />
      
      <div className="relative py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10 space-y-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <div className="bg-gradient-to-br from-emerald-500 to-blue-600 p-5 rounded-2xl shadow-2xl">
                  <School className="h-12 w-12 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-4 border-white dark:border-slate-900 animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                নতুন স্কুল নিবন্ধন
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                আমাদের সম্পূর্ণ স্কুল ম্যানেজমেন্ট প্ল্যাটফর্মে যোগ দিন
              </p>
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  সম্পূর্ণ বাংলা সাপোর্ট সহ আধুনিক ব্যবস্থাপনা
                </span>
              </div>
            </div>
          </div>

          {/* Enrollment Form */}
          <Card className="shadow-2xl border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl text-slate-900 dark:text-slate-100">
                    স্কুল রেজিস্ট্রেশন ফর্ম
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    সকল তথ্য সঠিকভাবে পূরণ করুন। (*) চিহ্নিত ফিল্ড বাধ্যতামূলক।
                  </CardDescription>
                </div>
                <div className="hidden md:block">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-emerald-100 to-blue-100 dark:from-emerald-900/30 dark:to-blue-900/30 rounded-full text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    <CheckCircle className="h-3 w-3" />
                    সুরক্ষিত নিবন্ধন
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* School Information Section */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-3 border-b-2 border-gradient-to-r from-emerald-500 to-blue-500">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg shadow-lg">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                      স্কুলের তথ্য
                    </h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="schoolName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        স্কুলের নাম *
                      </Label>
                      <Input
                        {...form.register('schoolName')}
                        id="schoolName"
                        placeholder="যেমন: স্প্রিংফিল্ড হাই স্কুল"
                        disabled={isLoading}
                        className="h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm"
                        data-testid="input-school-name"
                      />
                      {form.formState.errors.schoolName && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="h-1 w-1 bg-red-600 rounded-full"></span>
                          {form.formState.errors.schoolName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schoolType" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        স্কুলের ধরন *
                      </Label>
                      <Select
                        value={form.watch('schoolType')}
                        onValueChange={(value: any) => form.setValue('schoolType', value)}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50" data-testid="select-school-type">
                          <SelectValue placeholder="স্কুলের ধরন নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primary">প্রাথমিক বিদ্যালয়</SelectItem>
                          <SelectItem value="secondary">মাধ্যমিক বিদ্যালয়</SelectItem>
                          <SelectItem value="high_school">উচ্চ বিদ্যালয়</SelectItem>
                          <SelectItem value="college">কলেজ</SelectItem>
                          <SelectItem value="university">বিশ্ববিদ্যালয়</SelectItem>
                          <SelectItem value="other">অন্যান্য</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schoolEmail" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        স্কুলের ইমেইল *
                      </Label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <Input
                          {...form.register('schoolEmail')}
                          id="schoolEmail"
                          type="email"
                          placeholder="info@school.edu"
                          className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50"
                          disabled={isLoading}
                          data-testid="input-school-email"
                        />
                      </div>
                      {form.formState.errors.schoolEmail && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="h-1 w-1 bg-red-600 rounded-full"></span>
                          {form.formState.errors.schoolEmail.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="schoolAddress" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        স্কুলের ঠিকানা *
                      </Label>
                      <div className="relative group">
                        <MapPin className="absolute left-3 top-4 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <Input
                          {...form.register('schoolAddress')}
                          id="schoolAddress"
                          placeholder="সম্পূর্ণ ঠিকানা লিখুন"
                          className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50"
                          disabled={isLoading}
                          data-testid="input-school-address"
                        />
                      </div>
                      {form.formState.errors.schoolAddress && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="h-1 w-1 bg-red-600 rounded-full"></span>
                          {form.formState.errors.schoolAddress.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schoolCity" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        শহর *
                      </Label>
                      <Input
                        {...form.register('schoolCity')}
                        id="schoolCity"
                        placeholder="শহরের নাম"
                        className="h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50"
                        disabled={isLoading}
                        data-testid="input-school-city"
                      />
                      {form.formState.errors.schoolCity && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="h-1 w-1 bg-red-600 rounded-full"></span>
                          {form.formState.errors.schoolCity.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schoolState" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        রাজ্য/প্রদেশ *
                      </Label>
                      <Input
                        {...form.register('schoolState')}
                        id="schoolState"
                        placeholder="রাজ্য বা প্রদেশ"
                        className="h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50"
                        disabled={isLoading}
                        data-testid="input-school-state"
                      />
                      {form.formState.errors.schoolState && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="h-1 w-1 bg-red-600 rounded-full"></span>
                          {form.formState.errors.schoolState.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schoolPostalCode" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        পোস্টাল কোড *
                      </Label>
                      <Input
                        {...form.register('schoolPostalCode')}
                        id="schoolPostalCode"
                        placeholder="পোস্টাল কোড"
                        className="h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50"
                        disabled={isLoading}
                        data-testid="input-school-postal"
                      />
                      {form.formState.errors.schoolPostalCode && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="h-1 w-1 bg-red-600 rounded-full"></span>
                          {form.formState.errors.schoolPostalCode.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schoolPhone" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        স্কুলের ফোন *
                      </Label>
                      <div className="relative group">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <Input
                          {...form.register('schoolPhone')}
                          id="schoolPhone"
                          type="tel"
                          placeholder="+880 1XXX XXXXXX"
                          className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50"
                          disabled={isLoading}
                          data-testid="input-school-phone"
                        />
                      </div>
                      {form.formState.errors.schoolPhone && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="h-1 w-1 bg-red-600 rounded-full"></span>
                          {form.formState.errors.schoolPhone.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Administrator Information Section */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-3 border-b-2 border-gradient-to-r from-emerald-500 to-blue-500">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg shadow-lg">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                      প্রশাসকের তথ্য
                    </h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="adminFullName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        পূর্ণ নাম *
                      </Label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <Input
                          {...form.register('adminFullName')}
                          id="adminFullName"
                          placeholder="আপনার পূর্ণ নাম"
                          className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50"
                          disabled={isLoading}
                          data-testid="input-admin-name"
                        />
                      </div>
                      {form.formState.errors.adminFullName && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="h-1 w-1 bg-red-600 rounded-full"></span>
                          {form.formState.errors.adminFullName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adminEmail" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        ইমেইল ঠিকানা *
                      </Label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <Input
                          {...form.register('adminEmail')}
                          id="adminEmail"
                          type="email"
                          placeholder="your.email@school.edu"
                          className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50"
                          disabled={isLoading}
                          data-testid="input-admin-email"
                        />
                      </div>
                      {form.formState.errors.adminEmail && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="h-1 w-1 bg-red-600 rounded-full"></span>
                          {form.formState.errors.adminEmail.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adminPhone" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        ফোন নম্বর *
                      </Label>
                      <div className="relative group">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <Input
                          {...form.register('adminPhone')}
                          id="adminPhone"
                          type="tel"
                          placeholder="+880 1XXX XXXXXX"
                          className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50"
                          disabled={isLoading}
                          data-testid="input-admin-phone"
                        />
                      </div>
                      {form.formState.errors.adminPhone && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="h-1 w-1 bg-red-600 rounded-full"></span>
                          {form.formState.errors.adminPhone.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adminPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        পাসওয়ার্ড *
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <Input
                          {...form.register('adminPassword')}
                          id="adminPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="অন্তত ৮ অক্ষর"
                          className="pl-10 pr-10 h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50"
                          disabled={isLoading}
                          data-testid="input-admin-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                        </Button>
                      </div>
                      {form.formState.errors.adminPassword && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="h-1 w-1 bg-red-600 rounded-full"></span>
                          {form.formState.errors.adminPassword.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        পাসওয়ার্ড নিশ্চিত করুন *
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <Input
                          {...form.register('confirmPassword')}
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="পাসওয়ার্ড পুনরায় লিখুন"
                          className="pl-10 pr-10 h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50"
                          disabled={isLoading}
                          data-testid="input-confirm-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                        </Button>
                      </div>
                      {form.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="h-1 w-1 bg-red-600 rounded-full"></span>
                          {form.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Information Section */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-3 border-b-2 border-gradient-to-r from-emerald-500 to-blue-500">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg shadow-lg">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                      অতিরিক্ত তথ্য (ঐচ্ছিক)
                    </h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="studentCount" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        আনুমানিক শিক্ষার্থী সংখ্যা
                      </Label>
                      <Input
                        {...form.register('studentCount')}
                        id="studentCount"
                        type="number"
                        placeholder="যেমন: 500"
                        className="h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50"
                        disabled={isLoading}
                        data-testid="input-student-count"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="teacherCount" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        আনুমানিক শিক্ষক সংখ্যা
                      </Label>
                      <Input
                        {...form.register('teacherCount')}
                        id="teacherCount"
                        type="number"
                        placeholder="যেমন: 50"
                        className="h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50"
                        disabled={isLoading}
                        data-testid="input-teacher-count"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="notes" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        অতিরিক্ত নোট
                      </Label>
                      <Textarea
                        {...form.register('notes')}
                        id="notes"
                        placeholder="কোনো অতিরিক্ত তথ্য বা বিশেষ প্রয়োজনীয়তা..."
                        rows={4}
                        className="border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50 resize-none"
                        disabled={isLoading}
                        data-testid="input-notes"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6 space-y-4">
                  <Button
                    type="submit"
                    className="w-full h-14 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
                    disabled={isLoading}
                    data-testid="button-submit-enrollment"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        নিবন্ধন চলছে...
                      </>
                    ) : (
                      <>
                        স্কুল নিবন্ধন সম্পন্ন করুন
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                    ইতিমধ্যে একটি অ্যাকাউন্ট আছে?{' '}
                    <button
                      type="button"
                      onClick={() => setLocation('/auth')}
                      className="text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 font-semibold transition-colors"
                      data-testid="button-signin-link"
                    >
                      এখানে লগইন করুন
                    </button>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Info Alert */}
          <Alert className="mt-8 border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 shadow-lg">
            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-900 dark:text-blue-200 ml-2">
              <strong className="font-bold">এরপর কী হবে?</strong><br/>
              সাবমিট করার পর, আপনি একটি নিশ্চিতকরণ ইমেইল পাবেন। যাচাই করার পর, আপনি আপনার স্কুলের ড্যাশবোর্ডে প্রবেশ করতে এবং আপনার সিস্টেম সেটআপ শুরু করতে পারবেন।
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
