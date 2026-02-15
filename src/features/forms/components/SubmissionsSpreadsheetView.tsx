import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, ArrowUpDown, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import type { NevoraFormField, SubmissionWithAnswers, FieldOptions } from '../types';

interface Props {
  fields: NevoraFormField[];
  submissions: SubmissionWithAnswers[];
  formTitle: string;
}

const CHOICE_TYPES = ['select', 'radio', 'checkbox', 'multiselect'];

export function SubmissionsSpreadsheetView({ fields, submissions, formTitle }: Props) {
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const choiceFields = fields.filter(f => CHOICE_TYPES.includes(f.field_type));

  const filtered = useMemo(() => {
    let result = [...submissions];

    Object.entries(filters).forEach(([fieldKey, filterVal]) => {
      if (!filterVal || filterVal === '_all') return;
      result = result.filter(s => {
        const answer = s.answers.find(a => a.field_key === fieldKey);
        const val = answer?.value || '';
        return val.toLowerCase().includes(filterVal.toLowerCase());
      });
    });

    result.sort((a, b) => {
      if (sortField === 'created_at') {
        return sortDir === 'asc'
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      const aVal = a.answers.find(ans => ans.field_key === sortField)?.value || '';
      const bVal = b.answers.find(ans => ans.field_key === sortField)?.value || '';
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    return result;
  }, [submissions, filters, sortField, sortDir]);

  const toggleSort = (fieldKey: string) => {
    if (sortField === fieldKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(fieldKey);
      setSortDir('asc');
    }
  };

  const exportCSV = () => {
    const headers = [...fields.map(f => f.label), 'Date & Time'];
    const rows = filtered.map(s => {
      const row: string[] = fields.map(f => {
        const a = s.answers.find(ans => ans.field_key === f.field_key);
        return a?.value || '';
      });
      row.push(format(new Date(s.created_at), 'yyyy-MM-dd HH:mm'));
      return row;
    });

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formTitle}_responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXLSX = () => {
    const headers = [...fields.map(f => f.label), 'Date & Time'];
    const rows = filtered.map(s => {
      const row: string[] = fields.map(f => {
        const a = s.answers.find(ans => ans.field_key === f.field_key);
        return a?.value || '';
      });
      row.push(format(new Date(s.created_at), 'yyyy-MM-dd HH:mm'));
      return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Responses');
    XLSX.writeFile(wb, `${formTitle}_responses.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Filters row */}
      {choiceFields.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {choiceFields.map(f => {
            const opts = (f.options as FieldOptions)?.choices || [];
            return (
              <Select
                key={f.field_key}
                value={filters[f.field_key] || '_all'}
                onValueChange={v => setFilters(prev => ({ ...prev, [f.field_key]: v }))}
              >
                <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
                  <SelectValue placeholder={f.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All {f.label}</SelectItem>
                  {opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            );
          })}
        </div>
      )}

      <div className="border rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/50 hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground w-[40px]">#</TableHead>
              {fields.map(f => (
                <TableHead
                  key={f.field_key}
                  className="text-xs font-medium text-muted-foreground cursor-pointer whitespace-nowrap"
                  onClick={() => toggleSort(f.field_key)}
                >
                  <div className="flex items-center gap-1">
                    {f.label}
                    {f.field_type && CHOICE_TYPES.includes(f.field_type) && (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead
                className="text-xs font-medium text-muted-foreground cursor-pointer whitespace-nowrap"
                onClick={() => toggleSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  Date & Time
                  <ArrowUpDown className="h-3 w-3 opacity-40" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={fields.length + 2} className="text-center text-muted-foreground text-sm py-12">
                  No responses yet
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s, i) => (
                <TableRow key={s.id} className="hover:bg-muted/20">
                  <TableCell className="text-sm text-muted-foreground font-medium">{i + 1}</TableCell>
                  {fields.map(f => {
                    const a = s.answers.find(ans => ans.field_key === f.field_key);
                    return (
                      <TableCell key={f.field_key} className="text-sm max-w-[300px]">
                        {a?.value || '-'}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                    {format(new Date(s.created_at), 'MMM d, h:mm a')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
