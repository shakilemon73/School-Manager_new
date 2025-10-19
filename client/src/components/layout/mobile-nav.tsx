import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { Link } from 'wouter';
import { LanguageText } from '@/components/ui/language-text';
import { useState } from 'react';
import { useNavigationCounts } from '@/hooks/use-navigation-counts';
import { 
  Home, 
  Users, 
  FileText, 
  CreditCard, 
  Package, 
  Settings, 
  Calendar, 
  Bell, 
  GraduationCap, 
  UserCheck, 
  Briefcase, 
  Users2, 
  BookOpen, 
  Bus, 
  Wrench, 
  Star, 
  Shield,
  Menu,
  X,
  ChevronRight,
  ClipboardCheck,
  Wallet,
  Megaphone,
  MessageSquare,
  Trophy,
  AlertTriangle,
  Heart,
  Syringe,
  Activity,
  ShieldCheck,
  BarChart,
  Building2,
  Utensils,
  BedDouble,
  ClipboardList,
  UserCog,
  Truck,
  ShoppingCart,
  Award,
  Globe,
  Key
} from 'lucide-react';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';

interface NavGroup {
  id: string;
  titleEn: string;
  titleBn: string;
  titleAr: string;
  icon: any;
  color: string;
  directLink?: string;
  items: Array<{
    path: string;
    icon: any;
    textEn: string;
    textBn: string;
    textAr: string;
    badge?: number | null;
  }>;
}

export function MobileNav() {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useSupabaseDirectAuth();
  const { counts } = useNavigationCounts();

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  // Same navigation structure as desktop sidebar
  const navGroups: NavGroup[] = [
    {
      id: "dashboard",
      titleEn: "Overview",
      titleBn: "সংক্ষিপ্ত বিবরণ",
      titleAr: "نظرة عامة",
      icon: Home,
      color: "blue",
      items: [
        { path: "/", icon: Home, textEn: "Dashboard", textBn: "ড্যাশবোর্ড", textAr: "لوحة التحكم", badge: null },
        { path: "/calendar", icon: Calendar, textEn: "Calendar", textBn: "ক্যালেন্ডার", textAr: "التقويم", badge: null },
        { path: "/notifications", icon: Bell, textEn: "Notifications", textBn: "নোটিফিকেশন", textAr: "الإشعارات", badge: counts.notifications || null }
      ]
    },
    {
      id: "academic",
      titleEn: "Academic Management",
      titleBn: "একাডেমিক ব্যবস্থাপনা",
      titleAr: "الإدارة الأكاديمية",
      icon: GraduationCap,
      color: "purple",
      items: [
        { path: "/academic/subjects", icon: BookOpen, textEn: "Subjects", textBn: "বিষয়সমূহ", textAr: "المواد", badge: null },
        { path: "/academic/gradebook", icon: ClipboardList, textEn: "Gradebook", textBn: "গ্রেডবুক", textAr: "سجل الدرجات", badge: null },
        { path: "/academic/results-management", icon: Award, textEn: "Results Management", textBn: "ফলাফল ব্যবস্থাপনা", textAr: "إدارة النتائج", badge: null },
        { path: "/academic/attendance-management", icon: UserCheck, textEn: "Attendance Management", textBn: "উপস্থিতি ব্যবস্থাপনা", textAr: "إدارة الحضور", badge: null },
        { path: "/academic/assignments", icon: FileText, textEn: "Assignments", textBn: "অ্যাসাইনমেন্ট", textAr: "الواجبات", badge: null },
        { path: "/academic/timetable", icon: Calendar, textEn: "Timetable", textBn: "সময়সূচী", textAr: "الجدول", badge: null }
      ]
    },
    {
      id: "exam-management",
      titleEn: "Exam Management",
      titleBn: "পরীক্ষা ব্যবস্থাপনা",
      titleAr: "إدارة الامتحانات",
      icon: ClipboardCheck,
      color: "violet",
      items: [
        { path: "/exam-management/scheduling", icon: Calendar, textEn: "Exam Scheduling", textBn: "পরীক্ষার সময়সূচী", textAr: "جدولة الامتحانات", badge: null },
        { path: "/exam-management/seating-arrangements", icon: Users, textEn: "Seating Arrangements", textBn: "আসন বিন্যাস", textAr: "ترتيب المقاعد", badge: null },
        { path: "/exam-management/invigilation-duties", icon: ShieldCheck, textEn: "Invigilation Duties", textBn: "তত্ত্বাবধান দায়িত্ব", textAr: "واجبات المراقبة", badge: null },
        { path: "/exam-management/public-portal-settings", icon: Globe, textEn: "Public Portal Settings", textBn: "পাবলিক পোর্টাল সেটিংস", textAr: "إعدادات البوابة العامة", badge: null }
      ]
    },
    {
      id: "people",
      titleEn: "People Management",
      titleBn: "ব্যক্তি ব্যবস্থাপনা",
      titleAr: "إدارة الأشخاص",
      icon: Users,
      color: "green",
      items: [
        { path: "/management/students", icon: GraduationCap, textEn: "Students", textBn: "শিক্ষার্থী", textAr: "الطلاب", badge: counts.students || null },
        { path: "/management/teachers", icon: UserCheck, textEn: "Teachers", textBn: "শিক্ষক", textAr: "المعلمون", badge: counts.teachers || null },
        { path: "/management/staff", icon: Briefcase, textEn: "Staff", textBn: "কর্মচারী", textAr: "الموظفون", badge: counts.staff || null },
        { path: "/management/parents", icon: Users2, textEn: "Parents", textBn: "অভিভাবক", textAr: "أولياء الأمور", badge: counts.parents || null },
        { path: "/portal-users", icon: Key, textEn: "Portal Users", textBn: "পোর্টাল ইউজার", textAr: "مستخدمي البوابة", badge: null }
      ]
    },
    {
      id: "documents",
      titleEn: "Documents & Reports",
      titleBn: "ডকুমেন্ট ও রিপোর্ট",
      titleAr: "المستندات والتقارير",
      icon: FileText,
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
      color: "teal",
      items: [
        { path: "/management/library", icon: BookOpen, textEn: "Library", textBn: "লাইব্রেরী", textAr: "المكتبة", badge: counts.library_books || null },
        { path: "/management/inventory", icon: Package, textEn: "Inventory", textBn: "ইনভেন্টরি", textAr: "المخزون", badge: counts.inventory_items || null },
        { path: "/inventory/vendors", icon: Truck, textEn: "Vendors", textBn: "সরবরাহকারী", textAr: "الموردون", badge: null },
        { path: "/inventory/purchase-orders", icon: ShoppingCart, textEn: "Purchase Orders", textBn: "ক্রয় আদেশ", textAr: "أوامر الشراء", badge: null },
        { path: "/inventory/stock-alerts", icon: Bell, textEn: "Stock Alerts", textBn: "স্টক সতর্কতা", textAr: "تنبيهات المخزون", badge: null },
        { path: "/management/transport", icon: Bus, textEn: "Transport", textBn: "ট্রান্সপোর্ট", textAr: "النقل", badge: null }
      ]
    },
    {
      id: "tools",
      titleEn: "Digital Tools",
      titleBn: "ডিজিটাল টুলস",
      titleAr: "الأدوات الرقمية",
      icon: Wrench,
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
      color: "indigo",
      items: [
        { path: "/hr/leave-management", icon: Calendar, textEn: "Leave Management", textBn: "ছুটি ব্যবস্থাপনা", textAr: "إدارة الإجازات", badge: null },
        { path: "/hr/staff-attendance", icon: ClipboardCheck, textEn: "Staff Attendance", textBn: "কর্মচারী উপস্থিতি", textAr: "حضور الموظفين", badge: null },
        { path: "/hr/payroll", icon: Wallet, textEn: "Payroll System", textBn: "বেতন ব্যবস্থা", textAr: "نظام الرواتب", badge: null },
        { path: "/hr/performance-appraisal", icon: UserCog, textEn: "Performance Appraisal", textBn: "কর্মক্ষমতা মূল্যায়ন", textAr: "تقييم الأداء", badge: null }
      ]
    },
    {
      id: "communication",
      titleEn: "Communication",
      titleBn: "যোগাযোগ",
      titleAr: "الاتصالات",
      icon: MessageSquare,
      color: "blue",
      items: [
        { path: "/communication/announcements", icon: Megaphone, textEn: "Announcements", textBn: "ঘোষণা", textAr: "الإعلانات", badge: null },
        { path: "/communication/notifications", icon: Bell, textEn: "Notifications", textBn: "বিজ্ঞপ্তি", textAr: "الإشعارات", badge: null },
        { path: "/communication/messaging", icon: MessageSquare, textEn: "Parent-Teacher Messaging", textBn: "অভিভাবক-শিক্ষক বার্তা", textAr: "رسائل أولياء الأمور والمعلمين", badge: null }
      ]
    },
    {
      id: "student-welfare",
      titleEn: "Student Welfare",
      titleBn: "শিক্ষার্থী কল্যাণ",
      titleAr: "رعاية الطلاب",
      icon: Trophy,
      color: "rose",
      items: [
        { path: "/student-welfare/activities", icon: Trophy, textEn: "Co-curricular Activities", textBn: "সহশিক্ষা কার্যক্রম", textAr: "الأنشطة اللامنهجية", badge: null },
        { path: "/student-welfare/disciplinary", icon: AlertTriangle, textEn: "Disciplinary Records", textBn: "শৃঙ্খলা রেকর্ড", textAr: "السجلات التأديبية", badge: null },
        { path: "/student-welfare/health", icon: Heart, textEn: "Health Records", textBn: "স্বাস্থ্য রেকর্ড", textAr: "السجلات الصحية", badge: null },
        { path: "/student-welfare/medical-checkups", icon: Activity, textEn: "Medical Checkups", textBn: "চিকিৎসা পরীক্ষা", textAr: "الفحوصات الطبية", badge: null },
        { path: "/student-welfare/vaccinations", icon: Syringe, textEn: "Vaccinations", textBn: "টিকাকরণ", textAr: "التطعيمات", badge: null }
      ]
    },
    {
      id: "reports",
      titleEn: "Reports & Analytics",
      titleBn: "রিপোর্ট ও বিশ্লেষণ",
      titleAr: "التقارير والتحليلات",
      icon: BarChart,
      color: "yellow",
      items: [
        { path: "/reports", icon: BarChart, textEn: "Reports Dashboard", textBn: "রিপোর্ট ড্যাশবোর্ড", textAr: "لوحة التقارير", badge: null },
        { path: "/reports/custom-builder", icon: ClipboardList, textEn: "Custom Report Builder", textBn: "কাস্টম রিপোর্ট তৈরি", textAr: "منشئ التقارير المخصص", badge: null }
      ]
    },
    {
      id: "hostel",
      titleEn: "Hostel Management",
      titleBn: "হোস্টেল ব্যবস্থাপনা",
      titleAr: "إدارة السكن",
      icon: Home,
      color: "pink",
      items: [
        { path: "/hostel", icon: Building2, textEn: "Hostel Overview", textBn: "হোস্টেল ওভারভিউ", textAr: "نظرة عامة على السكن", badge: null },
        { path: "/hostel/rooms", icon: BedDouble, textEn: "Room Management", textBn: "রুম ব্যবস্থাপনা", textAr: "إدارة الغرف", badge: null },
        { path: "/hostel/meals", icon: Utensils, textEn: "Meal Management", textBn: "খাবার ব্যবস্থাপনা", textAr: "إدارة الوجبات", badge: null },
        { path: "/hostel/attendance", icon: ClipboardCheck, textEn: "Hostel Attendance", textBn: "হোস্টেল উপস্থিতি", textAr: "حضور السكن", badge: null }
      ]
    },
    {
      id: "admission",
      titleEn: "Admission Portal",
      titleBn: "ভর্তি পোর্টাল",
      titleAr: "بوابة القبول",
      icon: Users,
      color: "cyan",
      items: [
        { path: "/admission", icon: FileText, textEn: "Admission Portal", textBn: "ভর্তি পোর্টাল", textAr: "بوابة القبول", badge: null },
        { path: "/admission/tests", icon: ClipboardList, textEn: "Admission Tests", textBn: "ভর্তি পরীক্ষা", textAr: "اختبارات القبول", badge: null },
        { path: "/admission/interviews", icon: Users2, textEn: "Interviews", textBn: "সাক্ষাৎকার", textAr: "المقابلات", badge: null }
      ]
    },
    {
      id: "settings",
      titleEn: "System Settings",
      titleBn: "সিস্টেম সেটিংস",
      titleAr: "إعدادات النظام",
      icon: Settings,
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
      violet: active ? 'bg-violet-50 text-violet-700 border-violet-200' : 'hover:bg-violet-50 hover:text-violet-700',
      orange: active ? 'bg-orange-50 text-orange-700 border-orange-200' : 'hover:bg-orange-50 hover:text-orange-700',
      teal: active ? 'bg-teal-50 text-teal-700 border-teal-200' : 'hover:bg-teal-50 hover:text-teal-700',
      slate: active ? 'bg-slate-50 text-slate-700 border-slate-200' : 'hover:bg-slate-50 hover:text-slate-700',
      gray: active ? 'bg-gray-50 text-gray-700 border-gray-200' : 'hover:bg-gray-50 hover:text-gray-700',
      emerald: active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'hover:bg-emerald-50 hover:text-emerald-700',
      indigo: active ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'hover:bg-indigo-50 hover:text-indigo-700',
      rose: active ? 'bg-rose-50 text-rose-700 border-rose-200' : 'hover:bg-rose-50 hover:text-rose-700',
      cyan: active ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'hover:bg-cyan-50 hover:text-cyan-700',
      yellow: active ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'hover:bg-yellow-50 hover:text-yellow-700',
      pink: active ? 'bg-pink-50 text-pink-700 border-pink-200' : 'hover:bg-pink-50 hover:text-pink-700'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const QuickNavItem = ({ 
    path, 
    icon: Icon, 
    textEn, 
    textBn, 
    textAr 
  }: { 
    path: string; 
    icon: any; 
    textEn: string; 
    textBn: string; 
    textAr: string; 
  }) => (
    <li className="flex-1 max-w-[100px]">
      <Link 
        href={path}
        className={cn(
          "flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200",
          isActive(path) 
            ? "text-blue-600 bg-blue-50 font-semibold" 
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100"
        )}
        aria-current={isActive(path) ? 'page' : undefined}
      >
        <Icon 
          className={cn(
            "h-5 w-5 mb-1 transition-transform",
            isActive(path) && "scale-110"
          )} 
          aria-hidden="true"
        />
        <span className="text-[10px] leading-tight text-center line-clamp-1">
          <LanguageText
            en={textEn}
            bn={textBn}
            ar={textAr}
          />
        </span>
      </Link>
    </li>
  );

  return (
    <>
      {/* Full Navigation Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
          <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.email?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate text-sm">
                    {user?.email || 'Admin User'}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    <LanguageText en="Super Admin" bn="সুপার অ্যাডমিন" ar="مشرف عام" />
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Navigation Groups */}
            <div className="py-4">
              {navGroups.map((group) => (
                <div key={group.id} className="mb-2">
                  {group.directLink ? (
                    <Link 
                      href={group.directLink}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "mx-3 mb-2 p-3 rounded-lg border transition-all duration-200 flex items-center justify-between",
                        isActive(group.directLink) 
                          ? getColorClasses(group.color, true)
                          : `border-transparent hover:border-gray-200 ${getColorClasses(group.color)}`
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <group.icon className="h-5 w-5" />
                        <span className="text-sm font-medium">
                          <LanguageText 
                            en={group.titleEn} 
                            bn={group.titleBn} 
                            ar={group.titleAr} 
                          />
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    </Link>
                  ) : (
                    <>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <LanguageText 
                          en={group.titleEn} 
                          bn={group.titleBn} 
                          ar={group.titleAr} 
                        />
                      </div>
                      <div className="space-y-1">
                        {group.items.map((item) => (
                          <Link
                            key={item.path}
                            href={item.path}
                            onClick={() => setIsMenuOpen(false)}
                            className={cn(
                              "mx-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-3",
                              isActive(item.path)
                                ? getColorClasses(group.color, true)
                                : `text-gray-700 hover:bg-gray-50 ${getColorClasses(group.color)}`
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            <span className="flex-1">
                              <LanguageText 
                                en={item.textEn} 
                                bn={item.textBn} 
                                ar={item.textAr} 
                              />
                            </span>
                            {item.badge && (
                              <span className="ml-auto bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar - Mobile Only */}
      <nav 
        className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 fixed bottom-0 left-0 right-0 z-50 shadow-lg backdrop-blur-sm bg-white/95 dark:bg-gray-900/95"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <ul className="flex items-stretch justify-between px-2 py-1 gap-1 max-w-screen-sm mx-auto" role="menubar">
          <QuickNavItem 
            path="/" 
            icon={Home}
            textEn="Home"
            textBn="হোম"
            textAr="الرئيسية"
          />
          <QuickNavItem 
            path="/documents" 
            icon={FileText}
            textEn="Docs"
            textBn="ডকুমেন্ট"
            textAr="مستند"
          />
          <QuickNavItem 
            path="/management/students" 
            icon={GraduationCap}
            textEn="Students"
            textBn="শিক্ষার্থী"
            textAr="طلاب"
          />
          
          {/* Menu Button */}
          <li className="flex-1 max-w-[100px]">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="w-full flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 mb-1" />
              <span className="text-[10px] leading-tight text-center line-clamp-1 font-medium">
                <LanguageText
                  en="Menu"
                  bn="মেনু"
                  ar="قائمة"
                />
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
