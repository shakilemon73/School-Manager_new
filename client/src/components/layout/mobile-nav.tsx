import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { Link } from 'wouter';
import { LanguageText } from '@/components/ui/language-text';
import { useState } from 'react';
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
  ChevronRight
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
        { path: "/notifications", icon: Bell, textEn: "Notifications", textBn: "নোটিফিকেশন", textAr: "الإشعارات", badge: 3 }
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
        { path: "/management/students", icon: GraduationCap, textEn: "Students", textBn: "শিক্ষার্থী", textAr: "الطلاب", badge: 245 },
        { path: "/management/teachers", icon: UserCheck, textEn: "Teachers", textBn: "শিক্ষক", textAr: "المعلمون", badge: 18 },
        { path: "/management/staff", icon: Briefcase, textEn: "Staff", textBn: "কর্মচারী", textAr: "الموظفون", badge: 12 },
        { path: "/management/parents", icon: Users2, textEn: "Parents", textBn: "অভিভাবক", textAr: "أولياء الأمور", badge: null }
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
      orange: active ? 'bg-orange-50 text-orange-700 border-orange-200' : 'hover:bg-orange-50 hover:text-orange-700',
      teal: active ? 'bg-teal-50 text-teal-700 border-teal-200' : 'hover:bg-teal-50 hover:text-teal-700',
      slate: active ? 'bg-slate-50 text-slate-700 border-slate-200' : 'hover:bg-slate-50 hover:text-slate-700',
      gray: active ? 'bg-gray-50 text-gray-700 border-gray-200' : 'hover:bg-gray-50 hover:text-gray-700'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const QuickNavItem = ({ 
    path, 
    icon, 
    textEn, 
    textBn, 
    textAr 
  }: { 
    path: string; 
    icon: string; 
    textEn: string; 
    textBn: string; 
    textAr: string; 
  }) => (
    <li className="text-center">
      <Link 
        href={path}
        className={cn(
          "flex flex-col items-center p-2 rounded-lg transition-colors duration-200",
          isActive(path) 
            ? "text-primary bg-primary/10" 
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        )}
        aria-current={isActive(path) ? 'page' : undefined}
      >
        <span 
          className="material-icons text-xl" 
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="text-xs mt-1 font-medium">
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

      {/* Bottom Navigation Bar */}
      <nav 
        className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-10 shadow-lg"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <ul className="flex justify-around p-2" role="menubar">
          <QuickNavItem 
            path="/" 
            icon="home" 
            textEn="Home"
            textBn="হোম"
            textAr="الرئيسية"
          />
          <QuickNavItem 
            path="/documents" 
            icon="description" 
            textEn="Documents"
            textBn="ডকুমেন্টস"
            textAr="المستندات"
          />
          <QuickNavItem 
            path="/management/students" 
            icon="people" 
            textEn="Students"
            textBn="শিক্ষার্থী"
            textAr="الطلاب"
          />
          
          {/* Menu Button */}
          <li className="text-center">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex flex-col items-center p-2 rounded-lg transition-colors duration-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            >
              <Menu className="h-5 w-5" />
              <span className="text-xs mt-1 font-medium">
                <LanguageText
                  en="Menu"
                  bn="মেনু"
                  ar="القائمة"
                />
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
