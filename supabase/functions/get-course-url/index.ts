
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body
    const { user_id, course_id } = await req.json();
    
    // Validate input
    if (!user_id || !course_id) {
      return new Response(
        JSON.stringify({ error: "Both user_id and course_id are required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Initialize Supabase client with admin privileges
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if the user has purchased the course
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from("purchases")
      .select("id")
      .eq("user_id", user_id)
      .eq("course_id", course_id)
      .single();
    
    if (purchaseError || !purchase) {
      console.error("Purchase verification error:", purchaseError);
      return new Response(
        JSON.stringify({ error: "You have not purchased this course" }),
        { 
          status: 403, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Get the course details to find the PDF path
    const { data: course, error: courseError } = await supabaseClient
      .from("courses")
      .select("pdf_url")
      .eq("id", course_id)
      .single();
    
    if (courseError || !course || !course.pdf_url) {
      console.error("Course fetch error:", courseError);
      return new Response(
        JSON.stringify({ error: "Course PDF not found" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Generate a signed URL for the PDF (valid for 1 hour)
    const { data: signedUrl, error: signedUrlError } = await supabaseClient
      .storage
      .from("courses")
      .createSignedUrl(course.pdf_url, 3600); // 3600 seconds = 1 hour
    
    if (signedUrlError || !signedUrl) {
      console.error("Signed URL generation error:", signedUrlError);
      return new Response(
        JSON.stringify({ error: "Failed to generate download link" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Return the signed URL
    return new Response(
      JSON.stringify({ url: signedUrl.signedUrl }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
