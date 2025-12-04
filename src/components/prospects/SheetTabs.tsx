import { useState } from 'react';
import { Sheet } from '@/types/prospect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Pencil, Trash2, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface SheetTabsProps {
  sheets: Sheet[];
  selectedSheetId: string | null;
  onSelectSheet: (id: string | null) => void;
  onAddSheet: (name: string) => Promise<Sheet | null>;
  onUpdateSheet: (id: string, name: string) => Promise<Sheet | null>;
  onDeleteSheet: (id: string) => Promise<boolean>;
}

export function SheetTabs({
  sheets,
  selectedSheetId,
  onSelectSheet,
  onAddSheet,
  onUpdateSheet,
  onDeleteSheet,
}: SheetTabsProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [editingSheet, setEditingSheet] = useState<Sheet | null>(null);

  const handleAddSheet = async () => {
    if (!newSheetName.trim()) return;
    const sheet = await onAddSheet(newSheetName.trim());
    if (sheet) {
      onSelectSheet(sheet.id);
      setNewSheetName('');
      setIsAddOpen(false);
    }
  };

  const handleEditSheet = async () => {
    if (!editingSheet || !newSheetName.trim()) return;
    await onUpdateSheet(editingSheet.id, newSheetName.trim());
    setNewSheetName('');
    setEditingSheet(null);
    setIsEditOpen(false);
  };

  const handleDeleteSheet = async (sheet: Sheet) => {
    if (confirm(`Delete "${sheet.name}"? Prospects will be unassigned from this sheet.`)) {
      await onDeleteSheet(sheet.id);
    }
  };

  const openEditDialog = (sheet: Sheet) => {
    setEditingSheet(sheet);
    setNewSheetName(sheet.name);
    setIsEditOpen(true);
  };

  return (
    <div className="flex items-center gap-2 mb-3">
      <ScrollArea className="flex-1 whitespace-nowrap">
        <div className="flex items-center gap-1.5 pb-1">
          <Button
            variant={selectedSheetId === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelectSheet(null)}
            className="h-8 text-xs shrink-0"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
            All Leads
          </Button>
          {sheets.map((sheet) => (
            <div key={sheet.id} className="flex items-center shrink-0">
              <Button
                variant={selectedSheetId === sheet.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSelectSheet(sheet.id)}
                className={cn(
                  "h-8 text-xs rounded-r-none border-r-0",
                  selectedSheetId === sheet.id && "bg-primary text-primary-foreground"
                )}
              >
                {sheet.name}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={selectedSheetId === sheet.id ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      "h-8 w-7 p-0 rounded-l-none",
                      selectedSheetId === sheet.id && "bg-primary text-primary-foreground"
                    )}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border-border z-50">
                  <DropdownMenuItem onClick={() => openEditDialog(sheet)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDeleteSheet(sheet)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs shrink-0">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Sheet
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Sheet</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g., 5 Dec leads"
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSheet()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSheet} disabled={!newSheetName.trim()}>
              Create Sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rename Sheet</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Sheet name"
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEditSheet()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSheet} disabled={!newSheetName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
