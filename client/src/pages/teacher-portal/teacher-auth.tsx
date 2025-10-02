import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDesignSystem } from '@/hooks/use-design-system';
import { GraduationCap, User, Lock } from 'lucide-react';
import { UXCard } from '@/components/ux-system';

const teacherLoginSchema = z.object({
  email: z.string().email('সঠিক ইমেইল লিখুন'),
  password: z.string().min(4, 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে'),
});

type TeacherLoginData = z.infer<typeof teacherLoginSchema>;

const TeacherAuthContext = {
  isAuthenticated: false,
  teacher: null,
  login: (teacherData: any) => {
    localStorage.setItem('teacherAuth', JSON.stringify(teacherData));
    TeacherAuthContext.isAuthenticated = true;
    TeacherAuthContext.teacher = teacherData;
  },
  logout: () => {
    localStorage.removeItem('teacherAuth');
    TeacherAuthContext.isAuthenticated = false;
    TeacherAuthContext.teacher = null;
  },
  init: () => {
    const stored = localStorage.getItem('teacherAuth');
    if (stored) {
      const teacherData = JSON.parse(stored);
      TeacherAuthContext.isAuthenticated = true;
      TeacherAuthContext.teacher = teacherData;
      return teacherData;
    }
    return null;
  }
};

interface TeacherAuthProps {
  onAuthenticated: (teacher: any) => void;
}

export default function TeacherAuth({ onAuthenticated }: TeacherAuthProps) {
  const { toast } = useToast();
  
  useDesignSystem();

  const form = useForm<TeacherLoginData>({
    resolver: zodResolver(teacherLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (loginData: TeacherLoginData) => {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned');

      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (teacherError) throw new Error('Teacher profile not found');
      
      return teacherData;
    },
    onSuccess: (teacher) => {
      TeacherAuthContext.login(teacher);
      toast({
        title: "সফল হয়েছে!",
        description: `স্বাগতম ${teacher.name}`,
      });
      onAuthenticated(teacher);
    },
    onError: (error: any) => {
      toast({
        title: "ত্রুটি!",
        description: error.message || "ইমেইল বা পাসওয়ার্ড ভুল",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TeacherLoginData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            শিক্ষক পোর্টাল
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            আপনার অ্যাকাউন্টে লগইন করুন
          </p>
        </div>

        <UXCard interactive>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              শিক্ষক লগইন
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-800 block">ইমেইল</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input 
                            placeholder="teacher@school.com"
                            className="w-full px-4 py-3 pl-10 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 min-h-[44px] focus:outline-none"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-800 block">পাসওয়ার্ড</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input 
                            type="password"
                            placeholder="••••••••"
                            className="w-full px-4 py-3 pl-10 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 min-h-[44px] focus:outline-none"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg min-h-[44px]"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              <p>ডেমো শংসাপত্র: teacher@school.com / Teacher@123</p>
            </div>
          </CardContent>
        </UXCard>
      </div>
    </div>
  );
}

export { TeacherAuthContext };
