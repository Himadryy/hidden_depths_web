import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface Booking {
  id: string;
  date: string; // Format: "YYYY-MM-DD"
  time: string; // Format: "12:00 PM"
  name: string;
  email: string;
  created_at: string;
}

export interface CreateBookingResponse {
  success: boolean;
  error?: string;
  booking_id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  key_id?: string;
}

export const getBookedSlots = async (date: string): Promise<string[]> => {
  if (API_URL) {
    try {
      const response = await fetch(`${API_URL}/bookings/slots/${date}`);
      if (!response.ok) throw new Error('Failed to fetch slots');
      return await response.json();
    } catch (err) {
      console.error('Go API error, falling back to Supabase:', err);
    }
  }

  // Fallback: Supabase Direct
  const { data, error } = await supabase
    .from('bookings')
    .select('time')
    .eq('date', date)
    .neq('payment_status', 'failed'); // Don't show failed bookings

  if (error) {
    console.error('Error fetching booked slots:', error);
    return [];
  }

  return data.map((booking) => booking.time);
};

export const createBooking = async (
  date: string,
  time: string,
  name: string,
  email: string,
  userId?: string
): Promise<CreateBookingResponse> => {
  if (!API_URL) {
      return { success: false, error: "Backend API not configured" };
  }

  try {
    const response = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, time, name, email, user_id: userId }),
    });

    const data = await response.json();

    if (response.ok) {
        return { 
            success: true,
            booking_id: data.booking_id,
            order_id: data.order_id,
            amount: data.amount,
            currency: data.currency,
            key_id: data.key_id
        };
    }
    
    if (response.status === 409) {
      return { success: false, error: 'This slot was just booked by someone else. Please choose another time.' };
    }
    
    throw new Error(data.error || 'Failed to create booking');
  } catch (err) {
    console.error('Booking Error:', err);
    return { success: false, error: 'System error. Please try again.' };
  }
};

export const verifyPayment = async (
    bookingId: string,
    razorpayPaymentId: string,
    razorpayOrderId: string,
    razorpaySignature: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const response = await fetch(`${API_URL}/bookings/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                booking_id: bookingId,
                razorpay_payment_id: razorpayPaymentId,
                razorpay_order_id: razorpayOrderId,
                razorpay_signature: razorpaySignature
            }),
        });

        if (!response.ok) {
            const data = await response.json();
            return { success: false, error: data.error || 'Payment verification failed' };
        }

        return { success: true };
    } catch (err) {
        console.error("Verification Error:", err);
        return { success: false, error: "Network error during verification" };
    }
};