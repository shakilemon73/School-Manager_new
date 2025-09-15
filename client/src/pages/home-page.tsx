import { useEffect } from 'react';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';

export default function HomePage() {
  const { user } = useSupabaseDirectAuth();
  const [_, setLocation] = useLocation();

  // This will navigate to fee receipts which is our main demo page
  useEffect(() => {
    setLocation('/documents/fee-receipts');
  }, [setLocation]);

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          স্বাগতম, {user?.username}!
        </h1>
        <p className="text-gray-600 mt-1">
          আপনার ড্যাশবোর্ডে
        </p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>ডকুমেন্টস</CardTitle>
            <CardDescription>সকল প্রকার ডকুমেন্ট তৈরি করুন</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">এডমিট কার্ড, আইডি কার্ড, ক্লাস রুটিন, ফি রসিদ এবং আরও অনেক ডকুমেন্ট ব্যবস্থাপনা করুন।</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>শিক্ষার্থী</CardTitle>
            <CardDescription>শিক্ষার্থী ব্যবস্থাপনা করুন</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">সকল শিক্ষার্থীদের তথ্য, উপস্থিতি, পরীক্ষার ফলাফল এবং অন্যান্য তথ্য ব্যবস্থাপনা করুন।</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>সেটিংস</CardTitle>
            <CardDescription>সিস্টেমের সেটিংস পরিবর্তন করুন</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">ব্যবহারকারী অনুমতি, সিস্টেম কনফিগারেশন এবং ডকুমেন্ট টেমপ্লেট কাস্টমাইজেশন করুন।</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
