
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// Type definitions for improved readability and type safety
interface PayoutMethod {
  id: string;
  user_id: string;
  method_type: "UPI" | "BANK";
  upi_id: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  is_default: boolean;
}

interface UserInfo {
  name: string | null;
  email: string | null;
}

interface PayoutRecord {
  id: string;
  user_id: string;
  amount: number;
  status: string;
}

interface PayoutRequest {
  user_id: string;
}

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Handle CORS preflight requests
 */
function handleCorsRequest(): Response {
  return new Response(null, { headers: corsHeaders });
}

/**
 * Create a Supabase client with service role
 */
function createSupabaseClient(): ReturnType<typeof createClient> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Required environment variables are missing");
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Check if user has sufficient balance for withdrawal
 */
async function checkUserBalance(
  supabase: ReturnType<typeof createClient>, 
  userId: string
): Promise<number> {
  const { data: walletData, error: walletError } = await supabase
    .from("wallet")
    .select("balance")
    .eq("user_id", userId)
    .single();
    
  if (walletError) {
    throw new Error(`Failed to fetch wallet: ${walletError.message}`);
  }
  
  if (!walletData || walletData.balance < 250) {
    throw new Error("Insufficient balance. Minimum withdrawal amount is ₹250.");
  }
  
  return walletData.balance;
}

/**
 * Get user's default payout method
 */
async function getDefaultPayoutMethod(
  supabase: ReturnType<typeof createClient>, 
  userId: string
): Promise<PayoutMethod> {
  const { data: payoutMethodData, error: payoutMethodError } = await supabase
    .from("payout_methods")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .single();
    
  if (payoutMethodError || !payoutMethodData) {
    throw new Error("No default payout method found");
  }
  
  return payoutMethodData as PayoutMethod;
}

/**
 * Get user information for notification
 */
async function getUserInfo(
  supabase: ReturnType<typeof createClient>, 
  userId: string
): Promise<UserInfo> {
  try {
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", userId)
      .single();
      
    if (userError) {
      console.warn(`Could not fetch user details: ${userError.message}`);
      return { name: null, email: null };
    }
    
    return userData as UserInfo;
  } catch (error) {
    console.warn(`Error fetching user info: ${error.message}`);
    return { name: null, email: null };
  }
}

/**
 * Create payout record in the database
 */
async function createPayoutRecord(
  supabase: ReturnType<typeof createClient>, 
  userId: string,
  balance: number,
  payoutMethodId: string
): Promise<PayoutRecord> {
  const { data: payoutRecord, error: payoutInsertError } = await supabase
    .from("payouts")
    .insert({
      user_id: userId,
      amount: balance,
      payout_method_id: payoutMethodId,
      status: "pending",
      created_at: new Date().toISOString()
    })
    .select()
    .single();
    
  if (payoutInsertError || !payoutRecord) {
    throw new Error(`Failed to create payout record: ${payoutInsertError?.message || "Unknown error"}`);
  }
  
  return payoutRecord;
}

/**
 * Format payment details for Telegram message
 */
function formatPaymentDetails(payoutMethod: PayoutMethod): string {
  if (payoutMethod.method_type === "UPI") {
    return `UPI ID: ${payoutMethod.upi_id}`;
  } else {
    const maskedAccount = payoutMethod.account_number
      ? `${payoutMethod.account_number?.slice(-4).padStart(payoutMethod.account_number.length, '*')}`
      : 'Unknown';
      
    return `Bank Account: ${maskedAccount}\nIFSC: ${payoutMethod.ifsc_code}`;
  }
}

/**
 * Format user info text for Telegram message
 */
function formatUserInfo(userInfo: UserInfo, userId: string): string {
  return userInfo.name || userInfo.email 
    ? `User: ${userInfo.name || 'Unknown'} (${userInfo.email || 'No email'})`
    : `User ID: ${userId}`;
}

/**
 * Create Telegram message for payout notification
 */
function createTelegramMessage(
  payoutRecord: PayoutRecord,
  payoutMethod: PayoutMethod,
  userInfo: UserInfo,
  balance: number
): string {
  const paymentDetails = formatPaymentDetails(payoutMethod);
  const userInfoText = formatUserInfo(userInfo, payoutRecord.user_id);
  
  return `
🔔 *NEW PAYOUT REQUEST*

${userInfoText}
Amount: ₹${balance}
${paymentDetails}

*Payout ID:* \`${payoutRecord.id}\`

To confirm after payment:
\`/confirm_payout ${payoutRecord.id}\`
  `.trim();
}

/**
 * Send payout notification to Telegram
 */
async function sendTelegramNotification(
  payoutRecord: PayoutRecord,
  payoutMethod: PayoutMethod,
  userInfo: UserInfo,
  balance: number
): Promise<void> {
  const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
  const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID") || "";
  
  if (!telegramBotToken || !telegramChatId) {
    console.warn("Telegram credentials not set, notifications will not be sent");
    return;
  }
  
  try {
    const telegramMessage = createTelegramMessage(payoutRecord, payoutMethod, userInfo, balance);
    
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: telegramMessage,
          parse_mode: "Markdown",
        }),
      }
    );
    
    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json();
      console.error("Telegram API error:", JSON.stringify(errorData));
    } else {
      console.log("Telegram notification sent successfully");
    }
  } catch (telegramError) {
    console.error("Failed to send Telegram notification:", telegramError);
    // Continue processing even if Telegram notification fails
  }
}

/**
 * Create successful response
 */
function createSuccessResponse(payoutId: string): Response {
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: "Payout request submitted and notification sent", 
      payout_id: payoutId 
    }),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200 
    }
  );
}

/**
 * Create error response
 */
function createErrorResponse(error: Error): Response {
  console.error("Payout processing error:", error.message);
  
  return new Response(
    JSON.stringify({ 
      success: false, 
      message: error.message 
    }),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error.message.includes("Insufficient balance") ? 400 : 500 
    }
  );
}

/**
 * Process payout request from user
 */
async function processPayout(req: Request): Promise<Response> {
  try {
    const supabase = createSupabaseClient();
    
    // Parse request payload
    const payload = await req.json() as PayoutRequest;
    const { user_id } = payload;
    
    if (!user_id) {
      throw new Error("User ID is required");
    }
    
    // Check if user has sufficient balance
    const balance = await checkUserBalance(supabase, user_id);
    
    // Get user's default payout method
    const payoutMethod = await getDefaultPayoutMethod(supabase, user_id);
    
    // Get user info for the notification
    const userInfo = await getUserInfo(supabase, user_id);
    
    // Create payout record with pending status
    const payoutRecord = await createPayoutRecord(supabase, user_id, balance, payoutMethod.id);
    
    // Send notification to Telegram
    await sendTelegramNotification(payoutRecord, payoutMethod, userInfo, balance);
    
    return createSuccessResponse(payoutRecord.id);
  } catch (error) {
    return createErrorResponse(error);
  }
}

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return handleCorsRequest();
  }
  
  return await processPayout(req);
});
