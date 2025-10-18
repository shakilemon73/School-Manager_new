import { useSupabaseDirectAuth } from "@/hooks/use-supabase-direct-auth";
import { Loader2, AlertCircle, School } from "lucide-react";
import { Redirect, Route } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

function NoSchoolAssigned() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <School className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl">কোনো স্কুল নিযুক্ত নেই</CardTitle>
          <CardDescription className="text-base mt-2">
            আপনার অ্যাকাউন্টে এখনো কোনো স্কুল নিযুক্ত করা হয়নি
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200 ml-2">
              স্কুল ড্যাশবোর্ড ব্যবহার করতে আপনাকে একটি স্কুলে নিযুক্ত করা প্রয়োজন।
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3 pt-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              আপনি যদি স্কুল প্রশাসক হন, তাহলে একটি নতুন স্কুল নিবন্ধন করুন:
            </p>
            <Button 
              className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700" 
              onClick={() => window.location.href = '/school-enrollment'}
              data-testid="button-enroll-school"
            >
              <School className="mr-2 h-4 w-4" />
              নতুন স্কুল নিবন্ধন করুন
            </Button>
            
            <p className="text-sm text-slate-600 dark:text-slate-400 pt-2">
              আপনি যদি শিক্ষক বা স্টাফ হন, তাহলে আপনার স্কুল প্রশাসকের সাথে যোগাযোগ করুন যাতে তারা আপনাকে সিস্টেমে যুক্ত করতে পারেন।
            </p>

            <Button 
              variant="outline" 
              className="w-full mt-4" 
              onClick={() => window.location.href = '/auth'}
              data-testid="button-back-login"
            >
              লগইন পৃষ্ঠায় ফিরে যান
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProtectedRoute({
  path,
  component: Component,
  requireSchool = true,
}: {
  path: string;
  component: React.ComponentType<any>;
  requireSchool?: boolean;
}) {
  const { user, loading, schoolId } = useSupabaseDirectAuth();

  return (
    <Route path={path}>
      {() => {
        if (loading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          );
        }

        if (!user) {
          return <Redirect to="/auth" />;
        }

        if (requireSchool && (schoolId === null || schoolId === undefined)) {
          return <NoSchoolAssigned />;
        }

        return <Component />;
      }}
    </Route>
  );
}
