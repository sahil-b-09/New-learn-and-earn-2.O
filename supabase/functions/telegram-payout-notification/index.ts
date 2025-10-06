
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, user_email, amount, payout_method, request_id } = await req.json()

    // Get Telegram bot token from environment
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const chatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')

    if (!botToken || !chatId) {
      console.error('Missing Telegram configuration')
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Telegram configuration missing. Please set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID secrets.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Format the message
    const message = `
🔔 *New Payout Request*

👤 *User:* ${user_email}
💰 *Amount:* ₹${amount}
💳 *Method:* ${payout_method}
🔗 *Request ID:* ${request_id}

Please process this payout request and reply with confirmation.
    `.trim()

    // Send message to Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(`Telegram API error: ${result.description || 'Unknown error'}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payout notification sent successfully',
        telegram_response: result 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in telegram-payout-notification:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
