import { supabase } from './supabase';
import { getApiUrl, fetchWithTimeout } from './api';

const API_URL = getApiUrl();

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
      // Normalize URL (remove trailing slash) and ensure path is correct
      const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const url = `${baseUrl}/bookings/slots/${date}`;
      
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        console.warn(`Go API returned ${response.status} for slots. Falling back.`);
        throw new Error('Failed to fetch slots');
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || []);
      }
      return [];
    } catch (err) {
      // Only log as error if it's not a standard fetch failure (to keep console clean during local dev without backend)
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        console.debug('Backend unreachable, using Supabase fallback.');
      } else {
        console.error('Go API error, falling back to Supabase:', err);
      }
    }
  }

  // Fallback: Supabase Direct — only count confirmed (paid) bookings
  // to avoid falsely blocking slots from stale pending/failed rows
  const { data, error } = await supabase
    .from('bookings')
    .select('time')
    .eq('date', date)
    .eq('payment_status', 'paid');

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
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    
    // Get Auth Token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetchWithTimeout(`${baseUrl}/bookings/`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ date, time, name, email, user_id: userId }),
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    } else {
        const text = await response.text();
        throw new Error(text || `Server returned ${response.status}`);
    }

    if (response.ok) {
        // Handle Go backend wrapper { success: true, data: { ... } }
        const result = data.data || data;
        return { 
            success: true,
            booking_id: result.booking_id,
            order_id: result.order_id,
            amount: result.amount,
            currency: result.currency,
            key_id: result.key_id
        };
    }
    
    if (response.status === 409) {
      return { success: false, error: 'This slot was just booked by someone else. Please choose another time.' };
    }
    
    throw new Error(data.error || 'Failed to create booking');
  } catch (err: any) {
    console.error('Booking Error:', err);
    return { success: false, error: err.message || 'System error. Please try again.' };
  }
};

export const verifyPayment = async (
    bookingId: string,
    razorpayPaymentId: string,
    razorpayOrderId: string,
    razorpaySignature: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const baseUrl = API_URL!.endsWith('/') ? API_URL!.slice(0, -1) : API_URL;
        const response = await fetchWithTimeout(`${baseUrl}/bookings/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                booking_id: bookingId,
                razorpay_payment_id: razorpayPaymentId,
                razorpay_order_id: razorpayOrderId,
                razorpay_signature: razorpaySignature
            }),
        });

        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        }

        if (!response.ok) {
            return { success: false, error: (data && data.error) || 'Payment verification failed' };
        }

        return { success: true };
    } catch (err: any) {
        console.error("Verification Error:", err);
        return { success: false, error: err.message || "Network error during verification" };
    }
};

// Cancel a pending booking (used when payment fails, user dismisses Razorpay, or user retries)
export const cancelPendingBooking = async (bookingId: string): Promise<void> => {
    try {
        const baseUrl = API_URL!.endsWith('/') ? API_URL!.slice(0, -1) : API_URL;
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        await fetchWithTimeout(`${baseUrl}/bookings/${bookingId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
    } catch {
        // Best-effort cleanup — scheduler will catch anything we miss
    }
};