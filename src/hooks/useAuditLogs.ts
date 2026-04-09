import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  admin_user_id: string;
  admin_email: string | null;
  action_type: string;
  target_type: string;
  target_id: string | null;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  description: string;
  created_at: string;
}

interface UseAuditLogsOptions {
  limit?: number;
  offset?: number;
  actionType?: string | null;
  targetType?: string | null;
}

export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const { limit = 50, offset = 0, actionType = null, targetType = null } = options;

  return useQuery({
    queryKey: ['admin-audit-logs', limit, offset, actionType, targetType],
    queryFn: async () => {
      // Build args object, only including non-null values to avoid type issues
      const args: Record<string, any> = {
        p_limit: limit,
        p_offset: offset,
      };
      if (actionType) args.p_action_type = actionType;
      if (targetType) args.p_target_type = targetType;

      const { data, error } = await supabase.rpc('admin_get_audit_logs', args as any);

      if (error) {
        console.error('[AuditLogs] RPC error:', error.message, error.details, error.hint);
        throw new Error(error.message || 'Failed to fetch audit logs');
      }

      const logs: AuditLog[] = (data || []).map((row: any) => ({
        id: row.id,
        admin_user_id: row.admin_user_id,
        admin_email: row.admin_email,
        action_type: row.action_type,
        target_type: row.target_type,
        target_id: row.target_id,
        old_value: row.old_value,
        new_value: row.new_value,
        description: row.description,
        created_at: row.created_at,
      }));

      const totalCount = data && data.length > 0 ? (data[0]?.total_count || 0) : 0;

      return { logs, totalCount };
    },
    staleTime: 30000,
    retry: 2,
  });
}

export async function logAdminAction(
  actionType: string,
  targetType: string,
  targetId: string,
  oldValue: Record<string, any> | null = null,
  newValue: Record<string, any> | null = null,
  description: string = ''
): Promise<string | null> {
  const { data, error } = await supabase.rpc('log_admin_action', {
    p_action_type: actionType,
    p_target_type: targetType,
    p_target_id: targetId,
    p_old_value: oldValue,
    p_new_value: newValue,
    p_description: description,
  });

  if (error) {
    console.error('Failed to log admin action:', error);
    return null;
  }

  return data;
}
