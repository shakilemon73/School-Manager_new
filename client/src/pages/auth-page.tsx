import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';
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
import { 
  Eye, 
  EyeOff, 
  School, 
  Users, 
  BookOpen, 
  Calendar,
  Loader2,
  Mail,
  Lock,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('সঠিক ইমেইল ঠিকানা প্রয়োজন'),
  password: z.string().min(6, 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const { user: supabaseUser, loading: supabaseLoading, signIn } = useSupabaseDirectAuth();
  const [_, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Redirect if user is already logged in
  useEffect(() => {
    if (supabaseUser) {
      const userMetadata = supabaseUser.user_metadata;
      const userRole = userMetadata?.role || 'school_admin';

      if (userRole === 'super_admin') {
        setLocation('/super-admin');
      } else if (userRole === 'school_admin') {
        setLocation('/dashboard');
      } else if (userRole === 'teacher') {
        setLocation('/teacher');
      } else if (userRole === 'parent') {
        setLocation('/parent');
      } else if (userRole === 'student') {
        setLocation('/student');
      } else {
        setLocation('/');
      }
    }
  }, [supabaseUser, setLocation]);

  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      await signIn(data.email, data.password);
      toast({
        title: "স্বাগতম!",
        description: "সফলভাবে লগইন হয়েছে",
      });
    } catch (error: any) {
      toast({
        title: "লগইন ব্যর্থ",
        description: error.message || "অনুগ্রহ করে আবার চেষ্টা করুন",
        variant: "destructive",
      });
    }
  };

  const isLoading = supabaseLoading;

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

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto space-y-6">
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

                <div className="text-center space-y-2">
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    স্বাগতম!
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    আপনার স্কুল অ্যাকাউন্টে প্রবেশ করুন
                  </CardDescription>
                </div>

                {/* Supabase Auth Badge */}
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-emerald-100 to-blue-100 dark:from-emerald-900/30 dark:to-blue-900/30 rounded-full text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    <CheckCircle className="h-3 w-3" />
                    সুরক্ষিত সুপাবেস অথেন্টিকেশন
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-6 pb-6 space-y-6">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                    <FormField
                      control={loginForm.control}
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
                                className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-emerald-500/20 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm"
                                data-testid="input-email"
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
                                data-testid="input-password"
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
                      data-testid="button-login"
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

                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 dark:text-blue-300 text-sm">
                    <strong>সুপাবেস ইমেইল অথেন্টিকেশন:</strong><br/>
                    নিবন্ধন করার পর আপনার ইমেইল যাচাই করুন
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* New School Enrollment Card */}
            <Card className="shadow-xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/50 dark:to-blue-950/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg shadow-lg">
                    <School className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg mb-1">
                        নতুন স্কুল নিবন্ধন করুন
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        আপনার স্কুল এখনও নিবন্ধিত নয়? সম্পূর্ণ তথ্য দিয়ে আজই নিবন্ধন করুন
                      </p>
                    </div>
                    <Button
                      onClick={() => setLocation('/enroll')}
                      className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-medium shadow-md hover:shadow-lg transition-all"
                      data-testid="button-enroll-school"
                    >
                      স্কুল নিবন্ধন শুরু করুন
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
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
