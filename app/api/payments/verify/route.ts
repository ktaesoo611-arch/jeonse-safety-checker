import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { emailService } from '@/lib/services/email-service';

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

    // Payment successful - update or create database record
    // First try to update existing record
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    let payment;

    if (existingPayment) {
      // Update existing payment record
      const { data: updatedPayment, error: updateError } = await supabaseAdmin
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
      payment = updatedPayment;
    } else {
      // Create new payment record (for preview flow where no payment was created upfront)
      // Extract analysis ID from orderId format: jeonse_UUID_timestamp or wolse_UUID_timestamp
      let analysisId = null;
      const orderIdParts = orderId.split('_');
      if (orderIdParts.length >= 2) {
        // UUID is the second part (index 1)
        const potentialUuid = orderIdParts[1];
        // Validate it looks like a UUID
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(potentialUuid)) {
          analysisId = potentialUuid;
        }
      }

      const { data: newPayment, error: insertError } = await supabaseAdmin
        .from('payments')
        .insert({
          order_id: orderId,
          order_name: tossData.orderName || 'Analysis Payment',
          payment_key: paymentKey,
          amount: amount,
          currency: 'KRW',
          status: 'approved',
          method: tossData.method,
          approved_at: tossData.approvedAt,
          receipt_url: tossData.receipt?.url,
          card_info: tossData.card || null,
          virtual_account_info: tossData.virtualAccount || null,
          transfer_info: tossData.transfer || null,
          mobile_phone_info: tossData.mobilePhone || null,
          toss_response: tossData,
          analysis_id: analysisId,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating payment:', insertError);
        return NextResponse.json(
          { error: 'Failed to create payment record' },
          { status: 500 }
        );
      }
      payment = newPayment;
    }

    // Update analysis with payment_id
    // Get the analysis ID from either the column or from toss_response
    const linkedAnalysisId = payment.analysis_id || payment.toss_response?.linked_analysis_id;

    if (linkedAnalysisId) {
      // Try new schema first (analyses table)
      const { data: newAnalysis } = await supabaseAdmin
        .from('analyses')
        .select('id')
        .eq('id', linkedAnalysisId)
        .single();

      if (newAnalysis) {
        await supabaseAdmin
          .from('analyses')
          .update({
            payment_id: payment.id,
            payment_status: 'approved',
          })
          .eq('id', linkedAnalysisId);

        // Send payment confirmation email
        try {
          // Get user email from the analysis
          const { data: analysisData } = await supabaseAdmin
            .from('analyses')
            .select('user_id, type')
            .eq('id', linkedAnalysisId)
            .single();

          if (analysisData?.user_id) {
            const { data: userData } = await supabaseAdmin.auth.admin.getUserById(
              analysisData.user_id
            );

            if (userData?.user?.email) {
              await emailService.sendPaymentConfirmation(userData.user.email, {
                userName: userData.user.user_metadata?.full_name || '',
                orderName: tossData.orderName || 'Analysis Payment',
                amount: amount,
                paymentMethod: tossData.method || 'Card',
                receiptUrl: tossData.receipt?.url,
                analysisId: linkedAnalysisId,
                analysisType: analysisData.type || 'jeonse_safety',
              });
              console.log('Payment confirmation email sent to:', userData.user.email);
            }
          }
        } catch (emailError) {
          // Log but don't fail the payment verification
          console.error('Failed to send payment confirmation email:', emailError);
        }
      } else {
        // Fall back to old schema (analysis_results)
        await supabaseAdmin
          .from('analysis_results')
          .update({
            payment_id: payment.id,
            payment_status: 'approved',
          })
          .eq('id', linkedAnalysisId);
      }
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
