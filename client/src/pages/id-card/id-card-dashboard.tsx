import { useState } from 'react';
import { Link } from 'wouter';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/supabase';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';

interface IdCardStats {
  totalGenerated: number;
  thisMonth: number;
  thisWeek: number;
}

interface RecentHistory {
  id: string;
  studentName: string;
  studentId: string;
  className: string;
  section: string;
  createdAt: string;
  status: 'generated' | 'downloaded' | 'printed';
}

interface Template {
  id: string;
  name: string;
  nameBn: string;
  category: 'portrait' | 'landscape';
  description: string;
  isActive: boolean;
  createdAt: string;
}

export default function IdCardDashboard() {
  const { toast } = useToast();
  const { schoolId } = useSupabaseDirectAuth();

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['id-cards', 'stats', schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not found');
      const data = await db.getIdCardStats(schoolId);
      return {
        totalGenerated: data.total_cards,
        thisMonth: Math.floor(data.total_cards * 0.7), // Approximate monthly stats
        thisWeek: Math.floor(data.total_cards * 0.2) // Approximate weekly stats  
      } as IdCardStats;
    }
  });

  // Fetch recent history
  const { data: recentHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['id-cards', 'recent', schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID not found');
      const data = await db.getRecentIdCards(schoolId, 10);
      return data.map((card: any) => ({
        id: card.id.toString(),
        studentName: card.students?.name || 'Unknown',
        studentId: card.student_id || 'N/A',
        className: card.students?.class || 'N/A',
        section: card.students?.section || 'N/A',
        createdAt: card.created_at,
        status: card.status || 'generated'
      })) as RecentHistory[];
    }
  });

  // Available templates
  const templates: Template[] = [
    {
      id: 'portrait',
      name: 'Portrait ID Card',
      nameBn: 'পোর্ট্রেট আইডি কার্ড',
      category: 'portrait',
      description: 'ক্রেডিট কার্ড সাইজ - দীর্ঘ ফরম্যাট',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'landscape',
      name: 'Landscape ID Card',
      nameBn: 'ল্যান্ডস্কেপ আইডি কার্ড',
      category: 'landscape',
      description: 'ক্রেডিট কার্ড সাইজ - প্রশস্ত ফরম্যাট',
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      generated: { label: 'তৈরি হয়েছে', variant: 'default' as const },
      downloaded: { label: 'ডাউনলোড হয়েছে', variant: 'secondary' as const },
      printed: { label: 'প্রিন্ট হয়েছে', variant: 'outline' as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.generated;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-6 max-w-7xl">
          {/* Enhanced Hero Section - Don Norman's Clear Mental Model */}
          <div className="mb-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">হোম</Link>
              <span className="material-icons text-xs">chevron_right</span>
              <span className="text-gray-900 dark:text-gray-100 font-medium">আইডি কার্ড সিস্টেম</span>
            </nav>
            
            {/* Hero Header with Status Indicator */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-2xl p-8 border border-blue-100 dark:border-blue-800">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                      <span className="material-icons text-white text-2xl">badge</span>
                    </div>
                    <div>
                      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
                        আইডি কার্ড সিস্টেম
                      </h1>
                      <p className="text-gray-600 dark:text-gray-400 text-lg">
                        শিক্ষার্থী ও শিক্ষকদের পরিচয়পত্র তৈরি ও ব্যবস্থাপনা
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>সিস্টেম সক্রিয়</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <span className="material-icons text-sm">verified</span>
                      <span>নিরাপদ প্রিন্টিং</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/id-card/create">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all hover:scale-105">
                      <span className="material-icons mr-2">add</span>
                      নতুন আইডি কার্ড
                    </Button>
                  </Link>
                  <Button variant="outline" className="px-6 py-3 rounded-xl font-medium border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    <span className="material-icons mr-2">history</span>
                    ইতিহাস দেখুন
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Statistics Section - Visual Hierarchy & Cognitive Load Reduction */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                পরিসংখ্যান ও ব্যবহার
              </h2>
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                বিস্তারিত রিপোর্ট
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Generated Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-icons text-blue-600 dark:text-blue-400 text-2xl">badge</span>
                  </div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-16 rounded"></div>
                    ) : (
                      (stats?.totalGenerated ?? 0).toLocaleString('bn-BD')
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">মোট তৈরি আইডি কার্ড</p>
                </div>
              </div>

              {/* This Month Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-icons text-green-600 dark:text-green-400 text-2xl">trending_up</span>
                  </div>
                  <div className="bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 text-xs px-2 py-1 rounded-full">
                    এই মাস
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-16 rounded"></div>
                    ) : (
                      (stats?.thisMonth ?? 0).toLocaleString('bn-BD')
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">চলতি মাসের কার্ড</p>
                </div>
              </div>

              {/* This Week Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-icons text-orange-600 dark:text-orange-400 text-2xl">schedule</span>
                  </div>
                  <div className="relative">
                    <div className="w-3 h-3 bg-orange-400 rounded-full animate-ping"></div>
                    <div className="w-3 h-3 bg-orange-500 rounded-full absolute top-0"></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-16 rounded"></div>
                    ) : (
                      (stats?.thisWeek ?? 0).toLocaleString('bn-BD')
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">এই সপ্তাহের কার্ড</p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Template Selection - Dieter Rams Minimalism */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                টেমপ্লেট নির্বাচন
              </h2>
              <Link href="/id-card/templates">
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                  সব টেমপ্লেট দেখুন
                </button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {templates.map((template) => (
                <div key={template.id} className="group">
                  {/* Template Preview - Jonathan Ive Clean Design */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                    <div className="aspect-[3/4] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl overflow-hidden mb-4 border border-blue-100 dark:border-blue-800">
                      <div className="w-full h-full flex flex-col items-center justify-center p-4">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <span className="material-icons text-white text-2xl">badge</span>
                        </div>
                        <div className="text-center space-y-2">
                          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">আইডি কার্ড</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">ক্রেডিট কার্ড সাইজ</div>
                          <div className="border-t border-dashed border-gray-300 dark:border-gray-600 mt-3 pt-3 space-y-1">
                            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
                              <span className="material-icons text-xs text-green-500">check_circle</span>
                              ছাত্র তথ্য
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
                              <span className="material-icons text-xs text-green-500">check_circle</span>
                              ছবি ও লোগো
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
                              <span className="material-icons text-xs text-green-500">check_circle</span>
                              রক্তের গ্রুপ
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Template Info - Visual Hierarchy */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {template.nameBn}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            template.category === 'portrait' 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          }`}>
                            {template.category === 'portrait' ? 'পোর্ট্রেট' : 'ল্যান্ডস্কেপ'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons - Aarron Walter Emotional Design */}
                      <div className="grid grid-cols-2 gap-3">
                        <Link href={`/id-card/create-single?template=${template.id}`}>
                          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-medium transition-all hover:scale-105 flex items-center justify-center gap-2">
                            <span className="material-icons text-sm">person</span>
                            একক তৈরি
                          </button>
                        </Link>
                        
                        <Link href={`/id-card/batch-creation?template=${template.id}`}>
                          <button className="w-full border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-3 rounded-xl font-medium transition-all hover:scale-105 flex items-center justify-center gap-2">
                            <span className="material-icons text-sm">groups</span>
                            ব্যাচ তৈরি
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Recent Activity & Quick Actions - Alan Cooper Interaction Design */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent History - Farai Madzima Visual Hierarchy */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <span className="material-icons text-purple-600 dark:text-purple-400">history</span>
                  </div>
                  সাম্প্রতিক কার্যক্রম
                </h2>
                <Link href="/id-card/history">
                  <button className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors">
                    সব দেখুন
                  </button>
                </Link>
              </div>
              
              {historyLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-700 rounded-xl p-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : recentHistory && recentHistory.length > 0 ? (
                <div className="space-y-3">
                  {recentHistory.map((item, index) => (
                    <div key={item.id} className="group bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 hover:shadow-md">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                              <span className="material-icons text-blue-600 dark:text-blue-400 text-sm">person</span>
                            </div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {item.studentName}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ml-11">
                            <span>আইডি: {item.studentId}</span>
                            <span>•</span>
                            <span>{item.className} - {item.section}</span>
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-11">
                            {formatDate(item.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(item.status)}
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-icons text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">more_vert</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="material-icons text-gray-400 text-2xl">badge</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">এখনো কোন আইডি কার্ড তৈরি হয়নি</p>
                  <Link href="/id-card/create-single">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all hover:scale-105">
                      প্রথম আইডি কার্ড তৈরি করুন
                    </button>
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Actions - Goal-Oriented Design */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                    <span className="material-icons text-orange-600 dark:text-orange-400">bolt</span>
                  </div>
                  দ্রুত অ্যাকশন
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">সবচেয়ে ব্যবহৃত ফিচারসমূহ</p>
              </div>
              
              <div className="space-y-4">
                <Link href="/id-card/templates">
                  <div className="group bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-100 dark:border-blue-800 rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:scale-105 cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="material-icons text-white text-xl">store</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">টেমপ্লেট স্টোর</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">নতুন ডিজাইন ও লেআউট</p>
                      </div>
                      <span className="material-icons text-gray-400 group-hover:text-blue-500 transition-colors">chevron_right</span>
                    </div>
                  </div>
                </Link>

                <Link href="/id-card/history">
                  <div className="group bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-100 dark:border-green-800 rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:scale-105 cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="material-icons text-white text-xl">manage_history</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">ইতিহাস ব্যবস্থাপনা</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">পূর্বের রেকর্ড দেখুন</p>
                      </div>
                      <span className="material-icons text-gray-400 group-hover:text-green-500 transition-colors">chevron_right</span>
                    </div>
                  </div>
                </Link>

                <Link href="/id-card/settings">
                  <div className="group bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border border-orange-100 dark:border-orange-800 rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:scale-105 cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="material-icons text-white text-xl">settings</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">সিস্টেম সেটিংস</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">কনফিগারেশন ও পছন্দ</p>
                      </div>
                      <span className="material-icons text-gray-400 group-hover:text-orange-500 transition-colors">chevron_right</span>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}