
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayoutRequest {
  user_id: string;
  amount: number;
  upi_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get the Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    
    // Get the authenticated user (calls can only be made by authenticated users)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "You must be logged in to use this function" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    // Check if the user is an admin
    const { data: isAdmin, error: adminCheckError } = await supabaseClient.rpc("is_user_admin", {
      user_id: user.id
    });
    
    if (adminCheckError || !isAdmin) {
      console.error("Admin check error:", adminCheckError);
      return new Response(
        JSON.stringify({ 
          error: "Forbidden",
          message: "You must be an admin to use this function"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }
    
    // Parse the request body
    let payout: PayoutRequest;
    try {
      payout = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Invalid request", message: "Could not parse request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Validate the request body
    if (!payout.user_id || !payout.amount || !payout.upi_id) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields",
          message: "user_id, amount, and upi_id are required" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Get the Telegram bot token and chat ID
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
    
    if (!botToken || !chatId) {
      console.error("Telegram configuration missing");
      return new Response(
        JSON.stringify({ 
          error: "Server configuration error",
          message: "Telegram bot not configured properly"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Format the message
    const message = `
💸 Payout Initiated

👤 User: ${payout.user_id}
💰 Amount: ₹${payout.amount}
📤 UPI ID: ${payout.upi_id}
    `.trim();
    
    // Send the message to Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
    
    if (!telegramResponse.ok) {
      const telegramError = await telegramResponse.text();
      console.error("Telegram API error:", telegramError);
      return new Response(
        JSON.stringify({ 
          error: "Telegram API error",
          message: "Failed to send message to Telegram",
          details: telegramError
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Log the success in user_activity_logs
    await supabaseClient.from("user_activity_logs").insert({
      user_id: user.id,
      activity_type: "telegram_payout_notification",
      resource_id: payout.user_id,
      metadata: {
        amount: payout.amount,
        upi_id: payout.upi_id,
        sent_by: user.id
      }
    });
    
    // Return success
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Payout notification sent successfully",
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Server error",
        message: error.message || "An unexpected error occurred"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
