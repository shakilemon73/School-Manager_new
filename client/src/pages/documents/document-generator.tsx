import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { ResponsivePageLayout } from '@/components/layout/responsive-page-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { db, supabase } from '@/lib/supabase';
import { 
  FileText, ArrowLeft, Download, CreditCard, Zap, 
  Clock, CheckCircle, AlertTriangle, User, Users,
  Calendar, MapPin, Phone, Mail, Hash, BookOpen
} from 'lucide-react';
import { Link } from 'wouter';

interface DocumentTemplate {
  id: number;
  name: string;
  nameBn: string;
  category: string;
  description: string;
  descriptionBn: string;
  creditsRequired: number;
  fields?: string;
  templateData?: string;
  isActive: boolean;
}

interface GeneratedDocument {
  id: number;
  templateId: number;
  content: string;
  status: string;
  createdAt: string;
}

export default function DocumentGenerator() {
  const params = useParams();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const documentId = params.id;

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch all document templates from Supabase and find by type
  const { data: allTemplates, isLoading: templateLoading } = useQuery({
    queryKey: ['document-templates-all', schoolId],
    queryFn: async () => {
      return await db.getDocumentTemplatesEnhanced(schoolId);
    },
    enabled: !!schoolId
  });

  // Find the specific template by type from all templates
  const template = allTemplates?.find((t: any) => t.type === documentId || t.id.toString() === documentId);

  // Get user credit balance from Supabase
  const { data: creditBalance } = useQuery({
    queryKey: ['credit-stats', schoolId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      return await db.getCreditBalance(user.id, schoolId);
    },
    enabled: !!schoolId
  });

  // Generate document mutation using Supabase
  const generateMutation = useMutation({
    mutationFn: async (data: { templateId: number; formData: Record<string, string> }) => {
      setIsGenerating(true);
      return await db.generateDocument({
        templateId: data.templateId,
        documentType: template?.name || 'document',
        studentIds: [1], // Sample student ID
        schoolId: schoolId
      });
    },
    onSuccess: (data) => {
      toast({
        title: "ডকুমেন্ট তৈরি সফল",
        description: data.message || "ডকুমেন্ট সফলভাবে তৈরি হয়েছে",
      });
      queryClient.invalidateQueries({ queryKey: ['credit-stats'] });
      queryClient.invalidateQueries({ queryKey: ['document-user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-documents'] });
      setIsGenerating(false);
    },
    onError: (error: any) => {
      toast({
        title: "ডকুমেন্ট তৈরি ব্যর্থ",
        description: error.message || "অপর্যাপ্ত ক্রেডিট বা সিস্টেম এরর",
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  // Parse template fields
  const templateFields = template?.fields ? JSON.parse(template.fields) : [];

  // Handle form submission
  const handleGenerate = () => {
    if (!template) {
      toast({
        title: "ত্রুটি",
        description: "টেমপ্লেট পাওয়া যায়নি",
        variant: "destructive"
      });
      return;
    }

    const currentBalance = creditBalance?.currentBalance || 0;
    const requiredCredits = template?.creditsRequired || 1;

    if (currentBalance < requiredCredits) {
      toast({
        title: "অপর্যাপ্ত ক্রেডিট",
        description: `এই ডকুমেন্টের জন্য ${requiredCredits} ক্রেডিট প্রয়োজন`,
        variant: "destructive"
      });
      return;
    }

    generateMutation.mutate({
      templateId: template.id,
      formData
    });
  };

  // Handle form field changes
  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Get field display name
  const getFieldDisplayName = (fieldName: string) => {
    const fieldNames: Record<string, string> = {
      student_name: 'শিক্ষার্থীর নাম',
      student_id: 'শিক্ষার্থী আইডি',
      roll_number: 'রোল নম্বর',
      class: 'শ্রেণী',
      section: 'শাখা',
      exam_name: 'পরীক্ষার নাম',
      date: 'তারিখ',
      session: 'শিক্ষাবর্ষ',
      father_name: 'পিতার নাম',
      mother_name: 'মাতার নাম',
      address: 'ঠিকানা',
      phone: 'ফোন নম্বর',
      email: 'ইমেইল',
      birth_date: 'জন্ম তারিখ',
      blood_group: 'রক্তের গ্রুপ',
      photo: 'ছবি'
    };
    return fieldNames[fieldName] || fieldName;
  };

  if (templateLoading) {
    return (
      <AppShell>
        <ResponsivePageLayout title="লোড হচ্ছে..." description="ডকুমেন্ট টেমপ্লেট লোড হচ্ছে">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </ResponsivePageLayout>
      </AppShell>
    );
  }

  if (!template) {
    return (
      <AppShell>
        <ResponsivePageLayout title="ডকুমেন্ট পাওয়া যায়নি" description="অনুরোধকৃত ডকুমেন্ট খুঁজে পাওয়া যায়নি">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">ডকুমেন্ট পাওয়া যায়নি</h3>
            <p className="text-gray-600 mb-4">অনুরোধকৃত ডকুমেন্ট টেমপ্লেট খুঁজে পাওয়া যায়নি</p>
            <Link href="/documents">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                ডকুমেন্ট তালিকায় ফিরুন
              </Button>
            </Link>
          </div>
        </ResponsivePageLayout>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ResponsivePageLayout
        title={language === 'bn' ? template.nameBn : template.name}
        description={language === 'bn' ? template.descriptionBn : template.description}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link href="/documents">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                ফিরে যান
              </Button>
            </Link>
            
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="font-semibold text-orange-600">
                <CreditCard className="h-3 w-3 mr-1" />
                {template.creditsRequired} ক্রেডিট
              </Badge>
              <Badge variant="secondary">
                {template.category}
              </Badge>
            </div>
          </div>

          {/* Credit Balance Warning */}
          {creditBalance && creditBalance.currentBalance < template.creditsRequired && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-red-800 font-semibold">অপর্যাপ্ত ক্রেডিট</p>
                    <p className="text-red-700 text-sm">
                      আপনার কাছে {creditBalance.currentBalance} ক্রেডিট আছে, প্রয়োজন {template.creditsRequired} ক্রেডিট
                    </p>
                  </div>
                  <Link href="/credits/supabase-dashboard">
                    <Button size="sm" className="bg-red-600 hover:bg-red-700">
                      ক্রেডিট কিনুন
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Fields */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>ডকুমেন্ট তথ্য</span>
                </CardTitle>
                <CardDescription>
                  ডকুমেন্ট তৈরির জন্য প্রয়োজনীয় তথ্য পূরণ করুন
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {templateFields.map((field: string) => (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={field}>{getFieldDisplayName(field)}</Label>
                    {field === 'address' || field === 'description' ? (
                      <Textarea
                        id={field}
                        placeholder={`${getFieldDisplayName(field)} লিখুন`}
                        value={formData[field] || ''}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                      />
                    ) : field === 'class' ? (
                      <Select onValueChange={(value) => handleFieldChange(field, value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="শ্রেণী নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">প্রথম শ্রেণী</SelectItem>
                          <SelectItem value="2">দ্বিতীয় শ্রেণী</SelectItem>
                          <SelectItem value="3">তৃতীয় শ্রেণী</SelectItem>
                          <SelectItem value="4">চতুর্থ শ্রেণী</SelectItem>
                          <SelectItem value="5">পঞ্চম শ্রেণী</SelectItem>
                          <SelectItem value="6">ষষ্ঠ শ্রেণী</SelectItem>
                          <SelectItem value="7">সপ্তম শ্রেণী</SelectItem>
                          <SelectItem value="8">অষ্টম শ্রেণী</SelectItem>
                          <SelectItem value="9">নবম শ্রেণী</SelectItem>
                          <SelectItem value="10">দশম শ্রেণী</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={field}
                        type={field.includes('date') ? 'date' : field.includes('email') ? 'email' : 'text'}
                        placeholder={`${getFieldDisplayName(field)} লিখুন`}
                        value={formData[field] || ''}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Preview & Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>ডকুমেন্ট প্রিভিউ</span>
                </CardTitle>
                <CardDescription>
                  ডকুমেন্ট তৈরির আগে প্রিভিউ দেখুন
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Template Preview */}
                <div className="border rounded-lg p-4 bg-gray-50 min-h-[200px]">
                  <div className="text-center mb-4">
                    <h3 className="font-bold text-lg">{language === 'bn' ? template.nameBn : template.name}</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    {templateFields.map((field: string) => (
                      <div key={field} className="flex justify-between">
                        <span className="font-medium">{getFieldDisplayName(field)}:</span>
                        <span>{formData[field] || `[${getFieldDisplayName(field)}]`}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generation Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || generateMutation.isPending || (creditBalance?.currentBalance || 0) < template.creditsRequired}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating || generateMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      তৈরি হচ্ছে...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      ডকুমেন্ট তৈরি করুন
                    </>
                  )}
                </Button>

                {/* Credit Info */}
                <div className="text-center text-sm text-gray-600">
                  <p>বর্তমান ব্যালেন্স: {creditBalance?.currentBalance || 0} ক্রেডিট</p>
                  <p>প্রয়োজনীয়: {template.creditsRequired} ক্রেডিট</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ResponsivePageLayout>
    </AppShell>
  );
}