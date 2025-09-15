import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { MobilePageLayout } from '@/components/layout/mobile-page-layout';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { BnText } from '@/components/ui/bn-text';
import { Button } from '@/components/ui/button';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: string;
  title: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'gray';
}

function StatCard({ icon, title, value, color }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    red: "bg-red-100 text-red-600",
    yellow: "bg-amber-100 text-amber-600",
    gray: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <div className="flex items-center">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center mr-3", colorClasses[color])}>
          <span className="material-icons text-xl">{icon}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

interface QuickLinkProps {
  icon: string;
  title: string;
  path: string;
  color: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'gray';
}

function QuickLink({ icon, title, path, color }: QuickLinkProps) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    red: "bg-red-100 text-red-600",
    yellow: "bg-amber-100 text-amber-600",
    gray: "bg-gray-100 text-gray-600",
  };

  return (
    <Link href={path}>
      <div className="bg-white rounded-lg shadow-sm border p-4 h-full flex flex-col items-center justify-center">
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-2", colorClasses[color])}>
          <span className="material-icons text-xl">{icon}</span>
        </div>
        <p className="text-sm font-medium text-center">{title}</p>
      </div>
    </Link>
  );
}

interface NotificationProps {
  title: string;
  description: string;
  time: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

function Notification({ title, description, time, type }: NotificationProps) {
  const typeClasses = {
    info: "border-blue-300",
    warning: "border-amber-300",
    success: "border-green-300",
    error: "border-red-300",
  };

  const iconMap = {
    info: "info",
    warning: "warning",
    success: "check_circle",
    error: "error",
  };

  const colorMap = {
    info: "text-blue-500",
    warning: "text-amber-500",
    success: "text-green-500",
    error: "text-red-500",
  };

  return (
    <div className={cn("p-3 border-l-4 bg-white rounded-lg mb-3 shadow-sm", typeClasses[type])}>
      <div className="flex">
        <span className={cn("material-icons mr-2 mt-0.5", colorMap[type])}>
          {iconMap[type]}
        </span>
        <div className="flex-1">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
          <p className="text-xs text-gray-500 mt-1">{time}</p>
        </div>
      </div>
    </div>
  );
}

interface UpcomingEventProps {
  title: string;
  date: string;
  type: string;
}

function UpcomingEvent({ title, date, type }: UpcomingEventProps) {
  return (
    <div className="flex items-center mb-4">
      <div className="w-10 text-center mr-3">
        <p className="text-xs text-gray-500">{date.split(' ')[0]}</p>
        <p className="text-lg font-bold text-primary">{date.split(' ')[1]}</p>
      </div>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-xs text-gray-500">{type}</p>
      </div>
    </div>
  );
}

export default function MobileDashboard() {
  const { user } = useSupabaseDirectAuth();

  const [activeTab, setActiveTab] = useState("overview");

  return (
    <AppShell>
      <MobilePageLayout
        title="ড্যাশবোর্ড"
        description="আপনার স্কুল ম্যানেজমেন্ট ড্যাশবোর্ড"
        primaryAction={{
          icon: "add",
          label: "নতুন তৈরি করুন",
          onClick: () => {},
        }}
      >
        {/* Greeting Section */}
        <div className="px-1 py-2">
          <Card className="border-none shadow-sm bg-gradient-to-r from-primary/80 to-primary text-white">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">স্বাগতম, {user?.username || 'শিক্ষক'}</h2>
                  <p className="text-white/80 mt-1">আজ সোমবার, ৬ মে, ২০২৫</p>
                </div>
                <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="material-icons text-white">school</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="mt-4">
          <h2 className="text-lg font-semibold px-2 mb-3">দ্রুত অবলোকন</h2>
          <div className="grid grid-cols-2 gap-3 px-1">
            <StatCard 
              icon="people" 
              title="মোট শিক্ষার্থী" 
              value="৫৪২" 
              color="blue" 
            />
            <StatCard 
              icon="person" 
              title="মোট শিক্ষক" 
              value="৩২" 
              color="green" 
            />
            <StatCard 
              icon="groups" 
              title="মোট শ্রেণী" 
              value="১২" 
              color="purple" 
            />
            <StatCard 
              icon="payments" 
              title="মোসের আয়" 
              value="১২৩,৬০০" 
              color="yellow" 
            />
          </div>
        </div>

        {/* Quick Access */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold px-2 mb-3">দ্রুত এক্সেস</h2>
          <div className="grid grid-cols-3 gap-3 px-1">
            <QuickLink 
              icon="receipt" 
              title="ফি রসিদ" 
              path="/documents/fee-receipts" 
              color="green" 
            />
            <QuickLink 
              icon="badge" 
              title="আইডি কার্ড" 
              path="/documents/id-cards" 
              color="blue" 
            />
            <QuickLink 
              icon="assignment" 
              title="এডমিট কার্ড" 
              path="/documents/admit-cards" 
              color="purple" 
            />
            <QuickLink 
              icon="menu_book" 
              title="ক্লাস রুটিন" 
              path="/documents/class-routines" 
              color="yellow" 
            />
            <QuickLink 
              icon="schedule" 
              title="শিক্ষক রুটিন" 
              path="/documents/teacher-routines" 
              color="red" 
            />
            <QuickLink 
              icon="summarize" 
              title="রেজাল্ট শিট" 
              path="/documents/result-sheets" 
              color="gray" 
            />
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="mt-6 px-1">
          <h2 className="text-lg font-semibold px-1 mb-3">সাম্প্রতিক ঘটনা</h2>
          <div className="space-y-3">
            <Notification
              title="পরীক্ষার নোটিশ প্রকাশিত হয়েছে"
              description="অর্ধ-বার্ষিক পরীক্ষার রুটিন প্রকাশিত হয়েছে। সকল শিক্ষার্থীদের অবহিত করুন।"
              time="আজ, ১০:৩০ AM"
              type="info"
            />
            <Notification
              title="বই বিতরণ কার্যক্রম শুরু"
              description="৬ষ্ঠ থেকে ৮ম শ্রেণীর নতুন বই বিতরণ আগামীকাল শুরু হবে।"
              time="গতকাল, ২:১৫ PM"
              type="success"
            />
            <Notification
              title="শুল্ক প্রদানের সময়সীমা"
              description="ইয়ারলি পরীক্ষার ফি প্রদানের শেষ তারিখ আগামী সপ্তাহ।"
              time="২ দিন আগে"
              type="warning"
            />
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="mt-6 px-1">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold px-1">আসন্ন ইভেন্টস</h2>
            <Button variant="ghost" size="sm" className="text-primary">
              সকল দেখুন
              <span className="material-icons text-sm ml-1">arrow_forward</span>
            </Button>
          </div>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <UpcomingEvent
                title="বিজ্ঞান প্রদর্শনী"
                date="মে ১০"
                type="স্কুল অনুষ্ঠান"
              />
              <UpcomingEvent
                title="পরিবেশ দিবস উদযাপন"
                date="জুন ০৫"
                type="বিশেষ অনুষ্ঠান"
              />
              <UpcomingEvent
                title="অর্ধ-বার্ষিক পরীক্ষা শুরু"
                date="জুন ১২"
                type="পরীক্ষা"
              />
              <Button variant="outline" className="w-full mt-2">
                ইভেন্ট যোগ করুন
                <span className="material-icons text-sm ml-1">add</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Documents */}
        <div className="mt-6 px-1 pb-20">
          <h2 className="text-lg font-semibold px-1 mb-3">সাম্প্রতিক ডকুমেন্টস</h2>
          <div className="grid grid-cols-1 gap-3">
            <Card className="shadow-sm">
              <div className="flex p-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="material-icons text-blue-600">assignment</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">অর্ধ-বার্ষিক এডমিট কার্ড</h3>
                  <p className="text-sm text-gray-500">তৈরি করা হয়েছে: ০৪ মে, ২০২৫</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <span className="material-icons text-gray-500">more_vert</span>
                </Button>
              </div>
            </Card>

            <Card className="shadow-sm">
              <div className="flex p-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="material-icons text-green-600">receipt_long</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">মে মাসের ফি রসিদ</h3>
                  <p className="text-sm text-gray-500">তৈরি করা হয়েছে: ০২ মে, ২০২৫</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <span className="material-icons text-gray-500">more_vert</span>
                </Button>
              </div>
            </Card>

            <Card className="shadow-sm">
              <div className="flex p-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="material-icons text-purple-600">badge</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">নবম শ্রেণীর আইডি কার্ড</h3>
                  <p className="text-sm text-gray-500">তৈরি করা হয়েছে: ০১ মে, ২০২৫</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <span className="material-icons text-gray-500">more_vert</span>
                </Button>
              </div>
            </Card>
          </div>
        </div>

      </MobilePageLayout>
    </AppShell>
  );
}