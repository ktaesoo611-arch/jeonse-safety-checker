import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, paymentKey, amount } = body;

    if (!orderId || !paymentKey || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify payment with Toss Payments API
    const tossSecretKey = process.env.TOSS_PAYMENTS_SECRET_KEY;
    if (!tossSecretKey) {
      console.error('TOSS_PAYMENTS_SECRET_KEY not configured');
      return NextResponse.json(
        { error: 'Payment service not configured' },
        { status: 500 }
      );
    }

    // Call Toss Payments confirm API
    const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${tossSecretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId,
        paymentKey,
        amount,
      }),
    });

    const tossData = await tossResponse.json();

    if (!tossResponse.ok) {
      console.error('Toss Payments verification failed:', tossData);

      // Update payment status to failed
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'failed',
          toss_failure_code: tossData.code,
          toss_failure_message: tossData.message,
          toss_response: tossData,
        })
        .eq('order_id', orderId);

      return NextResponse.json(
        {
          error: 'Payment verification failed',
          code: tossData.code,
          message: tossData.message,
        },
        { status: 400 }
      );
    }

    // Payment successful - update database
    const { data: payment, error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        payment_key: paymentKey,
        status: 'approved',
        method: tossData.method,
        approved_at: tossData.approvedAt,
        receipt_url: tossData.receipt?.url,
        card_info: tossData.card || null,
        virtual_account_info: tossData.virtualAccount || null,
        transfer_info: tossData.transfer || null,
        mobile_phone_info: tossData.mobilePhone || null,
        toss_response: tossData,
      })
      .eq('order_id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment record' },
        { status: 500 }
      );
    }

    // Update analysis_results with payment_id
    if (payment.analysis_id) {
      await supabaseAdmin
        .from('analysis_results')
        .update({
          payment_id: payment.id,
          payment_status: 'approved',
        })
        .eq('id', payment.analysis_id);
    }

    return NextResponse.json({
      success: true,
      payment: {
        orderId: payment.order_id,
        paymentKey: payment.payment_key,
        status: payment.status,
        amount: payment.amount,
        approvedAt: payment.approved_at,
        receiptUrl: payment.receipt_url,
      },
    });

  } catch (error) {
    console.error('Error in payment verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
