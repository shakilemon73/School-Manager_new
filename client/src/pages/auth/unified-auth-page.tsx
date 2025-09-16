import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  EyeOff, 
  GraduationCap, 
  School, 
  Users, 
  BookOpen, 
  Calendar,
  Loader2,
  Mail,
  Lock,
  User,
  Phone,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

// Form validation schemas
const loginSchema = z.object({
  identifier: z.string().min(1, 'ইমেইল বা ইউজারনেম প্রয়োজন'),
  password: z.string().min(6, 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে'),
});

const registerSchema = z.object({
  email: z.string().email('সঠিক ইমেইল ঠিকানা লিখুন'),
  password: z.string().min(6, 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে'),
  confirmPassword: z.string().min(6, 'পাসওয়ার্ড নিশ্চিত করুন'),
  full_name: z.string().min(2, 'পূর্ণ নাম অন্তত ২ অক্ষরের হতে হবে'),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "পাসওয়ার্ড মিলছে না",
  path: ['confirmPassword'],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function UnifiedAuthPage() {
  const [_, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<'traditional' | 'supabase'>('supabase');
  const [activeTab, setActiveTab] = useState('login');
  
  const { toast } = useToast();
  
  // Supabase auth
  const { user: supabaseUser, loading: supabaseLoading, signIn, signUp } = useSupabaseDirectAuth();
  
  // Traditional auth (fallback)
  let traditionalAuth = null;
  try {
    traditionalAuth = useAuth();
  } catch (error) {
    console.log('Traditional auth not available:', error);
  }
  
  const { user: traditionalUser, loginMutation, registerMutation } = traditionalAuth || {
    user: null,
    loginMutation: null,
    registerMutation: null
  };

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      full_name: '',
      phone: '',
    },
  });

  // Redirect if user is already logged in
  useEffect(() => {
    if (supabaseUser || traditionalUser) {
      setLocation('/');
    }
  }, [supabaseUser, traditionalUser, setLocation]);

  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      if (authMode === 'supabase') {
        // Check if identifier is email or username
        const isEmail = data.identifier.includes('@');
        
        if (isEmail) {
          const result = await signIn(data.identifier, data.password);
          
          if (!result.success) {
            // Handle specific Supabase errors
            let errorMessage = result.error || "লগইন ব্যর্থ";
            
            if (result.error?.includes('Invalid API key') || result.error?.includes('Invalid login credentials')) {
              errorMessage = "ইমেইল বা পাসওয়ার্ড ভুল। অনুগ্রহ করে আবার চেষ্টা করুন।";
            } else if (result.error?.includes('Email not confirmed')) {
              errorMessage = "আপনার ইমেইল যাচাই করুন";
            }
            
            toast({
              title: "লগইন ব্যর্থ",
              description: errorMessage,
              variant: "destructive",
            });
            return;
          }
          
          toast({
            title: "স্বাগতম!",
            description: "সফলভাবে লগইন হয়েছে",
          });
          setLocation('/');
        } else {
          // For username, fallback to traditional auth
          if (!loginMutation) {
            toast({
              title: "ত্রুটি",
              description: "ট্র্যাডিশনাল অথ উপলব্ধ নেই",
              variant: "destructive",
            });
            return;
          }
          
          loginMutation.mutate({
            username: data.identifier,
            password: data.password,
          }, {
            onSuccess: () => {
              toast({
                title: "স্বাগতম!",
                description: "সফলভাবে লগইন হয়েছে",
              });
              setLocation('/');
            },
            onError: (error: any) => {
              toast({
                title: "লগইন ব্যর্থ",
                description: error.message || "ইউজারনেম বা পাসওয়ার্ড ভুল",
                variant: "destructive",
              });
            }
          });
        }
      } else {
        // Traditional auth
        if (!loginMutation) {
          toast({
            title: "ত্রুটি",
            description: "ট্র্যাডিশনাল অথ উপলব্ধ নেই",
            variant: "destructive",
          });
          return;
        }
        
        loginMutation.mutate({
          username: data.identifier,
          password: data.password,
        }, {
          onSuccess: () => {
            toast({
              title: "স্বাগতম!",
              description: "সফলভাবে লগইন হয়েছে",
            });
            setLocation('/');
          },
          onError: (error: any) => {
            toast({
              title: "লগইন ব্যর্থ",
              description: error.message || "ইউজারনেম বা পাসওয়ার্ড ভুল",
              variant: "destructive",
            });
          }
        });
      }
    } catch (error: any) {
      console.error('Login submit error:', error);
      toast({
        title: "লগইন সমস্যা",
        description: "অনুগ্রহ করে আবার চেষ্টা করুন",
        variant: "destructive",
      });
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    try {
      if (authMode === 'supabase') {
        await signUp(data.email, data.password, {
          full_name: data.full_name,
          phone: data.phone,
          role: 'user'
        });
        
        toast({
          title: "রেজিস্ট্রেশন সফল!",
          description: "আপনার ইমেইল যাচাই করুন",
        });
      } else {
        // Traditional registration
        registerMutation?.mutate({
          username: data.email.split('@')[0], // Use email prefix as username
          email: data.email,
          passwordHash: data.password, // Change to passwordHash
          full_name: data.full_name,
          phone: data.phone,
          role: 'user',
          language: 'bn',
        }, {
          onSuccess: () => {
            toast({
              title: "রেজিস্ট্রেশন সফল!",
              description: "আপনার অ্যাকাউন্ট তৈরি হয়েছে",
            });
            setLocation('/');
          }
        });
      }
    } catch (error: any) {
      toast({
        title: "রেজিস্ট্রেশন ব্যর্থ",
        description: error.message || "অনুগ্রহ করে আবার চেষ্টা করুন",
        variant: "destructive",
      });
    }
  };

  const isLoading = supabaseLoading || loginMutation?.isPending || registerMutation?.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-slate-100/[0.03]" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-400/20 to-emerald-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-400/20 to-blue-400/20 rounded-full blur-3xl" />
      
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          
          {/* Left Side - Feature Showcase */}
          <div className="hidden lg:block space-y-8">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="relative">
                  <div className="bg-gradient-to-br from-emerald-500 to-blue-600 p-4 rounded-2xl shadow-xl">
                    <School className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                    স্কুল ম্যানেজমেন্ট
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 text-lg">
                    আধুনিক শিক্ষা ব্যবস্থাপনার সম্পূর্ণ সমাধান
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {[
                {
                  icon: Users,
                  title: "শিক্ষার্থী ব্যবস্থাপনা",
                  description: "সম্পূর্ণ তথ্য, উপস্থিতি এবং পারফরম্যান্স ট্র্যাকিং",
                  color: "from-blue-500 to-blue-600"
                },
                {
                  icon: BookOpen,
                  title: "একাডেমিক ব্যবস্থাপনা",
                  description: "পরীক্ষা, গ্রেড এবং সিলেবাস পরিচালনা",
                  color: "from-emerald-500 to-emerald-600"
                },
                {
                  icon: Calendar,
                  title: "সময়সূচী ব্যবস্থাপনা",
                  description: "ক্লাস রুটিন, ইভেন্ট এবং ক্যালেন্ডার",
                  color: "from-purple-500 to-purple-600"
                }
              ].map((feature, index) => (
                <div key={index} className="group">
                  <div className="flex items-center gap-4 p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]">
                    <div className={`p-3 bg-gradient-to-br ${feature.color} rounded-lg shadow-lg`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-100 to-blue-100 dark:from-emerald-900/30 dark:to-blue-900/30 rounded-full">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  নিরাপদ ও দ্রুত অ্যাক্সেস
                </span>
              </div>
            </div>
          </div>

          {/* Right Side - Authentication Form */}
          <div className="w-full max-w-md mx-auto">
            <Card className="shadow-2xl border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
              <CardHeader className="space-y-6 text-center pb-6">
                {/* Mobile logo */}
                <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-emerald-500 to-blue-600 p-3 rounded-xl shadow-lg">
                    <School className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                    স্কুল ম্যানেজমেন্ট
                  </h1>
                </div>

                {/* Auth mode selector */}
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    onClick={() => setAuthMode('supabase')}
                    className={`flex-1 text-xs py-2 px-3 rounded-md transition-all duration-200 ${
                      authMode === 'supabase'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    আধুনিক অথ
                  </button>
                  <button
                    onClick={() => setAuthMode('traditional')}
                    className={`flex-1 text-xs py-2 px-3 rounded-md transition-all duration-200 ${
                      authMode === 'traditional'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    ট্র্যাডিশনাল
                  </button>
                </div>
              </CardHeader>

              <CardContent className="px-6 pb-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 dark:bg-slate-800">
                    <TabsTrigger 
                      value="login"
                      className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-emerald-400"
                    >
                      লগইন
                    </TabsTrigger>
                    <TabsTrigger 
                      value="register"
                      className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-emerald-400"
                    >
                      রেজিস্ট্রেশন
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-6">
                    <div className="text-center space-y-2">
                      <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        স্বাগতম ফিরে!
                      </CardTitle>
                      <CardDescription className="text-slate-600 dark:text-slate-400">
                        আপনার অ্যাকাউন্টে প্রবেশ করুন
                      </CardDescription>
                    </div>

                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                        <FormField
                          control={loginForm.control}
                          name="identifier"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {authMode === 'supabase' ? 'ইমেইল বা ইউজারনেম' : 'ইউজারনেম'}
                              </FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  {authMode === 'supabase' ? (
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                  ) : (
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                  )}
                                  <Input
                                    {...field}
                                    type="text"
                                    placeholder={authMode === 'supabase' ? 'your@email.com বা username' : 'আপনার ইউজারনেম'}
                                    className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-emerald-500/20 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                পাসওয়ার্ড
                              </FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                  <Input
                                    {...field}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="আপনার পাসওয়ার্ড"
                                    className="pl-10 pr-10 h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-emerald-500/20 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? (
                                      <EyeOff className="h-4 w-4 text-slate-400" />
                                    ) : (
                                      <Eye className="h-4 w-4 text-slate-400" />
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full h-12 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              প্রবেশ করছি...
                            </>
                          ) : (
                            "প্রবেশ করুন"
                          )}
                        </Button>
                      </form>
                    </Form>

                    <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-emerald-800 dark:text-emerald-300">
                        <strong>টেস্ট অ্যাকাউন্ট:</strong><br/>
                        {authMode === 'supabase' ? (
                          <>
                            ইমেইল: admin@school.com<br/>
                            পাসওয়ার্ড: admin123
                          </>
                        ) : (
                          <>
                            ইউজারনেম: emon2001<br/>
                            পাসওয়ার্ড: admin123
                          </>
                        )}
                      </AlertDescription>
                    </Alert>
                  </TabsContent>

                  <TabsContent value="register" className="space-y-6">
                    <div className="text-center space-y-2">
                      <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        নতুন অ্যাকাউন্ট
                      </CardTitle>
                      <CardDescription className="text-slate-600 dark:text-slate-400">
                        আপনার তথ্য দিয়ে রেজিস্ট্রেশন করুন
                      </CardDescription>
                    </div>

                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                        <FormField
                          control={registerForm.control}
                          name="full_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                পূর্ণ নাম
                              </FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                  <Input
                                    {...field}
                                    placeholder="আপনার পূর্ণ নাম"
                                    className="pl-10 h-11 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 bg-white/50 dark:bg-slate-800/50"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                ইমেইল ঠিকানা
                              </FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                  <Input
                                    {...field}
                                    type="email"
                                    placeholder="your@email.com"
                                    className="pl-10 h-11 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 bg-white/50 dark:bg-slate-800/50"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={registerForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                  পাসওয়ার্ড
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="password"
                                    placeholder="পাসওয়ার্ড"
                                    className="h-11 border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                  নিশ্চিত করুন
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="password"
                                    placeholder="পুনরায় লিখুন"
                                    className="h-11 border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={registerForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                ফোন নম্বর (ঐচ্ছিক)
                              </FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                  <Input
                                    {...field}
                                    placeholder="+880 1XXX XXXXXX"
                                    className="pl-10 h-11 border-slate-200 dark:border-slate-700 focus:border-emerald-500 bg-white/50 dark:bg-slate-800/50"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full h-12 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              রেজিস্ট্রেশন করছি...
                            </>
                          ) : (
                            "রেজিস্ট্রেশন করুন"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>

                <div className="mt-6 text-center">
                  <div className="flex items-center justify-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>সিকিউর</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>দ্রুত</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span>নির্ভরযোগ্য</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}