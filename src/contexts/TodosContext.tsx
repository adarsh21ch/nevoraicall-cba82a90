// Global Todos Provider - Single source of truth for instant tab switching
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Todo } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const TODOS_CACHE_KEY = 'nevorai-todos-cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface TodosContextType {
  todos: Todo[];
  loading: boolean;
  addTodo: (title: string, dueDate?: string) => Promise<Todo | null>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<Todo | null>;
  deleteTodo: (id: string) => Promise<boolean>;
  toggleTodo: (id: string, completed: boolean) => Promise<Todo | null>;
  refetch: () => Promise<void>;
}

const TodosContext = createContext<TodosContextType | undefined>(undefined);

export function TodosProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>(() => {
    try {
      const cached = sessionStorage.getItem(TODOS_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (data && Array.isArray(data) && Date.now() - timestamp < CACHE_TTL) {
          return data;
        }
      }
    } catch (e) {
      console.error('Cache load error:', e);
    }
    return [];
  });
  const [loading, setLoading] = useState(true);
  
  const hasFetched = useRef(false);
  const currentUserId = useRef<string | null>(null);
  const isRefreshing = useRef(false);

  // Save to cache on change
  useEffect(() => {
    if (user && todos.length > 0) {
      try {
        sessionStorage.setItem(TODOS_CACHE_KEY, JSON.stringify({
          userId: user.id,
          data: todos,
          timestamp: Date.now(),
        }));
      } catch (e) { /* ignore */ }
    }
  }, [todos, user]);

  const fetchTodos = useCallback(async (isBackground = false) => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    if (!isBackground && todos.length === 0) {
      setLoading(true);
    }
    
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .order('completed', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTodos(data as Todo[]);
      }
    } catch (err) {
      console.error('Error fetching todos:', err);
    } finally {
      setLoading(false);
      isRefreshing.current = false;
    }
  }, [user, todos.length]);

  useEffect(() => {
    if (user && currentUserId.current !== user.id) {
      currentUserId.current = user.id;
      hasFetched.current = false;
      
      try {
        const cached = sessionStorage.getItem(TODOS_CACHE_KEY);
        if (cached) {
          const { userId } = JSON.parse(cached);
          if (userId !== user.id) {
            setTodos([]);
            sessionStorage.removeItem(TODOS_CACHE_KEY);
          }
        }
      } catch (e) { /* ignore */ }
    }
    
    if (user && !hasFetched.current) {
      hasFetched.current = true;
      fetchTodos();
    } else if (!user) {
      hasFetched.current = false;
      currentUserId.current = null;
      setTodos([]);
      setLoading(false);
      sessionStorage.removeItem(TODOS_CACHE_KEY);
    }
  }, [user, fetchTodos]);

  const addTodo = useCallback(async (title: string, dueDate?: string) => {
    if (!user) return null;

    // Optimistic add
    const tempId = `temp-${Date.now()}`;
    const tempTodo: Todo = {
      id: tempId,
      title,
      completed: false,
      due_date: dueDate || null,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTodos(prev => [tempTodo, ...prev]);

    const { data, error } = await supabase
      .from('todos')
      .insert({
        title,
        due_date: dueDate || null,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      // Revert optimistic add
      setTodos(prev => prev.filter(t => t.id !== tempId));
      toast.error('Failed to add task');
      return null;
    }

    // Replace temp with real
    setTodos(prev => prev.map(t => t.id === tempId ? (data as Todo) : t));
    toast.success('Task added');
    return data as Todo;
  }, [user]);

  const updateTodo = useCallback(async (id: string, updates: Partial<Todo>) => {
    // Optimistic update
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    const { data, error } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      fetchTodos(true); // Revert on error
      toast.error('Failed to update task');
      return null;
    }

    return data as Todo;
  }, [fetchTodos]);

  const deleteTodo = useCallback(async (id: string) => {
    // Optimistic delete
    const deleted = todos.find(t => t.id === id);
    setTodos(prev => prev.filter(t => t.id !== id));

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (error) {
      // Revert
      if (deleted) setTodos(prev => [deleted, ...prev]);
      toast.error('Failed to delete task');
      return false;
    }

    return true;
  }, [todos]);

  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    return updateTodo(id, { completed });
  }, [updateTodo]);

  const refetch = useCallback(() => fetchTodos(true), [fetchTodos]);

  return (
    <TodosContext.Provider value={{
      todos,
      loading,
      addTodo,
      updateTodo,
      deleteTodo,
      toggleTodo,
      refetch,
    }}>
      {children}
    </TodosContext.Provider>
  );
}

export function useGlobalTodos() {
  const context = useContext(TodosContext);
  if (context === undefined) {
    throw new Error('useGlobalTodos must be used within a TodosProvider');
  }
  return context;
}
