import { useState, useMemo, useEffect, useRef } from 'react';
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
import { Loader2, Lock, Trash2, Edit2, Send, X, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Prospect, FunnelStage } from '@/types/prospect';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

// Only 4 funnel stages with pastel colors
const FUNNEL_STAGES: { stage: FunnelStage; color: string; label: string }[] = [
  { stage: 'Day 1', color: '#D9E7FF', label: 'Day 1' },
  { stage: 'Day 2', color: '#FFE0E7', label: 'Day 2' },
  { stage: 'Minimum Bill', color: '#DFF8E7', label: 'Minimum Billings' },
  { stage: 'Level Up', color: '#FFEFD6', label: 'Level Up' },
];

// Premium stage card component with pastel colors
interface StageCardProps {
  stage: string;
  label: string;
  color: string;
  prospects: Prospect[];
  isPro: boolean;
}

function StageCard({ stage, label, color, prospects, isPro }: StageCardProps) {
  return (
    <div 
      className="min-w-[150px] sm:min-w-[170px] w-[150px] sm:w-[170px] shrink-0 bg-white dark:bg-card rounded-xl overflow-hidden transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg"
      style={{ 
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        border: '1px solid rgba(0,0,0,0.04)'
      }}
    >
      {/* Header with pastel color */}
      <div 
        className="px-3 py-2.5 sm:px-4 sm:py-3"
        style={{ backgroundColor: color }}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-xs sm:text-sm text-gray-800 truncate">{label}</h3>
          <span className="text-xs font-bold text-gray-700 bg-white/80 px-2 py-0.5 rounded-full min-w-[24px] text-center">
            {isPro ? prospects.length : '–'}
          </span>
        </div>
      </div>
      
      {/* Prospect names - white background */}
      <div className="p-2.5 sm:p-3 max-h-[160px] sm:max-h-[180px] overflow-y-auto space-y-1 bg-white dark:bg-card">
        {!isPro ? (
          <p className="text-[10px] sm:text-xs text-muted-foreground text-center py-4">Upgrade to view</p>
        ) : prospects.length === 0 ? (
          <p className="text-[10px] sm:text-xs text-muted-foreground/60 text-center py-6">No prospects</p>
        ) : (
          prospects.map((prospect, index) => (
            <div 
              key={prospect.id}
              className="text-xs sm:text-sm text-foreground/90 py-1 px-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-muted/30 transition-colors duration-150 break-words"
            >
              <span className="text-muted-foreground/50 text-[10px] sm:text-xs mr-1">{index + 1}.</span>
              <span className="font-medium leading-snug">{prospect.name}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Todo item component with dotted blue line separator
interface TodoItemProps {
  todo: {
    id: string;
    title: string;
    completed: boolean;
    due_date?: string | null;
  };
  isEditing: boolean;
  editingTitle: string;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onStartEdit: (id: string, title: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (value: string) => void;
}

function TodoItem({ 
  todo, 
  isEditing, 
  editingTitle, 
  onToggle, 
  onDelete, 
  onStartEdit, 
  onSaveEdit, 
  onCancelEdit,
  onEditChange 
}: TodoItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.touches[0].clientX;
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 80));
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 60) {
      setIsDeleting(true);
      setTimeout(() => onDelete(todo.id), 200);
    }
    setSwipeOffset(0);
    setTouchStart(null);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-2",
        isDeleting && "opacity-0 scale-95 -translate-x-full"
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete indicator on swipe */}
      <div 
        className="absolute right-0 top-0 bottom-0 bg-destructive/90 flex items-center justify-center px-4 rounded-r-xl"
        style={{ width: swipeOffset }}
      >
        <Trash2 className="h-4 w-4 text-white" />
      </div>
      
      <div
        className={cn(
          "bg-white dark:bg-card p-3 sm:p-4 transition-all duration-300 group",
          todo.completed && "opacity-60"
        )}
        style={{ 
          transform: `translateX(-${swipeOffset}px)`
        }}
      >
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editingTitle}
              onChange={(e) => onEditChange(e.target.value)}
              className="flex-1 h-9 text-sm bg-muted/30 border-border/50"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSaveEdit}>
              <Check className="h-4 w-4 text-green-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancelEdit}>
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="pt-0.5">
              <Checkbox
                checked={todo.completed}
                onCheckedChange={(checked) => onToggle(todo.id, !!checked)}
                className={cn(
                  "h-5 w-5 rounded-md border-2 transition-all duration-200",
                  "data-[state=checked]:bg-[#4A6CF7] data-[state=checked]:border-[#4A6CF7]",
                  "hover:border-[#4A6CF7]/60"
                )}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium leading-relaxed transition-all duration-300",
                todo.completed && "line-through text-muted-foreground"
              )}>
                {todo.title}
              </p>
              {todo.due_date && (
                <p className="text-xs text-muted-foreground mt-1">
                  Due: {format(parseISO(todo.due_date), 'dd MMM yyyy')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => onStartEdit(todo.id, todo.title)}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  setIsDeleting(true);
                  setTimeout(() => onDelete(todo.id), 200);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Dotted blue separator line */}
      <div 
        className="h-px mx-3"
        style={{ 
          backgroundImage: 'linear-gradient(to right, #4A6CF7 50%, transparent 50%)',
          backgroundSize: '8px 1px',
          backgroundRepeat: 'repeat-x'
        }}
      />
    </div>
  );
}

export default function TodoUp() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects } = useProspects();
  const { isPro, loading: subLoading } = useSubscription();
  const { todos, loading: todosLoading, addTodo, updateTodo, toggleTodo, deleteTodo } = useTodos();
  const [newTodoInput, setNewTodoInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Group prospects by funnel stage
  const funnelData = useMemo(() => {
    const groups: Record<string, Prospect[]> = {};
    FUNNEL_STAGES.forEach(({ stage }) => {
      groups[stage] = [];
    });
    
    prospects.forEach(p => {
      if (p.funnel_stage && groups[p.funnel_stage] !== undefined) {
        groups[p.funnel_stage].push(p);
      }
    });
    
    return groups;
  }, [prospects]);

  const handleAddTodo = async () => {
    if (!newTodoInput.trim()) return;
    setIsAddingTodo(true);
    await addTodo(newTodoInput.trim());
    setNewTodoInput('');
    setIsAddingTodo(false);
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

  // Sort todos: pending first, then completed
  const sortedTodos = useMemo(() => {
    return [...todos].sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1;
    });
  }, [todos]);

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] dark:bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#4A6CF7]" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-card/90 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center px-4 py-3">
          <div className="flex items-center gap-3">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">Todo Up</h1>
              <p className="text-[10px] text-muted-foreground font-medium">Your Tasks & Prospects</p>
            </div>
          </div>
        </div>
      </header>

      <main className={cn("flex-1 pb-44", !isPro && "pb-52")}>
        {/* Lock overlay for Free users */}
        {!isPro && (
          <div className="mx-4 mt-4 relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/90 dark:bg-background/90 backdrop-blur-sm rounded-2xl py-12">
              <div className="p-4 rounded-full bg-[#F7F8FA] dark:bg-muted mb-4">
                <Lock className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Pro Feature</h3>
              <p className="text-sm text-muted-foreground max-w-xs text-center">
                Subscribe for ₹249 to unlock Todo Up and all premium features.
              </p>
            </div>
          </div>
        )}

        {/* Section 1: Personal To-Do List (MOVED TO TOP) */}
        <section className="px-4 pt-5">
          <div className="mb-4">
            <h2 className="text-base font-bold text-foreground">My To-Do List</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPro ? `${todos.filter(t => !t.completed).length} pending tasks` : 'Upgrade to manage tasks'}
            </p>
          </div>

          {/* Dotted blue line under header */}
          <div 
            className="h-px mb-4"
            style={{ 
              backgroundImage: 'linear-gradient(to right, #4A6CF7 50%, transparent 50%)',
              backgroundSize: '8px 1px',
              backgroundRepeat: 'repeat-x'
            }}
          />

          {!isPro ? (
            <div 
              className="bg-white dark:bg-card rounded-xl py-12 border border-border/30"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <p className="text-sm text-muted-foreground text-center">
                Upgrade to Pro to manage tasks
              </p>
            </div>
          ) : todosLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#4A6CF7]" />
            </div>
          ) : sortedTodos.length === 0 ? (
            <div 
              className="bg-white dark:bg-card rounded-xl py-12 border border-border/30"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <p className="text-sm text-muted-foreground text-center">
                No tasks yet. Add one below!
              </p>
            </div>
          ) : (
            <div 
              className="bg-white dark:bg-card rounded-xl overflow-hidden border border-border/30 max-h-[35vh] overflow-y-auto"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              {sortedTodos.map(todo => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  isEditing={editingId === todo.id}
                  editingTitle={editingTitle}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                  onStartEdit={handleStartEdit}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onEditChange={setEditingTitle}
                />
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Smart Prospect Board (MOVED BELOW TO-DO) */}
        <section className="pt-8 pb-4">
          <div className="px-4 mb-3">
            <h2 className="text-base font-bold text-foreground">Smart Prospect Board</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Track prospects across funnel stages</p>
          </div>
          
          {/* Horizontal scrolling cards - 4 pastel columns */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto px-4 pb-2 scroll-smooth"
            style={{ 
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {FUNNEL_STAGES.map(({ stage, color, label }) => (
              <StageCard
                key={stage}
                stage={stage}
                label={label}
                color={color}
                prospects={funnelData[stage] || []}
                isPro={isPro}
              />
            ))}
            {/* Extra padding at end for scroll */}
            <div className="w-1 shrink-0" />
          </div>
        </section>
      </main>

      {/* Section 3: AI Chat-Style Input Bar */}
      {isPro && (
        <div className="fixed bottom-20 left-0 right-0 z-30 px-4 pb-4">
          <div className="max-w-lg mx-auto">
            <div 
              className="flex items-center gap-2 bg-white dark:bg-card rounded-full px-4 py-2 border border-border/40"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
            >
              <Input
                placeholder="Add a task…"
                value={newTodoInput}
                onChange={(e) => setNewTodoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTodoInput.trim()) {
                    e.preventDefault();
                    handleAddTodo();
                  }
                }}
                disabled={isAddingTodo}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 text-sm h-10"
              />
              <Button
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full shrink-0 transition-all duration-200",
                  "bg-[#4A6CF7] hover:bg-[#3A5CE7] active:scale-95",
                  "shadow-lg shadow-[#4A6CF7]/25 hover:shadow-xl hover:shadow-[#4A6CF7]/30",
                  (!newTodoInput.trim() || isAddingTodo) && "opacity-50 shadow-none"
                )}
                onClick={handleAddTodo}
                disabled={!newTodoInput.trim() || isAddingTodo}
              >
                {isAddingTodo ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Send className="h-4 w-4 text-white" />
                )}
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
