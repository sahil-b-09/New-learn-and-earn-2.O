
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { message } = await req.json()
    console.log('Received Telegram webhook:', message)

    // Check if message is a payout confirmation
    if (message?.text && message.text.includes('/confirm_payout')) {
      const payoutId = message.text.split(' ')[1]
      
      if (!payoutId) {
        return new Response(JSON.stringify({ error: 'Invalid payout ID' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      console.log('Processing payout confirmation for ID:', payoutId)

      // Update payout status in database
      const { data: payout, error: payoutError } = await supabaseClient
        .from('payout_requests')
        .update({ 
          status: 'completed',
          processed_at: new Date().toISOString(),
          admin_notes: 'Confirmed via Telegram bot'
        })
        .eq('id', payoutId)
        .select('user_id, amount')
        .single()

      if (payoutError) {
        console.error('Error updating payout:', payoutError)
        return new Response(JSON.stringify({ error: 'Failed to update payout' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }

      // Update user wallet - subtract the amount from balance and add to total_withdrawn
      const { error: walletError } = await supabaseClient
        .from('wallet')
        .update({ 
          balance: supabaseClient.raw(`balance - ${payout.amount}`),
          total_withdrawn: supabaseClient.raw(`total_withdrawn + ${payout.amount}`),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', payout.user_id)

      if (walletError) {
        console.error('Error updating wallet:', walletError)
        return new Response(JSON.stringify({ error: 'Failed to update wallet' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }

      // Create wallet transaction record
      const { error: transactionError } = await supabaseClient
        .from('wallet_transactions')
        .insert({
          user_id: payout.user_id,
          type: 'debit',
          amount: payout.amount,
          status: 'completed',
          description: 'Payout processed',
          reference_id: payoutId
        })

      if (transactionError) {
        console.error('Error creating transaction:', transactionError)
      }

      console.log('Payout processed successfully')

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Payout confirmed and processed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // For other messages, just acknowledge
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
