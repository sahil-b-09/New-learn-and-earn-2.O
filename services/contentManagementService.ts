
import { supabase } from '@/integrations/supabase/client';

interface ContentManagementLog {
  id: string;
  resource_type: string;
  operation_type: string;
  resource_id?: string;
  admin_id: string;
  created_at: string;
  details?: any;
}

const logContentManagement = async (logData: Omit<ContentManagementLog, 'id' | 'created_at' | 'admin_id'>) => {
  try {
    console.log('Content management action:', logData);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('content_management_logs')
      .insert({
        admin_id: user.id,
        resource_type: logData.resource_type,
        operation_type: logData.operation_type,
        resource_id: logData.resource_id,
        details: logData.details
      });

    if (error) {
      console.error('Error logging content management:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in content management logging:', error);
    return { success: false, error };
  }
};

const getContentManagementLogs = async (limit: number = 50): Promise<ContentManagementLog[]> => {
  try {
    const { data, error } = await supabase
      .from('content_management_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching content management logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching content management logs:', error);
    return [];
  }
};

export { logContentManagement, getContentManagementLogs };
export type { ContentManagementLog };
