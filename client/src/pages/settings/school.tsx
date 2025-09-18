import React, { useState, useRef } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ResponsivePageLayout } from '@/components/layout/responsive-page-layout';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseSettings } from '@/hooks/use-supabase-settings';
import { 
  Upload, 
  Download, 
  RefreshCw, 
  XCircle, 
  Database, 
  Activity, 
  Settings, 
  Palette, 
  Globe, 
  Bell, 
  Lock,
  Loader2
} from 'lucide-react';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Supabase-only schemas (no fallback data)
const schoolInfoSchema = z.object({
  name: z.string().min(2, { message: "স্কুলের নাম আবশ্যক" }),
  nameInBangla: z.string().min(2, { message: "বাংলায় স্কুলের নাম আবশ্যক" }),
  address: z.string().min(5, { message: "ঠিকানা আবশ্যক" }),
  addressInBangla: z.string().min(5, { message: "বাংলা ঠিকানা আবশ্যক" }),
  email: z.string().email({ message: "সঠিক ইমেইল প্রদান করুন" }),
  phone: z.string().min(10, { message: "সঠিক ফোন নম্বর প্রদান করুন" }),
  website: z.string().url({ message: "সঠিক ওয়েবসাইট URL প্রদান করুন" }).optional().or(z.literal("")),
  schoolType: z.enum(["school", "college", "madrasha", "nurani"]),
  establishmentYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()),
  eiin: z.string().min(5, { message: "সঠিক EIIN নম্বর প্রদান করুন" }),
  registrationNumber: z.string().optional(),
  principalName: z.string().min(2, { message: "প্রিন্সিপালের নাম আবশ্যক" }),
  principalPhone: z.string().min(10, { message: "সঠিক ফোন নম্বর প্রদান করুন" }),
  description: z.string().optional(),
  descriptionInBangla: z.string().optional(),
});

const brandingSchema = z.object({
  primaryColor: z.string().min(4, { message: "রঙ নির্বাচন করুন" }),
  secondaryColor: z.string().min(4, { message: "রঙ নির্বাচন করুন" }),
  accentColor: z.string().min(4, { message: "রঙ নির্বাচন করুন" }),
  motto: z.string().optional(),
  mottoBn: z.string().optional(),
  useWatermark: z.boolean(),
  useLetterhead: z.boolean(),
});

const systemSettingsSchema = z.object({
  timezone: z.string(),
  language: z.enum(["bn", "en"]),
  dateFormat: z.string(),
  currency: z.string(),
  academicYearStart: z.string(),
  weekStartsOn: z.enum(["sunday", "monday"]),
  enableNotifications: z.boolean(),
  enableSMS: z.boolean(),
  enableEmail: z.boolean(),
  autoBackup: z.boolean(),
  dataRetention: z.coerce.number().min(30).max(3650),
  maxStudents: z.coerce.number().min(50).max(10000),
  maxTeachers: z.coerce.number().min(5).max(500),
  allowOnlinePayments: z.boolean(),
});

export default function SchoolSupabaseSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Complete Supabase settings hook with all functionality
  const {
    schoolSettings,
    systemStats,
    settingsLoading,
    statsLoading,
    updateSettingsMutation,
    uploadFileMutation,
    createBackupMutation,
    restoreDataMutation,
    deleteAllDataMutation,
    isUpdating,
    isUploading,
    isBackingUp,
    isRestoring,
    isDeleting
  } = useSupabaseSettings();

  // File upload handlers for Supabase storage
  const handleFileUpload = async (type: 'logo' | 'banner' | 'letterhead') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        await uploadFileMutation.mutateAsync({
          type,
          fileName: file.name,
          fileData: base64Data
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Backup and restore handlers
  const handleCreateBackup = async () => {
    await createBackupMutation.mutateAsync();
  };

  const handleRestoreData = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const backupData = JSON.parse(reader.result as string);
          await restoreDataMutation.mutateAsync(backupData);
        } catch (error) {
          toast({
            title: "ত্রুটি",
            description: "ব্যাকআপ ফাইল পড়তে সমস্যা হয়েছে",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleDeleteAllData = async () => {
    if (confirm('আপনি কি নিশ্চিত যে সব ডেটা মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।')) {
      await deleteAllDataMutation.mutateAsync();
    }
  };

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Form handlers with Supabase data only
  const schoolInfoForm = useForm<z.infer<typeof schoolInfoSchema>>({
    resolver: zodResolver(schoolInfoSchema),
    defaultValues: {
      name: '',
      nameInBangla: '',
      address: '',
      addressInBangla: '',
      email: '',
      phone: '',
      website: '',
      schoolType: 'school',
      establishmentYear: new Date().getFullYear(),
      eiin: '',
      registrationNumber: '',
      principalName: '',
      principalPhone: '',
      description: '',
      descriptionInBangla: '',
    },
  });

  // Update form values when Supabase data loads
  React.useEffect(() => {
    if (schoolSettings) {
      schoolInfoForm.reset({
        name: schoolSettings.name || '',
        nameInBangla: schoolSettings.nameInBangla || '',
        address: schoolSettings.address || '',
        addressInBangla: schoolSettings.addressInBangla || '',
        email: schoolSettings.email || '',
        phone: schoolSettings.phone || '',
        website: schoolSettings.website || '',
        schoolType: schoolSettings.schoolType || 'school',
        establishmentYear: schoolSettings.establishmentYear || new Date().getFullYear(),
        eiin: schoolSettings.eiin || '',
        registrationNumber: schoolSettings.registrationNumber || '',
        principalName: schoolSettings.principalName || '',
        principalPhone: schoolSettings.principalPhone || '',
        description: schoolSettings.description || '',
        descriptionInBangla: schoolSettings.descriptionInBangla || '',
      });
    }
  }, [schoolSettings, schoolInfoForm]);

  const brandingForm = useForm<z.infer<typeof brandingSchema>>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      accentColor: '#F59E0B',
      motto: '',
      mottoBn: '',
      useWatermark: false,
      useLetterhead: false,
    },
  });

  const systemSettingsForm = useForm<z.infer<typeof systemSettingsSchema>>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: {
      timezone: 'Asia/Dhaka',
      language: 'bn',
      dateFormat: 'DD/MM/YYYY',
      currency: 'BDT',
      academicYearStart: '01/01',
      weekStartsOn: 'sunday',
      enableNotifications: false,
      enableSMS: false,
      enableEmail: false,
      autoBackup: false,
      dataRetention: 365,
      maxStudents: 500,
      maxTeachers: 50,
      allowOnlinePayments: false,
    },
  });

  // Update branding form when Supabase data loads
  React.useEffect(() => {
    if (schoolSettings) {
      brandingForm.reset({
        primaryColor: schoolSettings.primaryColor || '#3B82F6',
        secondaryColor: schoolSettings.secondaryColor || '#10B981',
        accentColor: schoolSettings.accentColor || '#F59E0B',
        motto: schoolSettings.motto || '',
        mottoBn: schoolSettings.mottoBn || '',
        useWatermark: schoolSettings.useWatermark || false,
        useLetterhead: schoolSettings.useLetterhead || false,
      });
    }
  }, [schoolSettings, brandingForm]);

  // Update system settings form when Supabase data loads
  React.useEffect(() => {
    if (schoolSettings) {
      systemSettingsForm.reset({
        timezone: schoolSettings.timezone || 'Asia/Dhaka',
        language: schoolSettings.language || 'bn',
        dateFormat: schoolSettings.dateFormat || 'DD/MM/YYYY',
        currency: schoolSettings.currency || 'BDT',
        academicYearStart: schoolSettings.academicYearStart || '01/01',
        weekStartsOn: schoolSettings.weekStartsOn || 'sunday',
        enableNotifications: schoolSettings.enableNotifications || false,
        enableSMS: schoolSettings.enableSMS || false,
        enableEmail: schoolSettings.enableEmail || false,
        autoBackup: schoolSettings.autoBackup || false,
        dataRetention: schoolSettings.dataRetention || 365,
        maxStudents: schoolSettings.maxStudents || 500,
        maxTeachers: schoolSettings.maxTeachers || 50,
        allowOnlinePayments: schoolSettings.allowOnlinePayments || false,
      });
    }
  }, [schoolSettings, systemSettingsForm]);

  // Form submission handlers for Supabase updates
  const onSchoolInfoSubmit = async (data: z.infer<typeof schoolInfoSchema>) => {
    await updateSettingsMutation.mutateAsync(data);
  };

  const onBrandingSubmit = async (data: z.infer<typeof brandingSchema>) => {
    await updateSettingsMutation.mutateAsync(data);
  };

  const onSystemSettingsSubmit = async (data: z.infer<typeof systemSettingsSchema>) => {
    await updateSettingsMutation.mutateAsync(data);
  };

  // Show loading state only while initially fetching from Supabase
  if (settingsLoading) {
    return (
      <AppShell>
        <ResponsivePageLayout title="স্কুল সেটিংস" description="সুপাবেস ডেটাবেস ব্যবহার করে আপনার স্কুলের তথ্য এবং সেটিংস পরিচালনা করুন">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-lg">সুপাবেস থেকে ডেটা লোড হচ্ছে...</p>
            </div>
          </div>
        </ResponsivePageLayout>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ResponsivePageLayout title="স্কুল সেটিংস" description="সুপাবেস ডেটাবেস ব্যবহার করে আপনার স্কুলের তথ্য এবং সেটিংস পরিচালনা করুন">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">স্কুল সেটিংস</h1>
            <p className="text-muted-foreground">
              সুপাবেস ডেটাবেস ব্যবহার করে আপনার স্কুলের তথ্য এবং সেটিংস পরিচালনা করুন
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                মৌলিক তথ্য
              </TabsTrigger>
              <TabsTrigger value="branding" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                ব্র্যান্ডিং
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                সেটিংস
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                এডভান্স
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    মৌলিক তথ্য
                  </CardTitle>
                  <CardDescription>
                    সুপাবেস ডেটাবেসে সংরক্ষিত স্কুলের মৌলিক তথ্য আপডেট করুন
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...schoolInfoForm}>
                    <form onSubmit={schoolInfoForm.handleSubmit(onSchoolInfoSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={schoolInfoForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>স্কুলের নাম (ইংরেজি)</FormLabel>
                              <FormControl>
                                <Input placeholder="স্কুলের নাম লিখুন" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={schoolInfoForm.control}
                          name="nameInBangla"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>স্কুলের নাম (বাংলা)</FormLabel>
                              <FormControl>
                                <Input placeholder="স্কুলের নাম বাংলায় লিখুন" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={schoolInfoForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ইমেইল</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="school@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={schoolInfoForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ফোন নম্বর</FormLabel>
                              <FormControl>
                                <Input placeholder="+8801XXXXXXXXX" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={schoolInfoForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ঠিকানা (ইংরেজি)</FormLabel>
                              <FormControl>
                                <Textarea placeholder="স্কুলের ঠিকানা লিখুন" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={schoolInfoForm.control}
                          name="addressInBangla"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ঠিকানা (বাংলা)</FormLabel>
                              <FormControl>
                                <Textarea placeholder="স্কুলের ঠিকানা বাংলায় লিখুন" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <CardFooter className="px-0">
                        <Button type="submit" disabled={isUpdating}>
                          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          সুপাবেসে সংরক্ষণ করুন
                        </Button>
                      </CardFooter>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    ব্র্যান্ডিং এবং চেহারা
                  </CardTitle>
                  <CardDescription>
                    সুপাবেস স্টোরেজে লোগো, রঙ এবং ব্র্যান্ডিং উপাদানগুলি পরিচালনা করুন
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Logo Upload */}
                    <div className="space-y-4">
                      <Label>স্কুল লোগো</Label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                          {schoolSettings?.logoUrl ? (
                            <img src={schoolSettings.logoUrl} alt="লোগো" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Upload className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => handleFileUpload('logo')}
                          disabled={isUploading}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploading ? 'আপলোড হচ্ছে...' : 'লোগো আপলোড'}
                        </Button>
                      </div>
                    </div>

                    {/* Banner Upload */}
                    <div className="space-y-4">
                      <Label>স্কুল ব্যানার</Label>
                      <div className="flex items-center gap-4">
                        <div className="w-32 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                          <Upload className="h-8 w-8 text-gray-400" />
                        </div>
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => handleFileUpload('banner')}
                          disabled={isUploading}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploading ? 'আপলোড হচ্ছে...' : 'ব্যানার আপলোড'}
                        </Button>
                      </div>
                    </div>

                    <Form {...brandingForm}>
                      <form onSubmit={brandingForm.handleSubmit(onBrandingSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <FormField
                            control={brandingForm.control}
                            name="primaryColor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>প্রাথমিক রঙ</FormLabel>
                                <FormControl>
                                  <Input type="color" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={brandingForm.control}
                            name="secondaryColor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>গৌণ রঙ</FormLabel>
                                <FormControl>
                                  <Input type="color" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={brandingForm.control}
                            name="accentColor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>উচ্চারণ রঙ</FormLabel>
                                <FormControl>
                                  <Input type="color" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <CardFooter className="px-0">
                          <Button type="submit" disabled={isUpdating}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            ব্র্যান্ডিং সংরক্ষণ করুন
                          </Button>
                        </CardFooter>
                      </form>
                    </Form>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    সিস্টেম সেটিংস
                  </CardTitle>
                  <CardDescription>
                    সুপাবেসে সংরক্ষিত সিস্টেম কনফিগারেশন পরিচালনা করুন
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...systemSettingsForm}>
                    <form onSubmit={systemSettingsForm.handleSubmit(onSystemSettingsSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={systemSettingsForm.control}
                          name="language"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ভাষা</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="ভাষা নির্বাচন করুন" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="bn">বাংলা</SelectItem>
                                  <SelectItem value="en">ইংরেজি</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={systemSettingsForm.control}
                          name="timezone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>টাইমজোন</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="টাইমজোন নির্বাচন করুন" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Asia/Dhaka">এশিয়া/ঢাকা</SelectItem>
                                  <SelectItem value="Asia/Kolkata">এশিয়া/কলকাতা</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-4">
                        <FormField
                          control={systemSettingsForm.control}
                          name="enableNotifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">বিজ্ঞপ্তি সক্ষম করুন</FormLabel>
                                <FormDescription>
                                  সিস্টেম বিজ্ঞপ্তি এবং আপডেট পান
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <CardFooter className="px-0">
                        <Button type="submit" disabled={isUpdating}>
                          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          সেটিংস সংরক্ষণ করুন
                        </Button>
                      </CardFooter>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Tab - Backup/Restore/Stats */}
            <TabsContent value="advanced" className="space-y-6">
              {/* Backup Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    ডেটা ব্যাকআপ এবং পুনরুদ্ধার
                  </CardTitle>
                  <CardDescription>
                    সুপাবেস ডেটাবেস থেকে ব্যাকআপ তৈরি এবং পুনরুদ্ধার করুন
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">সর্বশেষ ব্যাকআপ</p>
                      <p className="text-sm text-gray-600">
                        {systemStats?.school?.lastUpdate ? 
                          new Date(systemStats.school.lastUpdate).toLocaleString('bn-BD') : 
                          'কোনো ব্যাকআপ নেই'
                        }
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleCreateBackup}
                      disabled={isBackingUp}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isBackingUp ? 'তৈরি হচ্ছে...' : 'ব্যাকআপ ডাউনলোড'}
                    </Button>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={handleCreateBackup}
                      disabled={isBackingUp}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {isBackingUp ? 'ব্যাকআপ তৈরি হচ্ছে...' : 'ম্যানুয়াল ব্যাকআপ'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={handleRestoreData}
                      disabled={isRestoring}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isRestoring ? 'পুনরুদ্ধার হচ্ছে...' : 'ডেটা পুনরুদ্ধার'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-red-600"
                      onClick={handleDeleteAllData}
                      disabled={isDeleting}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'সব ডেটা মুছুন'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* System Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    সুপাবেস সিস্টেম তথ্য
                  </CardTitle>
                  <CardDescription>
                    বর্তমান সুপাবেস ডেটাবেসের অবস্থা এবং পরিসংখ্যান
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">ডেটাবেস আকার</span>
                      <span className="font-medium">{systemStats?.database?.size || 'লোড হচ্ছে...'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">টেবিল সংখ্যা</span>
                      <span className="font-medium">{systemStats?.database?.tableCount || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">সর্বশেষ সিংক</span>
                      <span className="font-medium">
                        {systemStats?.database?.lastSync ? 
                          new Date(systemStats.database.lastSync).toLocaleString('bn-BD') : 
                          'সিংক হচ্ছে...'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">সিস্টেম আপটাইম</span>
                      <span className="font-medium">{systemStats?.system?.uptime || '99.9%'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">স্কুল রেকর্ড</span>
                      <span className="font-medium">{systemStats?.school?.recordCount || '0'} টি</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">সংযোগ স্থিতি</span>
                      <Badge className="bg-green-100 text-green-800">
                        {systemStats?.database?.connectionStatus || 'সংযুক্ত'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">ডেটা উৎস</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        সুপাবেস পোস্টগ্রিএসকিউএল
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ResponsivePageLayout>
    </AppShell>
  );
}