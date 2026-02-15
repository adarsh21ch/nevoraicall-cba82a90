import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, FileSpreadsheet, Download } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { SubmissionsSpreadsheetView } from '../components/SubmissionsSpreadsheetView';
import { useForms } from '../hooks/useForms';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import type { NevoraFormWithFields, SubmissionWithAnswers } from '../types';

export default function FormResponsesPage() {
  const { formId } = useParams<{ formId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { fetchFormWithFields, fetchSubmissions } = useForms();
  const [form, setForm] = useState<NevoraFormWithFields | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithAnswers[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user && !authLoading) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!formId || !user) return;
    const load = async () => {
      setLoading(true);
      const [f, s] = await Promise.all([
        fetchFormWithFields(formId),
        fetchSubmissions(formId),
      ]);
      setForm(f);
      setSubmissions(s);
      setLoading(false);
    };
    load();
  }, [formId, user, fetchFormWithFields, fetchSubmissions]);

  const exportCSV = () => {
    if (!form) return;
    const headers = [...form.fields.map(f => f.label), 'Date & Time'];
    const rows = submissions.map(s => {
      const row: string[] = form.fields.map(f => {
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
    a.download = `${form.title}_responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXLSX = () => {
    if (!form) return;
    const headers = [...form.fields.map(f => f.label), 'Date & Time'];
    const rows = submissions.map(s => {
      const row: string[] = form.fields.map(f => {
        const a = s.answers.find(ans => ans.field_key === f.field_key);
        return a?.value || '';
      });
      row.push(format(new Date(s.created_at), 'yyyy-MM-dd HH:mm'));
      return row;
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Responses');
    XLSX.writeFile(wb, `${form.title}_responses.xlsx`);
  };

  if (!user) return null;

  return (
    <div className="app-layout bg-background">
      <main className="scrollable-content">
        <div className="max-w-6xl mx-auto py-6 px-4 pb-20">
          {/* Back link */}
          <button
            onClick={() => navigate('/forms')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Forms
          </button>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : form ? (
            <>
              {/* Header with title and export buttons */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-xl font-bold">{form.title}</h1>
                  <p className="text-sm text-muted-foreground">{submissions.length} submissions</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportXLSX} className="gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Excel
                  </Button>
                </div>
              </div>

              <SubmissionsSpreadsheetView
                fields={form.fields}
                submissions={submissions}
                formTitle={form.title}
              />
            </>
          ) : (
            <p className="text-center text-muted-foreground py-12">Form not found</p>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
