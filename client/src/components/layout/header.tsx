import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';
import { useSchoolBranding, useCurrentAcademicYear } from '@/hooks/use-school-context';
import { useNavigationCounts } from '@/hooks/use-navigation-counts';
import { LanguageSelector } from './language-selector';
import Logo from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { useMobile } from '@/hooks/use-mobile';
import { SearchInput } from '@/components/ui/search-input';
import { LanguageText } from '@/components/ui/language-text';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Link } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, signOut, loading, schoolId, authReady } = useSupabaseDirectAuth();
  const { schoolName, schoolNameBn, schoolLogo, schoolColors } = useSchoolBranding();
  const { currentAcademicYear } = useCurrentAcademicYear();
  const { counts } = useNavigationCounts();
  const isMobile = useMobile();

  // Fetch real notifications from database
  const { data: notifications = [] } = useQuery({
    queryKey: ['header-notifications', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: authReady && !!schoolId,
    staleTime: 60 * 1000, // 1 minute
  });

  const unreadCount = notifications.length;

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header 
      className="bg-gradient-to-r from-white via-slate-50/50 to-white border-b border-slate-200/80 z-20 sticky top-0 backdrop-blur-sm shadow-sm" 
      role="banner"
    >
      <div className="px-4 py-3 flex justify-between items-center">
        {/* Enhanced logo section with breadcrumb-style navigation */}
        {isMobile ? (
          <div className="flex items-center gap-3 flex-1">
            {schoolLogo ? (
              <img src={schoolLogo} alt="School Logo" className="w-10 h-10 rounded-lg object-cover shadow-sm" />
            ) : (
              <Logo size="sm" />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-slate-800 text-lg font-semibold truncate">
                {schoolNameBn || schoolName || (
                  <LanguageText
                    en="EduBD Pro"
                    bn="এডুবিডি প্রো"
                    ar="إدارة المدرسة"
                  />
                )}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {currentAcademicYear ? (
                  <LanguageText
                    en={currentAcademicYear.name}
                    bn={currentAcademicYear.nameBn || currentAcademicYear.name}
                    ar={currentAcademicYear.name}
                  />
                ) : (
                  <LanguageText
                    en="Educational Management"
                    bn="শিক্ষা ব্যবস্থাপনা"
                    ar="إدارة التعليم"
                  />
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {schoolLogo ? (
                <img src={schoolLogo} alt="School Logo" className="w-12 h-12 rounded-lg object-cover shadow-sm ring-2 ring-white/50" />
              ) : (
                <Logo size="lg" />
              )}
              <div className="flex flex-col">
                <h1 className="text-slate-800 text-xl font-bold">
                  {schoolName || 'EduBD Pro'}
                </h1>
                {currentAcademicYear && (
                  <p className="text-sm text-slate-500 font-medium">
                    {currentAcademicYear.nameBn || currentAcademicYear.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Enhanced search section with quick actions for desktop */}
        {!isMobile && (
          <div className="flex items-center gap-4 flex-1 max-w-2xl ml-16">
            {/* Global search with keyboard shortcut */}
            <div className="relative flex-1 max-w-md">
              <SearchInput />
              <span 
                className="material-icons absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none"
                aria-hidden="true"
              >
                search
              </span>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <kbd className="px-2 py-0.5 text-xs font-mono bg-slate-200/80 text-slate-600 rounded border">
                  ⌘K
                </kbd>
              </div>
            </div>
            
            {/* Quick action buttons */}
            <div className="flex items-center gap-1">
              <Link href="/admin/documents">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex items-center gap-2 text-slate-600 hover:text-primary hover:bg-primary/5 rounded-lg px-3 py-2"
                  title="Quick document generation"
                  data-testid="button-new-document"
                >
                  <span className="material-icons text-base">add_circle_outline</span>
                  <span className="hidden lg:inline text-sm font-medium">
                    <LanguageText
                      en="New Document"
                      bn="নতুন ডকুমেন্ট"
                      ar="مستند جديد"
                    />
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Mobile Quick Actions */}
        {isMobile && (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-9 w-9"
              title="Quick search"
            >
              <span className="material-icons text-lg">search</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-9 w-9"
                  title="Quick actions"
                >
                  <span className="material-icons text-lg">add_circle_outline</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <Link href="/admin/documents">
                  <DropdownMenuItem data-testid="menu-new-document">
                    <span className="material-icons text-base mr-3">description</span>
                    <LanguageText
                      en="New Document"
                      bn="নতুন ডকুমেন্ট"
                      ar="مستند جديد"
                    />
                  </DropdownMenuItem>
                </Link>
                <Link href="/students">
                  <DropdownMenuItem data-testid="menu-add-student">
                    <span className="material-icons text-base mr-3">people</span>
                    <LanguageText
                      en="Add Student"
                      bn="শিক্ষার্থী যোগ"
                      ar="إضافة طالب"
                    />
                  </DropdownMenuItem>
                </Link>
                <Link href="/teachers">
                  <DropdownMenuItem data-testid="menu-add-teacher">
                    <span className="material-icons text-base mr-3">school</span>
                    <LanguageText
                      en="Add Teacher"
                      bn="শিক্ষক যোগ"
                      ar="إضافة معلم"
                    />
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <Link href="/calendar">
                  <DropdownMenuItem data-testid="menu-calendar-event">
                    <span className="material-icons text-base mr-3">event</span>
                    <LanguageText
                      en="Calendar Event"
                      bn="ক্যালেন্ডার ইভেন্ট"
                      ar="حدث التقويم"
                    />
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Enhanced right actions with better spacing and hierarchy */}
        <div className="flex items-center gap-2" role="toolbar" aria-label="User actions">
          
          {/* System status indicator - shows connection status */}
          {!isMobile && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50/80 border border-green-200/60 rounded-lg mr-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700">
                <LanguageText
                  en="Online"
                  bn="অনলাইন"
                  ar="متصل"
                />
              </span>
            </div>
          )}

          {/* Enhanced notifications with better visual design */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="relative rounded-lg h-10 w-10 hover:bg-slate-100/80 border border-transparent hover:border-slate-200/60 transition-all duration-200"
                aria-label={`Notifications (${unreadCount} unread)`}
                data-testid="button-notifications"
              >
                <span className="material-icons text-slate-600" aria-hidden="true">notifications</span>
                {unreadCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                    aria-label={`${unreadCount} unread notifications`}
                    data-testid="text-notification-count"
                  >
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 shadow-lg border border-slate-200/80">
              <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200/60 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-800">
                    <LanguageText
                      en="Notifications"
                      bn="নোটিফিকেশন"
                      ar="الإشعارات"
                    />
                  </h3>
                  {unreadCount > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-primary text-xs hover:bg-primary/5" data-testid="button-mark-all-read">
                    <LanguageText
                      en="Mark All Read"
                      bn="সব পড়া হয়েছে"
                      ar="تحديد الكل كمقروء"
                    />
                  </Button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification, index) => {
                    const getNotificationIcon = (type: string) => {
                      switch (type) {
                        case 'exam': return 'assignment';
                        case 'fee': return 'receipt';
                        case 'admission': return 'group';
                        case 'event': return 'event';
                        default: return 'notifications';
                      }
                    };
                    
                    const getNotificationColor = (priority: string) => {
                      switch (priority) {
                        case 'high': return 'blue';
                        case 'urgent': return 'red';
                        case 'medium': return 'green';
                        default: return 'slate';
                      }
                    };
                    
                    const color = getNotificationColor(notification.priority || 'medium');
                    const icon = getNotificationIcon(notification.type || 'info');
                    
                    return (
                      <div 
                        key={notification.id} 
                        className={`px-4 py-3 hover:bg-slate-50/80 ${index === 0 ? `border-l-4 border-l-${color}-400 bg-${color}-50/30` : ''} transition-colors`}
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-0.5 bg-gradient-to-br from-${color}-500 to-${color}-600 text-white rounded-lg h-10 w-10 flex items-center justify-center flex-shrink-0 shadow-sm`}>
                            <span className="material-icons text-sm">{icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {notification.title_bn || notification.title}
                            </p>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {notification.message_bn || notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-slate-500 font-medium">
                                {new Date(notification.created_at).toLocaleDateString('bn-BD')}
                              </span>
                              {index === 0 && (
                                <>
                                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                  <span className={`text-xs text-${color}-600 font-medium`}>
                                    <LanguageText en="New" bn="নতুন" ar="جديد" />
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-8 text-center">
                    <span className="material-icons text-4xl text-slate-300">notifications_none</span>
                    <p className="text-sm text-slate-500 mt-2">
                      <LanguageText
                        en="No new notifications"
                        bn="কোন নতুন নোটিফিকেশন নেই"
                        ar="لا توجد إشعارات جديدة"
                      />
                    </p>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-200/60 p-3 bg-slate-50/50">
                <Link href="/notifications">
                  <Button variant="ghost" size="sm" className="w-full justify-center text-primary hover:bg-primary/5 font-medium" data-testid="button-view-all-notifications">
                    <span className="material-icons text-base mr-2">visibility</span>
                    <LanguageText
                      en="View All Notifications"
                      bn="সকল নোটিফিকেশন দেখুন"
                      ar="عرض جميع الإشعارات"
                    />
                  </Button>
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Enhanced language selector */}
          <LanguageSelector />

          {/* Enhanced user menu with better design */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-3 rounded-lg px-3 py-2 h-12 hover:bg-slate-100/80 border border-transparent hover:border-slate-200/60 transition-all duration-200" 
                aria-label="User menu"
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center shadow-sm ring-2 ring-white/50">
                    <span className="material-icons text-white text-lg">person</span>
                  </div>
                  {/* Online status indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                </div>
                {!isMobile && (
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-sm font-semibold text-slate-800 truncate max-w-[120px]" title={user?.user_metadata?.full_name || user?.email || 'Admin'}>
                      {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      <LanguageText
                        en="Super Admin"
                        bn="সুপার এডমিন"
                        ar="مشرف عام"
                      />
                    </span>
                  </div>
                )}
                {!isMobile && (
                  <span className="material-icons text-slate-400 text-lg ml-1">expand_more</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 shadow-lg border border-slate-200/80">
              {user && (
                <>
                  {/* Enhanced user info header */}
                  <div className="px-4 py-4 bg-gradient-to-r from-slate-50/50 to-white border-b border-slate-200/60">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center shadow-md">
                          <span className="material-icons text-white text-xl">person</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin'}</p>
                        <p className="text-xs text-slate-600 truncate">{user.email || 'admin@edubd.com'}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-green-600 font-medium">
                            <LanguageText
                              en="Active now"
                              bn="এখন সক্রিয়"
                              ar="نشط الآن"
                            />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick stats with real data */}
                  <div className="px-4 py-3 border-b border-slate-200/60">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <Link href="/students">
                        <div className="bg-blue-50/80 rounded-lg py-2 px-3 cursor-pointer hover:bg-blue-100/80 transition-colors" data-testid="stat-students">
                          <div className="text-lg font-bold text-blue-600">{counts.students || 0}</div>
                          <div className="text-xs text-blue-700 font-medium">
                            <LanguageText
                              en="Students"
                              bn="শিক্ষার্থী"
                              ar="الطلاب"
                            />
                          </div>
                        </div>
                      </Link>
                      <Link href="/teachers">
                        <div className="bg-green-50/80 rounded-lg py-2 px-3 cursor-pointer hover:bg-green-100/80 transition-colors" data-testid="stat-teachers">
                          <div className="text-lg font-bold text-green-600">{counts.teachers || 0}</div>
                          <div className="text-xs text-green-700 font-medium">
                            <LanguageText
                              en="Teachers"
                              bn="শিক্ষক"
                              ar="المعلمون"
                            />
                          </div>
                        </div>
                      </Link>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-2">
                    <DropdownMenuItem className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <span className="material-icons text-slate-600 text-base">account_circle</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-800">
                          <LanguageText
                            en="Profile Settings"
                            bn="প্রোফাইল সেটিংস"
                            ar="إعدادات الملف الشخصي"
                          />
                        </div>
                        <div className="text-xs text-slate-500">
                          <LanguageText
                            en="Manage your account"
                            bn="আপনার অ্যাকাউন্ট পরিচালনা করুন"
                            ar="إدارة حسابك"
                          />
                        </div>
                      </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <span className="material-icons text-slate-600 text-base">tune</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-800">
                          <LanguageText
                            en="System Settings"
                            bn="সিস্টেম সেটিংস"
                            ar="إعدادات النظام"
                          />
                        </div>
                        <div className="text-xs text-slate-500">
                          <LanguageText
                            en="Configure application"
                            bn="অ্যাপ্লিকেশন কনফিগার করুন"
                            ar="تكوين التطبيق"
                          />
                        </div>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <span className="material-icons text-slate-600 text-base">help_outline</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-800">
                          <LanguageText
                            en="Help & Support"
                            bn="সাহায্য ও সহায়তা"
                            ar="المساعدة والدعم"
                          />
                        </div>
                        <div className="text-xs text-slate-500">
                          <LanguageText
                            en="Get assistance"
                            bn="সহায়তা নিন"
                            ar="احصل على المساعدة"
                          />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator />
                  
                  <div className="p-2">
                    <DropdownMenuItem 
                      className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50/80 hover:text-red-700 rounded-lg transition-all duration-200" 
                      onClick={handleLogout}
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                        <span className="material-icons text-red-600 text-base">logout</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">
                          <LanguageText
                            en="Sign Out"
                            bn="লগআউট"
                            ar="تسجيل الخروج"
                          />
                        </div>
                        <div className="text-xs opacity-80">
                          <LanguageText
                            en="End current session"
                            bn="বর্তমান সেশন শেষ করুন"
                            ar="إنهاء الجلسة الحالية"
                          />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
