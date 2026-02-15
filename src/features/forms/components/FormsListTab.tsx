import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, Copy, Trash2, Share2, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShareFormDialog } from './ShareFormDialog';
import { useForms } from '../hooks/useForms';
import { format } from 'date-fns';
import type { NevoraFormWithFields } from '../types';

interface Props {
  onEdit: (form: NevoraFormWithFields) => void;
}

export function FormsListTab({ onEdit }: Props) {
  const navigate = useNavigate();
  const { forms, loading, fetchForms, duplicateForm, deleteForm, getShareToken, getShareUrl } = useForms();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  useEffect(() => {
    if (forms.length === 0) return;
    const fetchCounts = async () => {
      const { getSubmissionCount } = useForms();
      const newCounts: Record<string, number> = {};
      await Promise.all(forms.map(async f => {
        newCounts[f.id] = await getSubmissionCount(f.id);
      }));
      setCounts(newCounts);
    };
    fetchCounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forms.length]);

  const handleShare = async (form: NevoraFormWithFields) => {
    const token = await getShareToken(form.id);
    if (token) {
      setShareUrl(getShareUrl(token));
      setShareTitle(form.title);
      setShareOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-muted-foreground">No forms yet</p>
        <p className="text-xs text-muted-foreground">Switch to "Create Form" tab to build your first form</p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/50 hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground">Form Name</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Type</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Submissions</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Created</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.map(form => (
              <TableRow key={form.id} className="cursor-pointer hover:bg-muted/30" onClick={() => onEdit(form)}>
                <TableCell className="font-medium text-sm">{form.title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600 bg-orange-50">
                    {form.form_type || 'Custom'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{counts[form.id] ?? '...'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(form.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${form.is_accepting
                      ? 'border-green-300 text-green-700 bg-green-50'
                      : 'border-red-300 text-red-600 bg-red-50'
                    }`}
                  >
                    {form.is_accepting ? 'Active' : 'Closed'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/forms/${form.id}/responses`)}>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleShare(form)}>
                      <Share2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => duplicateForm(form.id)}>
                          <Copy className="h-4 w-4 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{form.title}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the form, all fields, submissions, and responses.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteForm(form.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ShareFormDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        shareUrl={shareUrl}
        formTitle={shareTitle}
      />
    </>
  );
}
