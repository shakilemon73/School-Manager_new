import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { notoSansBengaliBase64 } from './bengali-font';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExportOptions {
  filename: string;
  title?: string;
  description?: string;
  columns: ExportColumn[];
  data: any[];
  orientation?: 'portrait' | 'landscape';
  includeTimestamp?: boolean;
}

function initializeBengaliFont(doc: jsPDF): void {
  try {
    doc.setFont('NotoSansBengali');
  } catch {
    doc.addFileToVFS('NotoSansBengali-Regular.ttf', notoSansBengaliBase64);
    doc.addFont('NotoSansBengali-Regular.ttf', 'NotoSansBengali', 'normal');
    doc.setFont('NotoSansBengali', 'normal');
  }
}

export const exportUtils = {
  generateFilename(baseName: string, extension: string, includeTimestamp = true): string {
    if (!includeTimestamp) {
      return `${baseName}.${extension}`;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${baseName}_${timestamp}.${extension}`;
  },

  downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportToCSV(options: ExportOptions): void {
    const { filename, columns, data, includeTimestamp = true } = options;

    const headers = columns.map(col => col.header);
    const keys = columns.map(col => col.key);

    const csvRows: string[] = [];
    csvRows.push(headers.map(h => `"${h}"`).join(','));

    data.forEach(row => {
      const values = keys.map(key => {
        const value = this.getNestedValue(row, key);
        const stringValue = value === null || value === undefined ? '' : String(value);
        return `"${stringValue.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const finalFilename = this.generateFilename(filename, 'csv', includeTimestamp);
    
    this.downloadFile(blob, finalFilename);
  },

  exportToPDF(options: ExportOptions): void {
    try {
      const { 
        filename, 
        title, 
        description, 
        columns, 
        data, 
        orientation = 'portrait',
        includeTimestamp = true 
      } = options;

      const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
      });

      initializeBengaliFont(doc);

      let yPosition = 15;

      if (title) {
        doc.setFontSize(16);
        doc.setFont('NotoSansBengali', 'normal');
        doc.text(title, 14, yPosition);
        yPosition += 8;
      }

      if (description) {
        doc.setFontSize(10);
        doc.setFont('NotoSansBengali', 'normal');
        doc.text(description, 14, yPosition);
        yPosition += 8;
      }

      const timestamp = new Date().toLocaleString();
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Generated: ${timestamp}`, 14, yPosition);
      yPosition += 10;

    const tableColumns = columns.map(col => ({
      header: col.header,
      dataKey: col.key,
    }));

    const tableData = data.map(row => {
      const rowData: any = {};
      columns.forEach(col => {
        rowData[col.key] = this.getNestedValue(row, col.key) ?? '';
      });
      return rowData;
    });

      autoTable(doc, {
        startY: yPosition,
        head: [tableColumns.map(col => col.header)],
        body: tableData.map(row => columns.map(col => String(row[col.key] ?? ''))),
        styles: {
          font: 'NotoSansBengali',
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          font: 'NotoSansBengali',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        margin: { top: 10, right: 14, bottom: 10, left: 14 },
        didDrawPage: (data) => {
          const pageCount = (doc as any).internal.getNumberOfPages();
          const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
          
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.setFont('NotoSansBengali', 'normal');
          doc.text(
            `Page ${pageNumber} of ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
          );
        },
      });

      const finalFilename = this.generateFilename(filename, 'pdf', includeTimestamp);
      doc.save(finalFilename);
    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error('Failed to generate PDF. Please try CSV or Excel export instead.');
    }
  },

  exportToExcel(options: ExportOptions): void {
    const { filename, title, columns, data, includeTimestamp = true } = options;

    const headers = columns.map(col => col.header);
    const keys = columns.map(col => col.key);

    const worksheetData: any[][] = [];
    
    if (title) {
      worksheetData.push([title]);
      worksheetData.push([]);
    }

    worksheetData.push(headers);

    data.forEach(row => {
      const rowData = keys.map(key => {
        const value = this.getNestedValue(row, key);
        return value === null || value === undefined ? '' : value;
      });
      worksheetData.push(rowData);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    if (title) {
      const titleRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }];
      
      if (worksheet['A1']) {
        worksheet['A1'].s = {
          font: { bold: true, sz: 14 },
          alignment: { horizontal: 'center' },
        };
      }
    }

    const colWidths = columns.map(col => ({ wch: col.width || 15 }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    const finalFilename = this.generateFilename(filename, 'xlsx', includeTimestamp);
    XLSX.writeFile(workbook, finalFilename);
  },

  getNestedValue(obj: any, path: string): any {
    if (obj.hasOwnProperty(path)) {
      return obj[path];
    }
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  },

  exportWithStats(
    options: ExportOptions,
    stats: { label: string; value: string | number }[],
    format: 'csv' | 'pdf' | 'excel' = 'csv'
  ): void {
    const statsData = stats.map(stat => ({
      label: stat.label,
      value: stat.value,
    }));

    const combinedOptions: ExportOptions = {
      ...options,
      title: options.title || options.filename,
    };

    if (format === 'pdf') {
      try {
        const doc = new jsPDF({
          orientation: options.orientation || 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        initializeBengaliFont(doc);

        let yPosition = 15;

        if (combinedOptions.title) {
          doc.setFontSize(16);
          doc.setFont('NotoSansBengali', 'normal');
          doc.text(combinedOptions.title, 14, yPosition);
          yPosition += 10;
        }

        if (stats.length > 0) {
          doc.setFontSize(12);
          doc.setFont('NotoSansBengali', 'normal');
          doc.text('Summary Statistics', 14, yPosition);
          yPosition += 8;

          autoTable(doc, {
            startY: yPosition,
            head: [['Metric', 'Value']],
            body: statsData.map(stat => [stat.label, String(stat.value)]),
            styles: {
              font: 'NotoSansBengali',
              fontSize: 10,
              cellPadding: 3,
            },
            headStyles: {
              fillColor: [59, 130, 246],
              textColor: [255, 255, 255],
              font: 'NotoSansBengali',
            },
            margin: { left: 14, right: 14 },
            theme: 'striped',
          });

          yPosition = (doc as any).lastAutoTable.finalY + 10;
        }

        if (combinedOptions.description) {
          doc.setFontSize(10);
          doc.setFont('NotoSansBengali', 'normal');
          doc.text(combinedOptions.description, 14, yPosition);
          yPosition += 8;
        }

        const tableColumns = combinedOptions.columns.map(col => ({
          header: col.header,
          dataKey: col.key,
        }));

        const tableData = combinedOptions.data.map(row => {
          const rowData: any = {};
          combinedOptions.columns.forEach(col => {
            rowData[col.key] = this.getNestedValue(row, col.key) ?? '';
          });
          return rowData;
        });

        autoTable(doc, {
          startY: yPosition,
          head: [tableColumns.map(col => col.header)],
          body: tableData.map(row => combinedOptions.columns.map(col => String(row[col.key] ?? ''))),
          styles: {
            font: 'NotoSansBengali',
            fontSize: 9,
            cellPadding: 3,
          },
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: [255, 255, 255],
            font: 'NotoSansBengali',
          },
          alternateRowStyles: {
            fillColor: [245, 247, 250],
          },
          margin: { top: 10, right: 14, bottom: 10, left: 14 },
        });

        const finalFilename = this.generateFilename(
          combinedOptions.filename,
          'pdf',
          combinedOptions.includeTimestamp
        );
        doc.save(finalFilename);
      } catch (error) {
        console.error('PDF export with stats failed:', error);
        throw new Error('Failed to generate PDF with statistics. Please try CSV or Excel export instead.');
      }
    }
    
    else if (format === 'csv') {
      const headers = combinedOptions.columns.map(col => col.header);
      const keys = combinedOptions.columns.map(col => col.key);

      const csvRows: string[] = [];

      if (combinedOptions.title) {
        csvRows.push(`"${combinedOptions.title}"`);
        csvRows.push('');
      }

      if (stats.length > 0) {
        csvRows.push('"Summary Statistics"');
        stats.forEach(stat => {
          csvRows.push(`"${stat.label}","${stat.value}"`);
        });
        csvRows.push('');
      }

      csvRows.push(headers.map(h => `"${h}"`).join(','));

      combinedOptions.data.forEach(row => {
        const values = keys.map(key => {
          const value = this.getNestedValue(row, key);
          const stringValue = value === null || value === undefined ? '' : String(value);
          return `"${stringValue.replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      });

      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const finalFilename = this.generateFilename(
        combinedOptions.filename,
        'csv',
        combinedOptions.includeTimestamp
      );
      
      this.downloadFile(blob, finalFilename);
    } else if (format === 'excel') {
      const headers = combinedOptions.columns.map(col => col.header);
      const keys = combinedOptions.columns.map(col => col.key);

      const worksheetData: any[][] = [];
      
      if (combinedOptions.title) {
        worksheetData.push([combinedOptions.title]);
        worksheetData.push([]);
      }

      if (stats.length > 0) {
        worksheetData.push(['Summary Statistics']);
        stats.forEach(stat => {
          worksheetData.push([stat.label, stat.value]);
        });
        worksheetData.push([]);
      }

      worksheetData.push(headers);

      combinedOptions.data.forEach(row => {
        const rowData = keys.map(key => {
          const value = this.getNestedValue(row, key);
          return value === null || value === undefined ? '' : value;
        });
        worksheetData.push(rowData);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

      const finalFilename = this.generateFilename(
        combinedOptions.filename,
        'xlsx',
        combinedOptions.includeTimestamp
      );
      XLSX.writeFile(workbook, finalFilename);
    }
  },
};

export default exportUtils;
