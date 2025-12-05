import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Prospect } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useProspects() {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  const fetchProspects = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('id, user_id, name, phone, age_or_dob, city, state, gender, date_added, updated_at, sheet_id, batch_date')
        .eq('user_id', user.id)
        .order('date_added', { ascending: false });

      if (error) {
        toast.error('Failed to fetch prospects');
        console.error('Error fetching prospects:', error);
        setProspects([]);
      } else {
        setProspects(data || []);
      }
    } catch (err) {
      console.error('Error in fetchProspects:', err);
      setProspects([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !hasFetched.current) {
      hasFetched.current = true;
      fetchProspects();
    } else if (!user) {
      hasFetched.current = false;
      setProspects([]);
      setLoading(false);
    }
  }, [user, fetchProspects]);

  const addProspect = async (prospect: Partial<Prospect>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('prospects')
      .insert({
        name: prospect.name!,
        phone: prospect.phone!,
        age_or_dob: prospect.age_or_dob || null,
        city: prospect.city || null,
        state: prospect.state || null,
        gender: prospect.gender || null,
        user_id: user.id,
        sheet_id: prospect.sheet_id || null,
        batch_date: prospect.batch_date || new Date().toISOString().split('T')[0],
      })
      .select('id, user_id, name, phone, age_or_dob, city, state, gender, date_added, updated_at, sheet_id, batch_date')
      .single();

    if (error) {
      toast.error('Failed to add prospect');
      console.error('Error adding prospect:', error);
      return null;
    }

    setProspects(prev => [data, ...prev]);
    toast.success('Prospect added');
    return data;
  };

  const updateProspect = async (id: string, updates: Partial<Prospect>) => {
    const { data, error } = await supabase
      .from('prospects')
      .update(updates as any)
      .eq('id', id)
      .select('id, user_id, name, phone, age_or_dob, city, state, gender, date_added, updated_at, sheet_id, batch_date')
      .single();

    if (error) {
      toast.error('Failed to update prospect');
      console.error('Error updating prospect:', error);
      return null;
    }

    setProspects(prev => prev.map(p => p.id === id ? data : p));
    return data;
  };

  const deleteProspect = async (id: string) => {
    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete prospect');
      console.error('Error deleting prospect:', error);
      return false;
    }

    setProspects(prev => prev.filter(p => p.id !== id));
    toast.success('Prospect deleted');
    return true;
  };

  const importProspects = async (prospectsData: Partial<Prospect>[]) => {
    if (!user) return { imported: 0, skipped: 0 };

    const validProspects = prospectsData.filter(p => p.name && p.phone);
    const skipped = prospectsData.length - validProspects.length;

    if (validProspects.length === 0) {
      return { imported: 0, skipped };
    }

    const prospectsToInsert = validProspects.map(p => ({
      user_id: user.id,
      name: p.name!,
      phone: p.phone!,
      age_or_dob: p.age_or_dob || null,
      city: p.city || null,
      state: p.state || null,
      gender: p.gender || null,
      sheet_id: p.sheet_id || null,
      batch_date: p.batch_date || new Date().toISOString().split('T')[0],
    }));

    const { data, error } = await supabase
      .from('prospects')
      .insert(prospectsToInsert as any)
      .select('id, user_id, name, phone, age_or_dob, city, state, gender, date_added, updated_at, sheet_id, batch_date');

    if (error) {
      toast.error('Failed to import prospects');
      console.error('Error importing prospects:', error);
      return { imported: 0, skipped: prospectsData.length };
    }

    setProspects(prev => [...(data || []), ...prev]);
    return { imported: data?.length || 0, skipped };
  };

  return {
    prospects,
    loading,
    addProspect,
    updateProspect,
    deleteProspect,
    importProspects,
    refetch: fetchProspects,
  };
}
