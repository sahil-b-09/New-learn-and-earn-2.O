
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
    // This should be an admin-only function, check for admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Authentication failed: Missing or invalid Bearer token");
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized", detail: "Missing or invalid Bearer token format" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.split(" ")[1];
    const adminToken = Deno.env.get("ADMIN_API_TOKEN");
    
    if (!adminToken || token !== adminToken) {
      console.error("Authentication failed: Token mismatch", {
        receivedToken: token.substring(0, 5) + "...", // Log only first 5 chars for security
        hasAdminToken: !!adminToken
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Invalid admin token", 
          detail: "The provided token does not match the ADMIN_API_TOKEN"
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID");
    
    if (!telegramBotToken || !telegramChatId) {
      const missingEnv = [];
      if (!telegramBotToken) missingEnv.push("TELEGRAM_BOT_TOKEN");
      if (!telegramChatId) missingEnv.push("TELEGRAM_CHAT_ID");
      
      console.error(`Missing environment variables: ${missingEnv.join(", ")}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Telegram credentials not properly configured",
          missing: missingEnv,
          detail: "Please check that all required environment variables are set in Supabase"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Starting bot verification test");
    
    // Get bot info as a first test
    const botInfoResponse = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/getMe`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      }
    );
    
    const botInfoData = await botInfoResponse.json();
    
    if (!botInfoResponse.ok || !botInfoData.ok) {
      console.error("Bot token verification failed", botInfoData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Failed to get bot information. Token may be invalid.", 
          telegram_response: botInfoData,
          detail: "The TELEGRAM_BOT_TOKEN seems to be invalid or expired"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Bot token verified successfully", {
      username: botInfoData.result.username,
      id: botInfoData.result.id
    });
    
    // Test the connection to the specified chat
    const chatTestResponse = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/getChat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: telegramChatId
        }),
      }
    );
    
    const chatData = await chatTestResponse.json();
    
    if (!chatTestResponse.ok || !chatData.ok) {
      console.error("Chat ID verification failed", chatData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Failed to connect to the specified chat ID. The chat ID may be incorrect or the bot doesn't have permission.", 
          telegram_response: chatData,
          bot_info: botInfoData.result,
          detail: "The TELEGRAM_CHAT_ID seems to be invalid or the bot doesn't have permission to access it"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Chat ID verified successfully", {
      chat_type: chatData.result.type,
      chat_title: chatData.result.title || chatData.result.first_name
    });
    
    // Send a test message
    const testMessage = "🔔 Test message from Learn and Earn platform. If you're seeing this, your bot is configured correctly!";
    
    const sendMessageResponse = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: testMessage,
          parse_mode: "Markdown",
        }),
      }
    );
    
    const sendMessageData = await sendMessageResponse.json();
    
    if (!sendMessageResponse.ok || !sendMessageData.ok) {
      console.error("Message sending failed", sendMessageData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Bot and chat verified but failed to send message.", 
          telegram_response: sendMessageData,
          bot_info: botInfoData.result,
          chat_info: chatData.result,
          detail: "The bot can't send messages to this chat. Check permissions."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Test message sent successfully");
    
    // Get webhook info
    const webhookInfoResponse = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/getWebhookInfo`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      }
    );
    
    const webhookInfoData = await webhookInfoResponse.json();
    
    let webhookStatus = "Not configured";
    
    if (webhookInfoData.ok && webhookInfoData.result) {
      if (webhookInfoData.result.url) {
        webhookStatus = webhookInfoData.result.pending_update_count > 0 
          ? "Configured but has pending updates" 
          : "Properly configured and working";
      } else {
        webhookStatus = "Not set";
      }
    }
    
    console.log("Webhook status:", webhookStatus, webhookInfoData.result);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Bot test successful. Message sent to your chat.", 
        bot_info: botInfoData.result,
        chat_info: {
          id: chatData.result.id,
          type: chatData.result.type,
          title: chatData.result.title || chatData.result.first_name
        },
        message_info: sendMessageData.result,
        webhook_info: webhookInfoData.result,
        webhook_status: webhookStatus
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error testing Telegram bot:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message,
        stack: error.stack,
        detail: "An unexpected error occurred while testing the Telegram bot"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
