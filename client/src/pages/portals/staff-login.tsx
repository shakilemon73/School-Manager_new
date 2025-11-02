import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, Loader2, Briefcase } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function StaffLogin() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        // Verify user has a staff profile
        const { data: staff, error: staffError } = await supabase
          .from('staff')
          .select('id')
          .eq('user_id', authData.user.id)
          .single();

        if (staffError || !staff) {
          await supabase.auth.signOut();
          throw new Error('No staff profile found for this account. Please contact your administrator.');
        }

        toast({
          title: "স্বাগতম কর্মচারী! / Welcome Staff!",
          description: "Login successful. Redirecting to your portal...",
        });
        
        setLocation('/staff');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      toast({
        title: "Login Failed",
        description: err.message || 'Please check your credentials and try again.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-2 border-green-200" data-testid="card-staff-login">
        <CardHeader className="space-y-3 text-center bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-lg">
          <div className="flex justify-center">
            <div className="bg-white/20 p-4 rounded-full">
              <Briefcase className="h-12 w-12" data-testid="icon-staff" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold" data-testid="text-title">
            Staff Portal Login
            <div className="text-lg font-medium mt-1">কর্মচারী পোর্টাল লগইন</div>
          </CardTitle>
          <CardDescription className="text-green-100" data-testid="text-description">
            Access your employee dashboard / আপনার কর্মচারী ড্যাশবোর্ড অ্যাক্সেস করুন
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {error && (
            <Alert variant="destructive" data-testid="alert-error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-login">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-email">
                      Email Address / ইমেল ঠিকানা
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="your.email@school.com"
                          className="pl-10"
                          disabled={isLoading}
                          data-testid="input-email"
                        />
                      </div>
                    </FormControl>
                    <FormMessage data-testid="error-email" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-password">
                      Password / পাসওয়ার্ড
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          disabled={isLoading}
                          data-testid="input-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          disabled={isLoading}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage data-testid="error-password" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In / সাইন ইন'
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p data-testid="text-help">
              Need help? Contact your administrator
            </p>
            <p className="text-xs mt-1" data-testid="text-help-bn">
              সাহায্য প্রয়োজন? আপনার প্রশাসকের সাথে যোগাযোগ করুন
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
