
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";

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
    console.log("Webhook setup function called");
    
    // This should be an admin-only function, check for admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized: Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.split(" ")[1];
    const adminToken = Deno.env.get("ADMIN_API_TOKEN");
    
    if (!adminToken || token !== adminToken) {
      console.error("Invalid admin token provided");
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized: Invalid admin token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!telegramBotToken) {
      console.error("TELEGRAM_BOT_TOKEN not configured in environment");
      return new Response(
        JSON.stringify({ success: false, message: "Configuration error: Telegram bot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get the webhook URL and secret from the request body
    const requestBody = await req.json();
    const { webhook_url, secret } = requestBody;
    
    console.log("Request body parsed:", { webhook_url: webhook_url, has_secret: !!secret });
    
    if (!webhook_url) {
      console.error("Webhook URL is missing from request body");
      return new Response(
        JSON.stringify({ success: false, message: "Bad request: Webhook URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Prepare webhook setup body
    const webhookBody = {
      url: webhook_url,
      allowed_updates: ["message"],
      drop_pending_updates: true
    };
    
    // Add secret token if provided
    if (secret) {
      webhookBody.secret_token = secret;
    }
    
    console.log("Setting webhook with Telegram API:", { url: webhook_url });
    
    // Set webhook with Telegram
    const response = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/setWebhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookBody),
      }
    );
    
    const responseData = await response.json();
    console.log("Telegram API response:", responseData);
    
    if (!response.ok || !responseData.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Failed to set webhook: " + (responseData.description || "Unknown error"), 
          telegram_response: responseData 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // If everything was successful, also check webhook info to verify
    const verifyResponse = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/getWebhookInfo`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      }
    );
    
    const verifyData = await verifyResponse.json();
    console.log("Webhook verification response:", verifyData);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Webhook set successfully", 
        telegram_response: responseData,
        webhook_info: verifyData.result
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error setting webhook:", error);
    
    return new Response(
      JSON.stringify({ success: false, message: "Error: " + error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
