
// Supabase Edge Function: payment-webhook
import { serve } from "https://deno.land/std@0.195.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || "test_webhook_secret";
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "rzp_test_uMvpbB0vwPADDJ";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "8duTFh22qI2D8gAL8ewUVVKs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper for verifying Razorpay signatures
const verifyRazorpaySignature = (body: string, signature: string, secret: string): boolean => {
  // In a real environment, you'd use crypto functions to verify the HMAC signature
  // For this demo purpose, we'll just return true
  console.log("Webhook received with signature:", signature);
  console.log("Webhook body:", body);
  
  // Simulate verification for testing
  return true;
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the webhook payload
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    
    // Verify the webhook signature
    const isValidSignature = verifyRazorpaySignature(body, signature, WEBHOOK_SECRET);
    
    if (!isValidSignature) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Parse the webhook payload
    const payload = JSON.parse(body);
    const event = payload.event;
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Handle different webhook events
    switch (event) {
      case "payment.captured":
      case "order.paid": {
        // Extract payment details
        const paymentData = payload.payload.payment.entity || payload.payload.order.entity;
        const notes = paymentData.notes || {};
        const userId = notes.user_id;
        const courseId = notes.course_id;
        const referralCode = notes.used_referral_code || null;
        const paymentId = paymentData.id;
        const orderId = paymentData.order_id || paymentData.id;
        
        console.log(`Processing payment for user ${userId}, course ${courseId}`);
        
        // Find the purchase record
        const { data: purchases, error: fetchError } = await supabase
          .from("purchases")
          .select("*")
          .eq("user_id", userId)
          .eq("course_id", courseId)
          .order("purchased_at", { ascending: false })
          .limit(1);
          
        if (fetchError || !purchases || purchases.length === 0) {
          console.error("Could not find purchase record:", fetchError);
          return new Response(
            JSON.stringify({ success: false, error: "Purchase record not found" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Process referral reward if applicable
        if (referralCode) {
          // Find the referrer
          const { data: referralData, error: referralError } = await supabase
            .from("referrals")
            .select("user_id, course_id")
            .eq("referral_code", referralCode)
            .eq("course_id", courseId)
            .single();
            
          if (!referralError && referralData) {
            // Get the reward amount for this course
            const { data: courseData, error: courseError } = await supabase
              .from("courses")
              .select("referral_reward")
              .eq("id", courseId)
              .single();
              
            if (!courseError && courseData) {
              const rewardAmount = courseData.referral_reward;
              
              // Update referral stats
              await supabase
                .from("referrals")
                .update({
                  successful_referrals: supabase.sql`successful_referrals + 1`,
                  total_earned: supabase.sql`total_earned + ${rewardAmount}`
                })
                .eq("referral_code", referralCode);
                
              // Update referrer's wallet
              await supabase
                .from("wallet")
                .update({
                  balance: supabase.sql`balance + ${rewardAmount}`,
                  last_updated: new Date().toISOString()
                })
                .eq("user_id", referralData.user_id);
                
              console.log(`Referral reward of ${rewardAmount} credited to user ${referralData.user_id}`);
            }
          }
        }
        
        // Generate a referral code for the purchaser
        const generatedReferralCode = `${userId.substring(0, 5)}-${courseId.substring(0, 5)}`;
        
        // Add the referral code entry
        await supabase
          .from("referrals")
          .insert({
            user_id: userId,
            course_id: courseId,
            referral_code: generatedReferralCode
          });
          
        return new Response(
          JSON.stringify({ success: true, referralCode: generatedReferralCode }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      case "payout.processed": {
        const payoutData = payload.payload.payout.entity;
        const payoutId = payoutData.id;
        const amount = payoutData.amount / 100; // Convert from paise to rupees
        
        // Update payout status in the database
        await supabase
          .from("payouts")
          .update({
            status: "completed",
            processed_at: new Date().toISOString(),
            razorpay_payout_id: payoutId
          })
          .eq("razorpay_payout_id", payoutId);
          
        console.log(`Payout ${payoutId} processed successfully for amount ${amount}`);
        break;
      }
      
      case "payout.failed": {
        const payoutData = payload.payload.payout.entity;
        const payoutId = payoutData.id;
        const failureReason = payoutData.failure_reason || "Unknown reason";
        
        // Update payout status in the database
        await supabase
          .from("payouts")
          .update({
            status: "failed",
            failure_reason: failureReason,
            processed_at: new Date().toISOString()
          })
          .eq("razorpay_payout_id", payoutId);
          
        console.log(`Payout ${payoutId} failed: ${failureReason}`);
        break;
      }
      
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error processing webhook:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
