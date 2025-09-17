import { useState } from 'react';
import { Link } from 'wouter';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, Download, Eye, MoreHorizontal } from 'lucide-react';
import { db } from '@/lib/supabase';

interface HistoryItem {
  id: string;
  studentName: string;
  studentId: string;
  className: string;
  section: string;
  template: string;
  createdAt: string;
  status: 'generated' | 'downloaded' | 'printed';
  createdBy: string;
}

export default function IdCardHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');

  // Fetch history data
  const { data: history, isLoading } = useQuery({
    queryKey: ['id-cards', 'history'],
    queryFn: async () => {
      const schoolId = 1; // TODO: Get from user context/session in production
      const data = await db.getIdCardHistory(schoolId, 50);
      return data.map((card: any) => ({
        id: card.id.toString(),
        studentName: card.students?.name || 'Unknown',
        studentId: card.students?.student_id || 'N/A',
        className: card.students?.class || 'N/A',
        section: card.students?.section || 'N/A',
        template: card.template_id || 'portrait',
        createdAt: card.created_at,
        status: card.status || 'generated',
        createdBy: 'Admin' // Default value, could be from user metadata
      })) as HistoryItem[];
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  const filteredHistory = history?.filter(item => {
    const matchesSearch = item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesTemplate = templateFilter === 'all' || item.template === templateFilter;
    
    return matchesSearch && matchesStatus && matchesTemplate;
  }) || [];

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-700">হোম</Link>
          <span>/</span>
          <Link href="/id-card/dashboard" className="hover:text-gray-700">আইডি কার্ড</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">ইতিহাস</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">আইডি কার্ড ইতিহাস</h1>
            <p className="text-gray-600 mt-1">পূর্বে তৈরি করা আইডি কার্ডের তালিকা দেখুন</p>
          </div>
          <Link href="/id-card/dashboard">
            <Button variant="outline">
              <ArrowLeft size={16} className="mr-2" />
              ড্যাশবোর্ডে ফিরুন
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="নাম বা আইডি দিয়ে খুঁজুন..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="স্ট্যাটাস ফিল্টার" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
                  <SelectItem value="generated">তৈরি হয়েছে</SelectItem>
                  <SelectItem value="downloaded">ডাউনলোড হয়েছে</SelectItem>
                  <SelectItem value="printed">প্রিন্ট হয়েছে</SelectItem>
                </SelectContent>
              </Select>

              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="টেমপ্লেট ফিল্টার" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব টেমপ্লেট</SelectItem>
                  <SelectItem value="portrait">পোর্ট্রেট</SelectItem>
                  <SelectItem value="landscape">ল্যান্ডস্কেপ</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline">
                <Download size={16} className="mr-2" />
                এক্সপোর্ট করুন
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle>আইডি কার্ড ইতিহাস ({filteredHistory.length}টি রেকর্ড)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-12 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : filteredHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>শিক্ষার্থী</TableHead>
                    <TableHead>শ্রেণি</TableHead>
                    <TableHead>টেমপ্লেট</TableHead>
                    <TableHead>তৈরির তারিখ</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead>তৈরিকারী</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.studentName}</div>
                          <div className="text-sm text-gray-500">আইডি: {item.studentId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {item.className} - {item.section}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.template === 'portrait' ? 'পোর্ট্রেট' : 'ল্যান্ডস্কেপ'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(item.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{item.createdBy}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline">
                            <Eye size={14} className="mr-1" />
                            দেখুন
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download size={14} className="mr-1" />
                            ডাউনলোড
                          </Button>
                          <Button size="sm" variant="outline">
                            <MoreHorizontal size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📄</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">কোন রেকর্ড পাওয়া যায়নি</h3>
                <p className="text-gray-500 mb-6">আপনার অনুসন্ধানের সাথে মিলে এমন কোন আইডি কার্ড নেই।</p>
                <Link href="/id-card/create-single">
                  <Button>নতুন আইডি কার্ড তৈরি করুন</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}