import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { FormsListTab } from '../components/FormsListTab';
import { CreateFormInline } from '../components/CreateFormInline';
import type { NevoraFormWithFields } from '../types';

export default function FormsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('my-forms');
  const [editingForm, setEditingForm] = useState<NevoraFormWithFields | null>(null);

  useEffect(() => {
    if (!user && !authLoading) navigate('/auth');
  }, [user, authLoading, navigate]);

  const handleEdit = (form: NevoraFormWithFields) => {
    setEditingForm(form);
    setActiveTab('create');
  };

  const handleCreateSuccess = () => {
    setEditingForm(null);
    setActiveTab('my-forms');
  };

  if (!user) return null;

  return (
    <div className="app-layout bg-background">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Nevorai Forms</h1>
        </div>
      </header>

      <main className="scrollable-content">
        <div className="max-w-4xl mx-auto py-4 px-4 pb-20">
          <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); if (v === 'my-forms') setEditingForm(null); }}>
            <TabsList className="bg-muted/50 p-1 rounded-lg w-auto">
              <TabsTrigger value="my-forms" className="rounded-md px-4 text-sm">My Forms</TabsTrigger>
              <TabsTrigger value="create" className="rounded-md px-4 text-sm">
                {editingForm ? 'Edit Form' : 'Create Form'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-forms" className="mt-4">
              <FormsListTab onEdit={handleEdit} />
            </TabsContent>

            <TabsContent value="create" className="mt-4">
              <CreateFormInline
                key={editingForm?.id || 'new'}
                editingForm={editingForm}
                onSuccess={handleCreateSuccess}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
