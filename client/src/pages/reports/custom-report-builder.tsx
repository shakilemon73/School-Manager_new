import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Play, Save, Download, BarChart3, Edit, Trash2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { userProfile } from "@/hooks/use-supabase-direct-auth";
import { Textarea } from "@/components/ui/textarea";

interface ReportTemplate {
  id: number;
  school_id: number;
  report_name: string;
  report_type: string;
  data_source: string;
  columns_config: any;
  filters_config: any;
  group_by: string | null;
  aggregations: any;
  chart_config: any;
  created_at: string;
  created_by: number;
}

interface DataSource {
  id: string;
  name: string;
  table: string;
  columns: string[];
}

const availableDataSources: DataSource[] = [
  {
    id: 'students',
    name: 'Students',
    table: 'students',
    columns: ['roll_number', 'name', 'class', 'section', 'gender', 'date_of_birth', 'admission_date', 'status']
  },
  {
    id: 'teachers',
    name: 'Teachers',
    table: 'teachers',
    columns: ['name', 'email', 'phone', 'subject', 'designation', 'join_date', 'salary', 'status']
  },
  {
    id: 'fees',
    name: 'Fee Collections',
    table: 'fee_collections',
    columns: ['student_id', 'fee_type', 'amount', 'paid_amount', 'payment_date', 'status', 'due_date']
  },
  {
    id: 'attendance',
    name: 'Attendance',
    table: 'attendance',
    columns: ['student_id', 'date', 'status', 'class', 'section', 'remarks']
  },
  {
    id: 'inventory',
    name: 'Inventory',
    table: 'inventory_items',
    columns: ['item_name', 'category', 'quantity', 'unit_price', 'total_value', 'supplier', 'purchase_date']
  }
];

export default function CustomReportBuilder() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [formData, setFormData] = useState({
    report_name: "",
    report_type: "tabular",
    data_source: "",
    group_by: "",
    chart_type: "bar"
  });

  const getCurrentSchoolId = async (): Promise<number> => {
    try {
      const schoolId = await userProfile.getCurrentUserSchoolId();
      if (!schoolId) throw new Error('User school ID not found');
      return schoolId;
    } catch (error) {
      console.error('❌ Failed to get user school ID:', error);
      return 1;
    }
  };

  // Fetch report templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/report-templates'],
    queryFn: async () => {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ReportTemplate[];
    }
  });

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: async (templateData: any) => {
      const schoolId = await getCurrentSchoolId();
      const userId = 1; // Get from auth context
      
      const template = {
        ...templateData,
        school_id: schoolId,
        created_by: userId,
        columns_config: { columns: selectedColumns },
        filters_config: {},
        aggregations: {},
        chart_config: formData.report_type === 'chart' ? { type: formData.chart_type } : null
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('report_templates')
          .update(template)
          .eq('id', editingTemplate.id)
          .eq('school_id', schoolId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('report_templates')
          .insert(template);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/report-templates'] });
      toast({
        title: "Success",
        description: `Report template ${editingTemplate ? 'updated' : 'saved'} successfully`
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const schoolId = await getCurrentSchoolId();
      const { error } = await supabase
        .from('report_templates')
        .delete()
        .eq('id', id)
        .eq('school_id', schoolId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/report-templates'] });
      toast({
        title: "Success",
        description: "Template deleted successfully"
      });
    }
  });

  const handleDataSourceChange = (sourceId: string) => {
    const source = availableDataSources.find(s => s.id === sourceId);
    setSelectedDataSource(source || null);
    setSelectedColumns([]);
    setFormData({ ...formData, data_source: sourceId });
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev => 
      prev.includes(column) 
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const generateReport = async () => {
    if (!selectedDataSource || selectedColumns.length === 0) {
      toast({
        title: "Error",
        description: "Please select a data source and at least one column",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const schoolId = await getCurrentSchoolId();
      const { data, error } = await supabase
        .from(selectedDataSource.table)
        .select(selectedColumns.join(','))
        .eq('school_id', schoolId)
        .limit(100);

      if (error) throw error;
      setReportData(data || []);
      
      toast({
        title: "Success",
        description: `Generated report with ${data?.length || 0} records`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToCSV = () => {
    if (reportData.length === 0) {
      toast({
        title: "Error",
        description: "No data to export",
        variant: "destructive"
      });
      return;
    }

    const headers = Object.keys(reportData[0]);
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.report_name || 'report'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast({
      title: "Success",
      description: "Report exported successfully"
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const loadTemplate = (template: ReportTemplate) => {
    const source = availableDataSources.find(s => s.id === template.data_source);
    setSelectedDataSource(source || null);
    setSelectedColumns(template.columns_config?.columns || []);
    setFormData({
      report_name: template.report_name,
      report_type: template.report_type,
      data_source: template.data_source,
      group_by: template.group_by || "",
      chart_type: template.chart_config?.type || "bar"
    });
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setSelectedDataSource(null);
    setSelectedColumns([]);
    setFormData({
      report_name: "",
      report_type: "tabular",
      data_source: "",
      group_by: "",
      chart_type: "bar"
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Custom Report Builder</h1>
            <p className="text-gray-500 mt-1">Create dynamic reports with custom data and visualizations</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-save-template">
                <Save className="w-4 h-4 mr-2" />
                Save as Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Save Report Template</DialogTitle>
                <DialogDescription>Save current configuration as a reusable template</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="report_name">Template Name *</Label>
                  <Input
                    id="report_name"
                    value={formData.report_name}
                    onChange={(e) => setFormData({ ...formData, report_name: e.target.value })}
                    placeholder="e.g., Monthly Student Attendance"
                    required
                    data-testid="input-template-name"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : "Save Template"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Report Builder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Report Configuration</CardTitle>
                <CardDescription>Select data source and columns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Data Source *</Label>
                  <Select
                    value={formData.data_source}
                    onValueChange={handleDataSourceChange}
                  >
                    <SelectTrigger data-testid="select-data-source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDataSources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDataSource && (
                  <>
                    <div>
                      <Label>Columns to Include</Label>
                      <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                        {selectedDataSource.columns.map((column) => (
                          <div key={column} className="flex items-center space-x-2">
                            <Checkbox
                              id={column}
                              checked={selectedColumns.includes(column)}
                              onCheckedChange={() => handleColumnToggle(column)}
                            />
                            <label htmlFor={column} className="text-sm font-medium">
                              {column.replace(/_/g, ' ').toUpperCase()}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Report Type</Label>
                      <Select
                        value={formData.report_type}
                        onValueChange={(value) => setFormData({ ...formData, report_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tabular">Table</SelectItem>
                          <SelectItem value="chart">Chart</SelectItem>
                          <SelectItem value="summary">Summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.report_type === 'chart' && (
                      <div>
                        <Label>Chart Type</Label>
                        <Select
                          value={formData.chart_type}
                          onValueChange={(value) => setFormData({ ...formData, chart_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bar">Bar Chart</SelectItem>
                            <SelectItem value="line">Line Chart</SelectItem>
                            <SelectItem value="pie">Pie Chart</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={generateReport} 
                    disabled={isGenerating || selectedColumns.length === 0}
                    className="flex-1"
                    data-testid="button-generate"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isGenerating ? "Generating..." : "Generate"}
                  </Button>
                  <Button 
                    onClick={exportToCSV} 
                    variant="outline"
                    disabled={reportData.length === 0}
                    data-testid="button-export"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Saved Templates */}
            <Card>
              <CardHeader>
                <CardTitle>Saved Templates</CardTitle>
                <CardDescription>Load previously saved templates</CardDescription>
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="text-center py-4">Loading...</div>
                ) : templates?.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No templates saved</p>
                ) : (
                  <div className="space-y-2">
                    {templates?.map((template) => (
                      <div key={template.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{template.report_name}</p>
                          <p className="text-xs text-gray-500">{template.report_type}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => loadTemplate(template)}
                            data-testid={`button-load-${template.id}`}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(template.id)}
                            data-testid={`button-delete-${template.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Report Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Report Preview</CardTitle>
                <CardDescription>
                  {reportData.length > 0 ? `Showing ${reportData.length} records` : 'No data generated yet'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportData.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Configure report and click "Generate" to see results</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          {selectedColumns.map((col) => (
                            <th key={col} className="text-left py-3 px-4 font-semibold text-sm">
                              {col.replace(/_/g, ' ').toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.slice(0, 50).map((row, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50" data-testid={`row-${idx}`}>
                            {selectedColumns.map((col) => (
                              <td key={col} className="py-3 px-4 text-sm">
                                {row[col] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {reportData.length > 50 && (
                      <p className="text-sm text-gray-500 text-center py-2">
                        Showing first 50 of {reportData.length} records
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
