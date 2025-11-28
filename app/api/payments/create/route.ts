import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { CreatePaymentRequest } from '@/lib/types';

export async function POST(request: Request) {
  try {
    // Check authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to create a payment.' },
        { status: 401 }
      );
    }

    const body: CreatePaymentRequest = await request.json();
    const { analysisId, amount, orderName, customerEmail, customerName } = body;

    // Verify the analysis exists and belongs to the user
    const { data: analysis, error: analysisError } = await supabaseAdmin
      .from('analysis_results')
      .select('id, user_id')
      .eq('id', analysisId)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (analysis.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden. You do not own this analysis.' },
        { status: 403 }
      );
    }

    // Generate unique order ID
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        analysis_id: analysisId,
        order_id: orderId,
        order_name: orderName,
        amount: amount,
        currency: 'KRW',
        customer_email: customerEmail,
        customer_name: customerName,
        status: 'pending',
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create payment' },
        { status: 500 }
      );
    }

    // Return payment data for Toss Payments widget
    return NextResponse.json({
      success: true,
      payment: {
        orderId: payment.order_id,
        orderName: payment.order_name,
        amount: payment.amount,
        customerEmail: payment.customer_email,
        customerName: payment.customer_name,
      },
    });

  } catch (error) {
    console.error('Error in payment creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
