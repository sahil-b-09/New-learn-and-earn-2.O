
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // This should be an admin-only function, check for admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.split(" ")[1];
    const adminToken = Deno.env.get("ADMIN_API_TOKEN");
    
    if (!adminToken || token !== adminToken) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid admin token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Create a Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Required environment variables are missing");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if admin_logs table exists
    const { data: tableExists, error: tableCheckError } = await supabase
      .from('admin_logs')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (tableCheckError && tableCheckError.code !== 'PGRST116') {
      // Some error occurred other than "relation does not exist"
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Error checking for admin_logs table", 
          error: tableCheckError 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!tableExists && tableCheckError && tableCheckError.code === 'PGRST116') {
      // Table doesn't exist, create it using RPC
      const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.admin_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action_type TEXT NOT NULL,
        admin_telegram_id TEXT NOT NULL,
        payout_id UUID,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
      );
      COMMENT ON TABLE public.admin_logs IS 'Records of admin actions for audit purposes';
      ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Admin can view logs" ON public.admin_logs FOR SELECT USING (auth.role() = 'service_role');
      `;
      
      const { error: createError } = await supabase.rpc('execute_sql', { 
        sql_query: createTableSQL 
      }).single();
      
      if (createError) {
        console.error("Error creating admin_logs table:", createError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Failed to create admin_logs table", 
            error: createError.message
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true, message: "Admin logs table created successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Table already exists
      return new Response(
        JSON.stringify({ success: true, message: "Admin logs table already exists" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
