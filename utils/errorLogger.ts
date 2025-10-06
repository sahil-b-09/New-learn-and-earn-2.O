
export class DataLoadingError extends Error {
  constructor(
    message: string,
    public context?: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'DataLoadingError';
  }
}

export const logDataError = (context: string, error: any, additionalInfo?: any) => {
  console.group(`🔴 Data Loading Error - ${context}`);
  console.error('Error:', error);
  if (additionalInfo) {
    console.log('Additional Info:', additionalInfo);
  }
  console.trace();
  console.groupEnd();
};

export const logDataSuccess = (context: string, data: any) => {
  console.log(`✅ Data Loaded Successfully - ${context}:`, data?.length || 'N/A', 'items');
};

export const handleSupabaseError = (error: any, context: string) => {
  if (!error) return null;
  
  console.error(`Supabase error in ${context}:`, error);
  
  // Common Supabase error codes
  if (error.code === 'PGRST116') {
    return 'No data found';
  }
  
  if (error.code === '42501') {
    return 'Permission denied - check RLS policies';
  }
  
  if (error.code === '42P01') {
    return 'Table does not exist';
  }
  
  return error.message || 'Unknown database error';
};
