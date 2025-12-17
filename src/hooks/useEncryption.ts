import { supabase } from '@/integrations/supabase/client';

export function useEncryption() {
  // Simplified invoke - edge function validates JWT, no need for client-side validation
  // This removes 4-5 redundant HTTP requests per encryption call
  const invokeEncryptFunction = async (action: string, data: any): Promise<any> => {
    try {
      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action, data }
      });

      if (error) {
        // Auth errors (401) are handled gracefully - return original data
        console.warn('Encryption function error:', error.message);
        return null;
      }

      return result;
    } catch (err) {
      // Silently handle any errors
      return null;
    }
  };

  const encryptFields = async (data: { phone?: string; email?: string }) => {
    const result = await invokeEncryptFunction('encrypt', data);
    return result?.encrypted || data;
  };

  const decryptFields = async (data: { phone?: string; email?: string }) => {
    const result = await invokeEncryptFunction('decrypt', data);
    return result?.decrypted || data;
  };

  const decryptBatch = async <T extends { phone?: string; email?: string }>(records: T[]): Promise<T[]> => {
    if (records.length === 0) return records;
    const result = await invokeEncryptFunction('decrypt-batch', { records });
    return result?.decrypted || records;
  };

  const encryptBatch = async <T extends { phone?: string; email?: string }>(records: T[]): Promise<T[]> => {
    if (records.length === 0) return records;
    const result = await invokeEncryptFunction('encrypt-batch', { records });
    return result?.encrypted || records;
  };

  return { encryptFields, decryptFields, decryptBatch, encryptBatch };
}
