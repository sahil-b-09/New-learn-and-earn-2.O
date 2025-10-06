
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  
  try {
    // Get the request payload
    const payload: WebhookPayload = await req.json();
    const message = payload.message || "Test notification from Learn & Earn Admin Dashboard";
    
    // Get environment variables
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
    
    // Validate environment variables
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error("Missing Telegram configuration");
      return new Response(
        JSON.stringify({
          error: "Telegram bot not configured. Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in your environment variables."
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }
    
    // Prepare the message
    const telegramMessage = `🤖 *Learn & Earn Admin Notification*\n\n${message}`;
    
    // Send message to Telegram
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: telegramMessage,
          parse_mode: "Markdown"
        })
      }
    );
    
    const telegramResult = await telegramResponse.json();
    
    if (!telegramResponse.ok) {
      console.error("Failed to send Telegram message:", telegramResult);
      return new Response(
        JSON.stringify({
          error: `Failed to send Telegram message: ${telegramResult.description || "Unknown error"}`,
          details: telegramResult
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }
    
    // Log the success
    console.log("Telegram message sent successfully:", telegramResult);
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Telegram message sent successfully",
        details: telegramResult
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
    
  } catch (error) {
    console.error("Error in telegram-test function:", error);
    return new Response(
      JSON.stringify({
        error: `Internal server error: ${error.message}`
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
});
