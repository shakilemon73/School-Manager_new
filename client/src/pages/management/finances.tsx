import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRequireSchoolId } from '@/hooks/use-require-school-id';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { db, supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign, 
  Search,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Calculator
} from 'lucide-react';
// @ts-ignore
import jsPDF from 'jspdf';

// Financial transaction schema
const transactionSchema = z.object({
  transactionType: z.enum(['income', 'expense']),
  category: z.string().min(1, 'ক্যাটাগরি আবশ্যক'),
  amount: z.string().min(1, 'পরিমাণ আবশ্যক'),
  description: z.string().min(1, 'বর্ণনা আবশ্যক'),
  paymentMethod: z.string().min(1, 'পেমেন্ট পদ্ধতি আবশ্যক'),
  referenceNumber: z.string().optional(),
  date: z.string().min(1, 'তারিখ আবশ্যক'),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

const incomeCategories = [
  'শিক্ষার্থী ফি', 'ভর্তি ফি', 'পরীক্ষার ফি', 'সার্টিফিকেট ফি',
  'গ্রন্থাগার ফি', 'ল্যাব ফি', 'ক্রীড়া ফি', 'পরিবহন ফি',
  'অনুদান', 'দান', 'অন্যান্য আয়'
];

const expenseCategories = [
  'শিক্ষক বেতন', 'কর্মচারী বেতন', 'ভাড়া', 'বিদ্যুৎ বিল',
  'পানি বিল', 'ইন্টারনেট বিল', 'টেলিফোন বিল', 'রক্ষণাবেক্ষণ',
  'শিক্ষা উপকরণ', 'অফিস সরঞ্জাম', 'পরিবহন খরচ', 'বিজ্ঞাপন',
  'আইনি খরচ', 'বীমা', 'কর', 'অন্যান্য খরচ'
];

const paymentMethods = ['নগদ', 'ব্যাংক', 'চেক', 'মোবাইল ব্যাংকিং', 'কার্ড'];

const typeColors = {
  income: 'bg-green-100 text-green-800',
  expense: 'bg-red-100 text-red-800'
};

const typeLabels = {
  income: 'আয়',
  expense: 'খরচ'
};

export default function FinancesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = useRequireSchoolId();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  
  // Report generation state
  const [reportStartDate, setReportStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState('summary');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Fetch financial data from Supabase
  const { data: financialStats } = useQuery({
    queryKey: ['finance-stats', schoolId],
    queryFn: async () => {
      const stats = await db.getFinancialStats(schoolId);
      return stats;
    },
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['finance-transactions', schoolId],
    queryFn: async () => {
      const data = await db.getFinancialTransactions(schoolId);
      return data;
    },
  });

  // Transaction form
  const transactionForm = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      transactionType: 'income',
      category: '',
      amount: '',
      description: '',
      paymentMethod: '',
      referenceNumber: '',
      date: new Date().toISOString().split('T')[0],
    },
  });

  // Create transaction mutation
  const createTransaction = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      return await db.createFinancialTransaction({
        ...data,
        amount: parseFloat(data.amount),
        schoolId,
        createdAt: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "নতুন লেনদেন যোগ করা হয়েছে",
      });
      setIsAddDialogOpen(false);
      transactionForm.reset();
    },
  });

  // Update transaction mutation
  const updateTransaction = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TransactionFormData }) => {
      const updates = {
        ...data,
        amount: parseFloat(data.amount),
      };
      
      const { data: result, error } = await supabase
        .from('financial_transactions')
        .update(updates)
        .eq('school_id', schoolId)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "লেনদেনের তথ্য আপডেট করা হয়েছে",
      });
      setEditingTransaction(null);
      setIsAddDialogOpen(false);
    },
  });

  // Delete transaction mutation
  const deleteTransaction = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('school_id', schoolId)
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-stats'] });
      toast({
        title: "সফল হয়েছে!",
        description: "লেনদেন মুছে ফেলা হয়েছে",
      });
    },
  });

  const handleAdd = () => {
    setEditingTransaction(null);
    transactionForm.reset({
      transactionType: 'income',
      category: '',
      amount: '',
      description: '',
      paymentMethod: '',
      referenceNumber: '',
      date: new Date().toISOString().split('T')[0],
    });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    transactionForm.reset({
      transactionType: transaction.transactionType || transaction.type || 'income',
      category: transaction.category || '',
      amount: transaction.amount?.toString() || '',
      description: transaction.description || '',
      paymentMethod: transaction.paymentMethod || '',
      referenceNumber: transaction.referenceNumber || transaction.reference || '',
      date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : '',
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('আপনি কি নিশ্চিত যে এই লেনদেনটি মুছে ফেলতে চান?')) {
      deleteTransaction.mutate(id);
    }
  };

  const onSubmit = (data: TransactionFormData) => {
    if (editingTransaction) {
      updateTransaction.mutate({ id: editingTransaction.id, data });
    } else {
      createTransaction.mutate(data);
    }
  };

  // Filter transactions
  const filteredTransactions = Array.isArray(transactions) ? transactions.filter((transaction: any) => {
    const transactionType = transaction.transactionType || transaction.type;
    const matchesSearch = transaction.description?.toLowerCase().includes(searchText.toLowerCase()) ||
                         transaction.category?.toLowerCase().includes(searchText.toLowerCase());
    const matchesType = selectedType === 'all' || transactionType === selectedType;
    const matchesCategory = selectedCategory === 'all' || transaction.category === selectedCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  }) : [];

  // Get available categories based on transaction type
  const getAvailableCategories = () => {
    const type = transactionForm.watch('transactionType');
    return type === 'income' ? incomeCategories : expenseCategories;
  };

  // Calculate summary statistics
  const totalIncome = filteredTransactions
    .filter((t: any) => (t.transactionType || t.type) === 'income')
    .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);

  const totalExpense = filteredTransactions
    .filter((t: any) => (t.transactionType || t.type) === 'expense')
    .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);

  const netBalance = totalIncome - totalExpense;

  // Filter transactions by date range for reports
  const getFilteredTransactionsForReport = () => {
    const startDate = new Date(reportStartDate);
    const endDate = new Date(reportEndDate);
    endDate.setHours(23, 59, 59, 999); // Include end of day
    
    return filteredTransactions.filter((t: any) => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  };

  // Calculate report statistics
  const getReportData = () => {
    const reportTransactions = getFilteredTransactionsForReport();
    
    const reportIncome = reportTransactions
      .filter((t: any) => (t.transactionType || t.type) === 'income')
      .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
    
    const reportExpense = reportTransactions
      .filter((t: any) => (t.transactionType || t.type) === 'expense')
      .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
    
    const reportNetBalance = reportIncome - reportExpense;
    
    // Category breakdowns for the report period - include all actual categories from transactions
    const incomeTransactions = reportTransactions.filter((t: any) => (t.transactionType || t.type) === 'income');
    const expenseTransactions = reportTransactions.filter((t: any) => (t.transactionType || t.type) === 'expense');
    
    const incomeCategoriesInData = [...new Set(incomeTransactions.map((t: any) => t.category).filter(Boolean))];
    const expenseCategoriesInData = [...new Set(expenseTransactions.map((t: any) => t.category).filter(Boolean))];
    
    const incomeByCategory = incomeCategoriesInData.map(category => ({
      category,
      total: incomeTransactions
        .filter((t: any) => t.category === category)
        .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0)
    })).filter(item => item.total > 0);
    
    const expenseByCategory = expenseCategoriesInData.map(category => ({
      category,
      total: expenseTransactions
        .filter((t: any) => t.category === category)
        .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0)
    })).filter(item => item.total > 0);
    
    return {
      transactions: reportTransactions,
      totalIncome: reportIncome,
      totalExpense: reportExpense,
      netBalance: reportNetBalance,
      incomeByCategory,
      expenseByCategory,
      transactionCount: reportTransactions.length
    };
  };

  // Export transactions to Excel
  const exportToExcel = () => {
    const reportData = getReportData();
    const transactionsData = reportData.transactions.map((transaction: any) => ({
      'Date': transaction.date ? new Date(transaction.date).toLocaleDateString('en-GB') : 'N/A',
      'Description': transaction.description || '',
      'Category': transaction.category || '',
      'Payment Method': transaction.paymentMethod || '',
      'Type': (transaction.transactionType || transaction.type) === 'income' ? 'Income' : 'Expense',
      'Amount (BDT)': parseFloat(transaction.amount) || 0,
      'Reference': transaction.referenceNumber || ''
    }));

    // Create summary data
    const summaryData = [
      { 'Item': 'Total Income', 'Amount (BDT)': reportData.totalIncome },
      { 'Item': 'Total Expense', 'Amount (BDT)': reportData.totalExpense },
      { 'Item': 'Net Balance', 'Amount (BDT)': reportData.netBalance }
    ];

    // Create category analysis
    const categoryData = [
      ...reportData.incomeByCategory.map(item => ({
        'Category': item.category,
        'Type': 'Income',
        'Amount (BDT)': item.total
      })),
      ...reportData.expenseByCategory.map(item => ({
        'Category': item.category,
        'Type': 'Expense',
        'Amount (BDT)': item.total
      }))
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Add transactions sheet
    const wsTransactions = XLSX.utils.json_to_sheet(transactionsData);
    XLSX.utils.book_append_sheet(wb, wsTransactions, "Transactions");
    
    // Add summary sheet
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    
    // Add category analysis sheet
    if (categoryData.length > 0) {
      const wsCategory = XLSX.utils.json_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(wb, wsCategory, "Category Analysis");
    }

    // Generate filename
    const startDate = new Date(reportStartDate).toLocaleDateString('en-GB').replace(/\//g, '-');
    const endDate = new Date(reportEndDate).toLocaleDateString('en-GB').replace(/\//g, '-');
    const filename = `Financial_Report_${startDate}_to_${endDate}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);

    toast({
      title: "সফল হয়েছে!",
      description: "এক্সেল ফাইল ডাউনলোড সম্পন্ন হয়েছে",
    });
  };

  // Generate PDF Report Only
  const generatePDFReport = async () => {
    setIsGeneratingReport(true);
    try {
      const reportData = getReportData();
      
      // Create PDF using jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let currentY = margin;

      // Helper function to check if we need a new page
      const checkNewPage = (requiredHeight: number) => {
        if (currentY + requiredHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
          return true;
        }
        return false;
      };

      // Helper function to add text with wrapping
      const addText = (text: string, x: number, y: number, maxWidth?: number) => {
        if (maxWidth) {
          const lines = doc.splitTextToSize(text, maxWidth);
          doc.text(lines, x, y);
          return lines.length * 5; // Return height used
        } else {
          doc.text(text, x, y);
          return 5; // Return height used
        }
      };

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Financial Report', pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;
      
      doc.setFontSize(14);
      doc.text('(Financial Report)', pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;

      // Date range and report type
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const dateText = `Period: ${new Date(reportStartDate).toLocaleDateString()} to ${new Date(reportEndDate).toLocaleDateString()}`;
      doc.text(dateText, pageWidth / 2, currentY, { align: 'center' });
      currentY += 7;

      const reportTypeText = `Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`;
      doc.text(reportTypeText, pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;

      // Summary section
      checkNewPage(40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Financial Summary', margin, currentY);
      currentY += 10;

      // Draw summary box
      doc.setDrawColor(0);
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, currentY, pageWidth - 2 * margin, 30, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 120, 0);
      doc.text(`Total Income: $${reportData.totalIncome.toLocaleString()}`, margin + 5, currentY + 8);
      
      doc.setTextColor(200, 0, 0);
      doc.text(`Total Expense: $${reportData.totalExpense.toLocaleString()}`, margin + 5, currentY + 16);
      
      doc.setTextColor(reportData.netBalance >= 0 ? 0 : 200, reportData.netBalance >= 0 ? 120 : 0, 0);
      doc.text(`Net Balance: $${reportData.netBalance.toLocaleString()}`, margin + 5, currentY + 24);
      
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Transactions: ${reportData.transactionCount}`, margin + 100, currentY + 8);
      
      currentY += 40;

      // Income Categories Table
      if (reportType !== 'expense' && reportData.incomeByCategory.length > 0) {
        checkNewPage(30);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Income Categories', margin, currentY);
        currentY += 10;

        // Table headers
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, currentY, pageWidth - 2 * margin, 8, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Category', margin + 2, currentY + 6);
        doc.text('Amount ($)', margin + 80, currentY + 6);
        doc.text('Percentage', margin + 130, currentY + 6);
        currentY += 8;

        // Table rows
        doc.setFont('helvetica', 'normal');
        reportData.incomeByCategory.slice(0, 15).forEach((item, index) => {
          checkNewPage(6);
          
          if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, currentY, pageWidth - 2 * margin, 6, 'F');
          }
          
          doc.setTextColor(0, 0, 0);
          const categoryText = item.category.length > 25 ? item.category.substring(0, 22) + '...' : item.category;
          doc.text(categoryText, margin + 2, currentY + 4);
          doc.text(`$${item.total.toLocaleString()}`, margin + 80, currentY + 4);
          const percentage = reportData.totalIncome > 0 ? ((item.total / reportData.totalIncome) * 100).toFixed(1) : 0;
          doc.text(`${percentage}%`, margin + 130, currentY + 4);
          currentY += 6;
        });
        currentY += 10;
      }

      // Expense Categories Table
      if (reportType !== 'income' && reportData.expenseByCategory.length > 0) {
        checkNewPage(30);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Expense Categories', margin, currentY);
        currentY += 10;

        // Table headers
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, currentY, pageWidth - 2 * margin, 8, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Category', margin + 2, currentY + 6);
        doc.text('Amount ($)', margin + 80, currentY + 6);
        doc.text('Percentage', margin + 130, currentY + 6);
        currentY += 8;

        // Table rows
        doc.setFont('helvetica', 'normal');
        reportData.expenseByCategory.slice(0, 15).forEach((item, index) => {
          checkNewPage(6);
          
          if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, currentY, pageWidth - 2 * margin, 6, 'F');
          }
          
          doc.setTextColor(0, 0, 0);
          const categoryText = item.category.length > 25 ? item.category.substring(0, 22) + '...' : item.category;
          doc.text(categoryText, margin + 2, currentY + 4);
          doc.text(`$${item.total.toLocaleString()}`, margin + 80, currentY + 4);
          const percentage = reportData.totalExpense > 0 ? ((item.total / reportData.totalExpense) * 100).toFixed(1) : 0;
          doc.text(`${percentage}%`, margin + 130, currentY + 4);
          currentY += 6;
        });
        currentY += 10;
      }

      // Detailed Transactions Table
      if (reportType === 'detailed' && reportData.transactions.length > 0) {
        checkNewPage(30);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Transaction Details', margin, currentY);
        currentY += 10;

        // Table headers
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, currentY, pageWidth - 2 * margin, 8, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Date', margin + 2, currentY + 6);
        doc.text('Description', margin + 25, currentY + 6);
        doc.text('Category', margin + 70, currentY + 6);
        doc.text('Type', margin + 110, currentY + 6);
        doc.text('Amount', margin + 135, currentY + 6);
        currentY += 8;

        // Transaction rows
        doc.setFont('helvetica', 'normal');
        reportData.transactions.slice(0, 25).forEach((transaction, index) => {
          checkNewPage(6);
          
          if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, currentY, pageWidth - 2 * margin, 6, 'F');
          }
          
          doc.setTextColor(0, 0, 0);
          doc.text(new Date(transaction.date).toLocaleDateString(), margin + 2, currentY + 4);
          
          const description = transaction.description.length > 15 ? transaction.description.substring(0, 12) + '...' : transaction.description;
          doc.text(description, margin + 25, currentY + 4);
          
          const category = transaction.category.length > 12 ? transaction.category.substring(0, 9) + '...' : transaction.category;
          doc.text(category, margin + 70, currentY + 4);
          
          const transactionType = (transaction.transactionType || transaction.type);
          doc.text(transactionType === 'income' ? 'Income' : 'Expense', margin + 110, currentY + 4);
          
          doc.setTextColor(transactionType === 'income' ? 0 : 200, transactionType === 'income' ? 120 : 0, 0);
          doc.text(`$${parseFloat(transaction.amount).toLocaleString()}`, margin + 135, currentY + 4);
          currentY += 6;
        });
      }

      // Footer on all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const footerText = `Generated: ${new Date().toLocaleDateString()} - Page ${i}/${totalPages}`;
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      // Save PDF
      const fileName = `financial-report-${reportStartDate}-to-${reportEndDate}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF তৈরি সফল!",
        description: "আর্থিক প্রতিবেদন PDF ডাউনলোড করা হয়েছে",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "ত্রুটি!",
        description: "PDF তৈরি করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Quick report generators
  const generateQuickReport = (type: string) => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = new Date();

    switch (type) {
      case 'current-month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        setReportType('summary');
        break;
      case 'last-month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        setReportType('summary');
        break;
      case 'yearly':
        startDate = new Date(today.getFullYear(), 0, 1);
        setReportType('summary');
        break;
      case 'category-analysis':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        setReportType('category');
        break;
      default:
        return;
    }

    setReportStartDate(startDate.toISOString().split('T')[0]);
    setReportEndDate(endDate.toISOString().split('T')[0]);
    
    // Auto-generate the report
    setTimeout(() => generatePDFReport(), 100);
  };

  if (transactionsLoading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">আর্থিক তথ্য লোড হচ্ছে...</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">আর্থিক ব্যবস্থাপনা</h1>
            <p className="text-gray-600 mt-2">আয়-ব্যয় ও লেনদেন পরিচালনা করুন</p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            নতুন লেনদেন যোগ করুন
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">সারসংক্ষেপ</TabsTrigger>
            <TabsTrigger value="transactions">লেনদেন ({filteredTransactions.length})</TabsTrigger>
            <TabsTrigger value="reports">রিপোর্ট</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">মোট আয়</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">৳{totalIncome.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">মোট খরচ</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">৳{totalExpense.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">নেট ব্যালেন্স</CardTitle>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ৳{netBalance.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">মাসিক আয়</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">৳{financialStats?.monthlyIncome || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>সাম্প্রতিক লেনদেন</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>তারিখ</TableHead>
                      <TableHead>বর্ণনা</TableHead>
                      <TableHead>ক্যাটাগরি</TableHead>
                      <TableHead>ধরন</TableHead>
                      <TableHead>পরিমাণ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.slice(0, 5).map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {transaction.date ? new Date(transaction.date).toLocaleDateString('bn-BD') : 'N/A'}
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell>
                          <Badge className={typeColors[(transaction.transactionType || transaction.type) as keyof typeof typeColors]}>
                            {typeLabels[(transaction.transactionType || transaction.type) as keyof typeof typeLabels]}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-medium ${(transaction.transactionType || transaction.type) === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {(transaction.transactionType || transaction.type) === 'income' ? '+' : '-'}৳{parseFloat(transaction.amount).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            {/* Search and Filter */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="বর্ণনা বা ক্যাটাগরি দিয়ে খুঁজুন..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="ধরন নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল ধরন</SelectItem>
                      <SelectItem value="income">আয়</SelectItem>
                      <SelectItem value="expense">খরচ</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল ক্যাটাগরি</SelectItem>
                      {selectedType === 'income' ? incomeCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      )) : selectedType === 'expense' ? expenseCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      )) : [...incomeCategories, ...expenseCategories].map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline" onClick={exportToExcel}>
                    <Download className="w-4 h-4 mr-2" />
                    এক্সপোর্ট
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>তারিখ</TableHead>
                      <TableHead>বর্ণনা</TableHead>
                      <TableHead>ক্যাটাগরি</TableHead>
                      <TableHead>পেমেন্ট পদ্ধতি</TableHead>
                      <TableHead>ধরন</TableHead>
                      <TableHead>পরিমাণ</TableHead>
                      <TableHead>কার্যক্রম</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {transaction.date ? new Date(transaction.date).toLocaleDateString('bn-BD') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{transaction.description}</div>
                            {transaction.referenceNumber && (
                              <div className="text-sm text-gray-500">Ref: {transaction.referenceNumber}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell>{transaction.paymentMethod}</TableCell>
                        <TableCell>
                          <Badge className={typeColors[(transaction.transactionType || transaction.type) as keyof typeof typeColors]}>
                            {typeLabels[(transaction.transactionType || transaction.type) as keyof typeof typeLabels]}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-medium ${(transaction.transactionType || transaction.type) === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {(transaction.transactionType || transaction.type) === 'income' ? '+' : '-'}৳{parseFloat(transaction.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(transaction)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(transaction.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredTransactions.length === 0 && (
                  <div className="text-center py-12">
                    <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">কোনো লেনদেন পাওয়া যায়নি</h3>
                    <p className="mt-1 text-sm text-gray-500">নতুন লেনদেন যোগ করুন বা ফিল্টার পরিবর্তন করুন।</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>আয়ের ক্যাটাগরি অনুযায়ী বিভাজন</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {incomeCategories.map(category => {
                      const categoryTotal = filteredTransactions
                        .filter((t: any) => (t.transactionType || t.type) === 'income' && t.category === category)
                        .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
                      
                      if (categoryTotal === 0) return null;
                      
                      const percentage = totalIncome > 0 ? (categoryTotal / totalIncome) * 100 : 0;
                      
                      return (
                        <div key={category} className="flex justify-between items-center">
                          <span className="text-sm">{category}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">৳{categoryTotal.toLocaleString()}</span>
                            <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>খরচের ক্যাটাগরি অনুযায়ী বিভাজন</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {expenseCategories.map(category => {
                      const categoryTotal = filteredTransactions
                        .filter((t: any) => (t.transactionType || t.type) === 'expense' && t.category === category)
                        .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
                      
                      if (categoryTotal === 0) return null;
                      
                      const percentage = totalExpense > 0 ? (categoryTotal / totalExpense) * 100 : 0;
                      
                      return (
                        <div key={category} className="flex justify-between items-center">
                          <span className="text-sm">{category}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">৳{categoryTotal.toLocaleString()}</span>
                            <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>আর্থিক রিপোর্ট তৈরি করুন</CardTitle>
                  <p className="text-sm text-gray-600">বিভিন্ন ধরনের আর্থিক রিপোর্ট ডাউনলোড করুন</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">শুরুর তারিখ</label>
                        <Input 
                          type="date" 
                          value={reportStartDate}
                          onChange={(e) => setReportStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">শেষ তারিখ</label>
                        <Input 
                          type="date" 
                          value={reportEndDate}
                          onChange={(e) => setReportEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">রিপোর্টের ধরন</label>
                      <Select value={reportType} onValueChange={setReportType}>
                        <SelectTrigger>
                          <SelectValue placeholder="রিপোর্টের ধরন নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="summary">সারসংক্ষেপ রিপোর্ট</SelectItem>
                          <SelectItem value="detailed">বিস্তারিত রিপোর্ট</SelectItem>
                          <SelectItem value="income">আয়ের রিপোর্ট</SelectItem>
                          <SelectItem value="expense">খরচের রিপোর্ট</SelectItem>
                          <SelectItem value="category">ক্যাটাগরি অনুযায়ী রিপোর্ট</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={generatePDFReport}
                      disabled={isGeneratingReport}
                    >
                      {isGeneratingReport ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          রিপোর্ট তৈরি হচ্ছে...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          PDF রিপোর্ট ডাউনলোড করুন
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>দ্রুত রিপোর্ট</CardTitle>
                  <p className="text-sm text-gray-600">প্রস্তুতকৃত রিপোর্ট টেমপ্লেট</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => generateQuickReport('current-month')}
                      disabled={isGeneratingReport}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      এই মাসের আর্থিক সারসংক্ষেপ
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => generateQuickReport('last-month')}
                      disabled={isGeneratingReport}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      গত মাসের আয়-ব্যয় রিপোর্ট
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => generateQuickReport('yearly')}
                      disabled={isGeneratingReport}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      বার্ষিক আর্থিক প্রতিবেদন
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => generateQuickReport('category-analysis')}
                      disabled={isGeneratingReport}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      ক্যাটাগরি অনুযায়ী খরচ বিশ্লেষণ
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Report Preview/Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>
                  রিপোর্ট পূর্বরূপ - {new Date(reportStartDate).toLocaleDateString('bn-BD')} থেকে {new Date(reportEndDate).toLocaleDateString('bn-BD')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const reportData = getReportData();
                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h3 className="font-semibold text-green-800">মোট আয়</h3>
                          <p className="text-2xl font-bold text-green-600">৳{reportData.totalIncome.toLocaleString()}</p>
                          <p className="text-sm text-green-600">
                            {reportData.transactions.filter((t: any) => (t.transactionType || t.type) === 'income').length} টি লেনদেন
                          </p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <h3 className="font-semibold text-red-800">মোট খরচ</h3>
                          <p className="text-2xl font-bold text-red-600">৳{reportData.totalExpense.toLocaleString()}</p>
                          <p className="text-sm text-red-600">
                            {reportData.transactions.filter((t: any) => (t.transactionType || t.type) === 'expense').length} টি লেনদেন
                          </p>
                        </div>
                        <div className={`p-4 rounded-lg ${reportData.netBalance >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                          <h3 className={`font-semibold ${reportData.netBalance >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>নেট ব্যালেন্স</h3>
                          <p className={`text-2xl font-bold ${reportData.netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            ৳{reportData.netBalance.toLocaleString()}
                          </p>
                          <p className={`text-sm ${reportData.netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {reportData.netBalance >= 0 ? 'লাভজনক অবস্থান' : 'ঘাটতি রয়েছে'}
                          </p>
                        </div>
                      </div>

                      {/* Top Categories */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3">শীর্ষ আয়ের ক্যাটাগরি</h4>
                          <div className="space-y-2">
{reportData.incomeByCategory
                              .sort((a, b) => b.total - a.total)
                              .slice(0, 5)
                              .map(({ category, total }) => (
                                <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                  <span className="text-sm">{category}</span>
                                  <span className="font-medium text-green-600">৳{total.toLocaleString()}</span>
                                </div>
                              ))}
                            {reportData.incomeByCategory.length === 0 && (
                              <div className="text-center py-4 text-gray-500">
                                <p>নির্বাচিত সময়ে কোনো আয় নেই</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-3">শীর্ষ খরচের ক্যাটাগরি</h4>
                          <div className="space-y-2">
                            {reportData.expenseByCategory
                              .sort((a, b) => b.total - a.total)
                              .slice(0, 5)
                              .map(({ category, total }) => (
                                <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                  <span className="text-sm">{category}</span>
                                  <span className="font-medium text-red-600">৳{total.toLocaleString()}</span>
                                </div>
                              ))}
                            {reportData.expenseByCategory.length === 0 && (
                              <div className="text-center py-4 text-gray-500">
                                <p>নির্বাচিত সময়ে কোনো খরচ নেই</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Transaction Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? 'লেনদেনের তথ্য সম্পাদনা' : 'নতুন লেনদেন যোগ করুন'}
              </DialogTitle>
              <DialogDescription>
                {editingTransaction ? 'লেনদেনের তথ্য আপডেট করুন' : 'নতুন লেনদেনের সম্পূর্ণ তথ্য প্রদান করুন'}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...transactionForm}>
              <form onSubmit={transactionForm.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={transactionForm.control}
                    name="transactionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>লেনদেনের ধরন</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="ধরন নির্বাচন করুন" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="income">আয়</SelectItem>
                            <SelectItem value="expense">খরচ</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={transactionForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ক্যাটাগরি</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              placeholder="ক্যাটাগরি টাইপ করুন বা নীচে থেকে নির্বাচন করুন"
                              className="mb-2"
                            />
                            <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto border rounded p-2 bg-gray-50">
                              {getAvailableCategories().map(category => (
                                <Button
                                  key={category}
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 justify-start text-xs"
                                  onClick={() => field.onChange(category)}
                                >
                                  {category}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={transactionForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>পরিমাণ (টাকা)</FormLabel>
                        <FormControl>
                          <Input placeholder="5000" type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={transactionForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>তারিখ</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={transactionForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>বর্ণনা</FormLabel>
                      <FormControl>
                        <Input placeholder="লেনদেনের বিস্তারিত বর্ণনা" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={transactionForm.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>পেমেন্ট পদ্ধতি</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="পদ্ধতি নির্বাচন করুন" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {paymentMethods.map(method => (
                              <SelectItem key={method} value={method}>
                                {method}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={transactionForm.control}
                    name="referenceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>রেফারেন্স (ঐচ্ছিক)</FormLabel>
                        <FormControl>
                          <Input placeholder="চেক নম্বর, ট্রানজেকশন আইডি ইত্যাদি" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit" disabled={createTransaction.isPending || updateTransaction.isPending}>
                    {createTransaction.isPending || updateTransaction.isPending ? 'সংরক্ষণ করা হচ্ছে...' : 
                     editingTransaction ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}