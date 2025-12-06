import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { useSubscription } from '@/hooks/useSubscription';
import { useTodos } from '@/hooks/useTodos';
import { BottomNav } from '@/components/layout/BottomNav';
import { UpgradeBar } from '@/components/subscription/UpgradeBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle, Lock, Trash2, Edit2, Send, X, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

const FUNNEL_COLUMNS = ['Day 1', 'Day 2', 'Minimum Bill', 'Level Up'] as const;

export default function TodoUp() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects } = useProspects();
  const { isPro, loading: subLoading } = useSubscription();
  const { todos, loading: todosLoading, addTodo, updateTodo, toggleTodo, deleteTodo } = useTodos();
  const [newTodoInput, setNewTodoInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Group prospects by funnel stage for the dashboard
  const funnelData = useMemo(() => {
    const groups: Record<string, string[]> = {
      'Day 1': [],
      'Day 2': [],
      'Minimum Bill': [],
      'Level Up': [],
    };
    
    prospects.forEach(p => {
      if (p.funnel_stage && groups[p.funnel_stage] !== undefined) {
        groups[p.funnel_stage].push(p.name);
      }
    });
    
    return groups;
  }, [prospects]);

  const handleAddTodo = async () => {
    if (!newTodoInput.trim()) return;
    await addTodo(newTodoInput.trim());
    setNewTodoInput('');
  };

  const handleStartEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingTitle.trim()) return;
    await updateTodo(editingId, { title: editingTitle.trim() });
    setEditingId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex flex-col">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight">NevorAI</h1>
              <p className="text-[10px] text-muted-foreground font-medium">Never miss a followup Again</p>
            </div>
          </div>
        </div>
      </header>

      <main className={cn("flex-1 container py-4 px-4 space-y-5 pb-40", !isPro && "pb-48")}>
        <div className="mb-2">
          <h2 className="text-2xl font-bold tracking-tight">Todo Up</h2>
          <p className="text-sm text-muted-foreground">Your Tasks & Funnel Overview</p>
          <div className="flex items-center gap-1 mt-2">
            <div className="w-8 h-1 bg-primary rounded-full" />
            <div className="w-2 h-1 bg-primary/50 rounded-full" />
            <div className="w-1 h-1 bg-primary/30 rounded-full" />
          </div>
        </div>

        {/* Lock overlay for Free users */}
        {!isPro && (
          <div className="relative mb-6">
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/80 backdrop-blur-sm rounded-2xl py-16">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Lock className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Pro Feature</h3>
              <p className="text-muted-foreground max-w-sm text-center">
                Subscribe for ₹249 to unlock Todo Up and all premium features.
              </p>
            </div>
          </div>
        )}

        {/* Funnel Stage Dashboard - 4 columns */}
        <div className="bg-card rounded-2xl p-4 border border-border/50">
          <h3 className="font-semibold mb-4 text-sm">Funnel Stage Overview</h3>
          <div className="grid grid-cols-4 gap-2">
            {FUNNEL_COLUMNS.map(stage => (
              <div key={stage} className="text-center">
                <div className="bg-primary/10 rounded-lg py-2 px-1 mb-2">
                  <p className="text-[10px] font-semibold text-primary truncate">{stage}</p>
                  <p className="text-lg font-bold">{isPro ? funnelData[stage].length : '–'}</p>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {isPro && funnelData[stage].slice(0, 5).map((name, idx) => (
                    <p key={idx} className="text-[10px] text-muted-foreground truncate px-1">
                      {name}
                    </p>
                  ))}
                  {isPro && funnelData[stage].length > 5 && (
                    <p className="text-[10px] text-primary font-medium">
                      +{funnelData[stage].length - 5} more
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* To-Do List */}
        <div className="bg-card rounded-2xl p-4 border border-border/50 flex-1">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">My To-Do List</h3>
          </div>

          {!isPro ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Upgrade to Pro to manage tasks
            </p>
          ) : todosLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : todos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No tasks yet. Add one below!
            </p>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {todos.map(todo => (
                <div
                  key={todo.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-colors group",
                    todo.completed ? "bg-muted/20" : "bg-muted/30"
                  )}
                >
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={(checked) => toggleTodo(todo.id, !!checked)}
                  />
                  
                  {editingId === todo.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit}>
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm",
                          todo.completed && "line-through text-muted-foreground"
                        )}>
                          {todo.title}
                        </p>
                        {todo.due_date && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Due: {format(parseISO(todo.due_date), 'dd MMM yyyy')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartEdit(todo.id, todo.title)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteTodo(todo.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* AI-style input bar at bottom */}
      {isPro && (
        <div className="fixed bottom-20 left-0 right-0 z-30 px-4 pb-2 bg-gradient-to-t from-background via-background to-transparent pt-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-2 bg-card border border-border/50 rounded-2xl p-2 shadow-lg">
              <Input
                placeholder="Add a to-do task or reminder…"
                value={newTodoInput}
                onChange={(e) => setNewTodoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTodoInput.trim()) {
                    e.preventDefault();
                    handleAddTodo();
                  }
                }}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
              />
              <Button
                size="icon"
                className="h-9 w-9 rounded-xl shrink-0"
                onClick={handleAddTodo}
                disabled={!newTodoInput.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Bar for Free Users */}
      <UpgradeBar />

      <BottomNav />
    </div>
  );
}
