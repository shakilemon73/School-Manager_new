import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { Link } from 'wouter';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';
import { LanguageText } from '@/components/ui/language-text';
import { useUXNav } from '@/hooks/use-design-system';
import { 
  ChevronDown, 
  ChevronRight, 
  Star, 
  Clock, 
  Users, 
  FileText, 
  CreditCard, 
  BookOpen, 
  Package, 
  Bus, 
  Settings, 
  Zap,
  Home,
  Calendar,
  Bell,
  GraduationCap,
  UserCheck,
  Briefcase,
  Users2,
  Wrench,
  Shield,
  Search,
  Key
} from 'lucide-react';

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useSupabaseDirectAuth();
  const navRef = useUXNav();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['dashboard', 'people']));
  const [searchTerm, setSearchTerm] = useState('');
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Track navigation usage for recent items
  useEffect(() => {
    if (location !== '/') {
      const newRecent = [location, ...recentlyUsed.filter(path => path !== location)].slice(0, 3);
      setRecentlyUsed(newRecent);
    }
  }, [location]);

  // Keyboard shortcuts for better UX
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            searchInputRef.current?.focus();
            break;
          case '1':
            e.preventDefault();
            window.location.href = '/';
            break;
          case '2':
            e.preventDefault();
            window.location.href = '/documents';
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };
  
  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // Enhanced navigation structure following UX principles
  const navGroups = [
    {
      id: "dashboard",
      titleEn: "Overview",
      titleBn: "সংক্ষিপ্ত বিবরণ",
      titleAr: "نظرة عامة",
      icon: Home,
      priority: "high",
      color: "blue",
      items: [
        { path: "/", icon: Home, textEn: "Dashboard", textBn: "ড্যাশবোর্ড", textAr: "لوحة التحكم", badge: null, shortcut: "⌘1" },
        { path: "/calendar", icon: Calendar, textEn: "Calendar", textBn: "ক্যালেন্ডার", textAr: "التقويم", badge: null },
        { path: "/notifications", icon: Bell, textEn: "Notifications", textBn: "নোটিফিকেশন", textAr: "الإشعارات", badge: 3 }
      ]
    },
    {
      id: "academic",
      titleEn: "Academic Management",
      titleBn: "একাডেমিক ব্যবস্থাপনা",
      titleAr: "الإدارة الأكاديمية",
      icon: GraduationCap,
      priority: "high",
      color: "purple",
      items: [
        { path: "/academic/subjects", icon: BookOpen, textEn: "Subjects", textBn: "বিষয়সমূহ", textAr: "المواد", badge: null },
        { path: "/academic/assignments", icon: FileText, textEn: "Assignments", textBn: "অ্যাসাইনমেন্ট", textAr: "الواجبات", badge: null },
        { path: "/academic/timetable", icon: Calendar, textEn: "Timetable", textBn: "সময়সূচী", textAr: "الجدول", badge: null }
      ]
    },
    {
      id: "people",
      titleEn: "People Management",
      titleBn: "ব্যক্তি ব্যবস্থাপনা",
      titleAr: "إدارة الأشخاص",
      icon: Users,
      priority: "high",
      color: "green",
      items: [
        { path: "/management/students", icon: GraduationCap, textEn: "Students", textBn: "শিক্ষার্থী", textAr: "الطلاب", badge: 245 },
        { path: "/management/teachers", icon: UserCheck, textEn: "Teachers", textBn: "শিক্ষক", textAr: "المعلمون", badge: 18 },
        { path: "/management/staff", icon: Briefcase, textEn: "Staff", textBn: "কর্মচারী", textAr: "الموظفون", badge: 12 },
        { path: "/management/parents", icon: Users2, textEn: "Parents", textBn: "অভিভাবক", textAr: "أولياء الأمور", badge: null },
        { path: "/portal-users", icon: Key, textEn: "Portal Users", textBn: "পোর্টাল ইউজার", textAr: "مستخدمي البوابة", badge: null }
      ]
    },
    {
      id: "documents",
      titleEn: "Documents & Reports",
      titleBn: "ডকুমেন্ট ও রিপোর্ট",
      titleAr: "المستندات والتقارير",
      icon: FileText,
      priority: "high",
      color: "purple",
      directLink: "/documents",
      items: []
    },
    {
      id: "financial",
      titleEn: "Finance & Payments",
      titleBn: "অর্থ ও পেমেন্ট",
      titleAr: "المالية والمدفوعات",
      icon: CreditCard,
      priority: "high",
      color: "orange",
      directLink: "/management/finances",
      items: []
    },
    {
      id: "resources",
      titleEn: "School Resources",
      titleBn: "স্কুল রিসোর্স",
      titleAr: "موارد المدرسة",
      icon: Package,
      priority: "medium",
      color: "teal",
      items: [
        { path: "/management/library", icon: BookOpen, textEn: "Library", textBn: "লাইব্রেরী", textAr: "المكتبة", badge: 5 },
        { path: "/management/inventory", icon: Package, textEn: "Inventory", textBn: "ইনভেন্টরি", textAr: "المخزون", badge: 8 },
        { path: "/management/transport", icon: Bus, textEn: "Transport", textBn: "ট্রান্সপোর্ট", textAr: "النقل", badge: null }
      ]
    },
    {
      id: "tools",
      titleEn: "Digital Tools",
      titleBn: "ডিজিটাল টুলস", 
      titleAr: "الأدوات الرقمية",
      icon: Wrench,
      priority: "low",
      color: "slate",
      directLink: "/tools",
      items: []
    },
    {
      id: "credits",
      titleEn: "Credits & Billing",
      titleBn: "ক্রেডিট ও বিলিং",
      titleAr: "الأرصدة والفوترة",
      icon: CreditCard,
      priority: "medium",
      color: "emerald",
      directLink: "/credits",
      items: []
    },
    {
      id: "hr",
      titleEn: "HR & Staff",
      titleBn: "এইচআর ও কর্মীবৃন্দ",
      titleAr: "الموارد البشرية",
      icon: Briefcase,
      priority: "medium",
      color: "indigo",
      items: [
        { path: "/hr/leave-management", icon: Calendar, textEn: "Leave Management", textBn: "ছুটি ব্যবস্থাপনা", textAr: "إدارة الإجازات", badge: null }
      ]
    },
    {
      id: "reports",
      titleEn: "Reports & Analytics",
      titleBn: "রিপোর্ট ও বিশ্লেষণ",
      titleAr: "التقارير والتحليلات",
      icon: Zap,
      priority: "high",
      color: "yellow",
      directLink: "/reports",
      items: []
    },
    {
      id: "hostel",
      titleEn: "Hostel Management",
      titleBn: "হোস্টেল ব্যবস্থাপনা",
      titleAr: "إدارة السكن",
      icon: Home,
      priority: "medium",
      color: "pink",
      directLink: "/hostel",
      items: []
    },
    {
      id: "admission",
      titleEn: "Admission Portal",
      titleBn: "ভর্তি পোর্টাল",
      titleAr: "بوابة القبول",
      icon: Users,
      priority: "high",
      color: "cyan",
      directLink: "/admission",
      items: []
    },
    {
      id: "settings",
      titleEn: "System Settings",
      titleBn: "সিস্টেম সেটিংস",
      titleAr: "إعدادات النظام",
      icon: Settings,
      priority: "low",
      color: "gray",
      items: [
        { path: "/settings/templates", icon: Star, textEn: "Templates", textBn: "টেমপ্লেট", textAr: "القوالب", badge: null },
        { path: "/settings/academic-years", icon: Calendar, textEn: "Academic Years", textBn: "শিক্ষাবর্ষ", textAr: "السنوات الأكاديمية", badge: null },
        { path: "/settings/school", icon: Settings, textEn: "School Settings", textBn: "স্কুল সেটিংস", textAr: "إعدادات المدرسة", badge: null },
        { path: "/settings/admin", icon: Shield, textEn: "Admin Settings", textBn: "এডমিন সেটিংস", textAr: "إعدادات المشرف", badge: null }
      ]
    }
  ];

  const getColorClasses = (color: string, active: boolean = false) => {
    const colors = {
      blue: active ? 'bg-blue-50 text-blue-700 border-blue-200' : 'hover:bg-blue-50 hover:text-blue-700',
      green: active ? 'bg-green-50 text-green-700 border-green-200' : 'hover:bg-green-50 hover:text-green-700',
      purple: active ? 'bg-purple-50 text-purple-700 border-purple-200' : 'hover:bg-purple-50 hover:text-purple-700',
      orange: active ? 'bg-orange-50 text-orange-700 border-orange-200' : 'hover:bg-orange-50 hover:text-orange-700',
      teal: active ? 'bg-teal-50 text-teal-700 border-teal-200' : 'hover:bg-teal-50 hover:text-teal-700',
      slate: active ? 'bg-slate-50 text-slate-700 border-slate-200' : 'hover:bg-slate-50 hover:text-slate-700',
      gray: active ? 'bg-gray-50 text-gray-700 border-gray-200' : 'hover:bg-gray-50 hover:text-gray-700',
      emerald: active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'hover:bg-emerald-50 hover:text-emerald-700'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const filteredGroups = navGroups.filter(group => {
    if (!searchTerm) return true;
    return group.items.some(item =>
      item.textEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.textBn.includes(searchTerm) ||
      item.textAr.includes(searchTerm)
    );
  });

  return (
    <aside 
      ref={navRef}
      className="w-72 bg-white border-r border-gray-200 hidden md:block overflow-y-auto h-screen"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Enhanced Header with User Profile */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">
              {user?.email || 'Admin User'}
            </h3>
            <p className="text-sm text-gray-500 truncate">
              <LanguageText en="Super Admin" bn="সুপার অ্যাডমিন" ar="مشرف عام" />
            </p>
          </div>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        </div>
      </div>

      {/* Quick Search */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search navigation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute left-3 top-2.5 text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <div className="absolute right-3 top-2.5 text-xs text-gray-400">
            ⌘K
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-gray-100">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          <LanguageText en="Quick Actions" bn="দ্রুত কার্যক্রম" ar="إجراءات سريعة" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/"
            className={cn(
              "flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200 group",
              isActive("/") 
                ? "bg-blue-50 border-blue-200 text-blue-700" 
                : "bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
            )}
          >
            <Home className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">
              <LanguageText en="Dashboard" bn="ড্যাশবোর্ড" ar="لوحة التحكم" />
            </span>
          </Link>
          <Link
            href="/documents"
            className={cn(
              "flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200 group",
              isActive("/documents") 
                ? "bg-purple-50 border-purple-200 text-purple-700" 
                : "bg-gray-50 border-gray-200 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700"
            )}
          >
            <FileText className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">
              <LanguageText en="Documents" bn="ডকুমেন্ট" ar="المستندات" />
            </span>
          </Link>
        </div>
      </div>

      {/* Recently Used */}
      {recentlyUsed.length > 0 && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <LanguageText en="Recently Used" bn="সম্প্রতি ব্যবহৃত" ar="المستخدمة مؤخراً" />
            </div>
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-1">
            {recentlyUsed.slice(0, 3).map((path, index) => {
              const item = navGroups.flatMap(g => g.items).find(i => i.path === path);
              if (!item) return null;
              
              const IconComponent = item.icon;
              return (
                <Link
                  key={index}
                  href={path}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <IconComponent className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700 flex-1 truncate">
                    <LanguageText 
                      en={item.textEn} 
                      bn={item.textBn} 
                      ar={item.textAr} 
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="p-4 space-y-2">
        {filteredGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            {group.directLink ? (
              <Link
                href={group.directLink}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 group",
                  isActive(group.directLink)
                    ? getColorClasses(group.color, true)
                    : `bg-white border-gray-200 ${getColorClasses(group.color)}`
                )}
              >
                <group.icon className="w-5 h-5" />
                <span className="flex-1 font-medium text-sm">
                  <LanguageText 
                    en={group.titleEn} 
                    bn={group.titleBn} 
                    ar={group.titleAr} 
                  />
                </span>
                {group.priority === 'high' && (
                  <Zap className="w-3 h-3 text-orange-500" />
                )}
              </Link>
            ) : (
              <Collapsible 
                open={expandedGroups.has(group.id)} 
                onOpenChange={() => toggleGroup(group.id)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200 group",
                      expandedGroups.has(group.id)
                        ? getColorClasses(group.color, true)
                        : `bg-white border-gray-200 ${getColorClasses(group.color)}`
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <group.icon className="w-5 h-5" />
                      <span className="font-medium text-sm">
                        <LanguageText 
                          en={group.titleEn} 
                          bn={group.titleBn} 
                          ar={group.titleAr} 
                        />
                      </span>
                      {group.priority === 'high' && (
                        <Zap className="w-3 h-3 text-orange-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {group.items.length}
                      </Badge>
                      {expandedGroups.has(group.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 ml-4 space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 group",
                          isActive(item.path)
                            ? getColorClasses(group.color, true)
                            : `bg-white border-gray-200 ${getColorClasses(group.color)}`
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="flex-1 text-sm font-medium">
                          <LanguageText 
                            en={item.textEn} 
                            bn={item.textBn} 
                            ar={item.textAr} 
                          />
                        </span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                        {item.shortcut && (
                          <span className="text-xs text-gray-400 font-mono">
                            {item.shortcut}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}