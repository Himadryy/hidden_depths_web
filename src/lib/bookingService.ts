import { supabase } from './supabase';
import { getApiUrl, fetchWithTimeout } from './api';
import { logger } from './logger';

export interface Booking {
  id: string;
  date: string;
  time: string;
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

export interface BookingPolicy {
  safe_mode: boolean;
  search_window_days: number;
  max_bookable_dates: number;
  allowed_weekdays: number[];
  time_slots: string[];
  available_dates: string[];
}

export interface BookingStatus {
  booking_id: string;
  payment_status: 'pending' | 'paid' | 'failed' | string;
  is_confirmed: boolean;
  date: string;
  time: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  hold_expires_at?: string;
}

interface SlotsPayload {
  slots?: string[];
  paid_slots?: string[];
  held_slots?: string[];
  hold_expires_at?: Record<string, string>;
  hold_window_seconds?: number;
}

// Retry wrapper for cold-start resilience (Render free tier wakes in ~30s)
async function fetchWithRetry(url: string, options?: RequestInit, retries = 1): Promise<Response> {
  try {
    return await fetchWithTimeout(url, options);
  } catch (err) {
    if (retries > 0) {
      // Wait 2s then retry once — handles Render cold start wakeup
      await new Promise(r => setTimeout(r, 2000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw err;
  }
}

export const getBookedSlots = async (date: string): Promise<string[]> => {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    throw new Error('Booking service is not configured.');
  }

  const url = `${apiUrl}/bookings/slots/${date}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch slot availability (${response.status})`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Invalid slot availability response');
  }

  const data = await response.json();
  const payload = (data?.data || data) as SlotsPayload | string[];
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.slots)) {
    return payload.slots;
  }

  return [];
};

export const getBookingPolicy = async (): Promise<BookingPolicy> => {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    throw new Error('Booking service is not configured.');
  }

  const response = await fetchWithTimeout(`${apiUrl}/bookings/policy`);
  if (!response.ok) {
    throw new Error(`Failed to fetch booking policy (${response.status})`);
  }

  const data = await response.json();
  const payload = (data?.data || data) as BookingPolicy;

  if (!payload || !Array.isArray(payload.time_slots) || !Array.isArray(payload.available_dates)) {
    throw new Error('Invalid booking policy response');
  }

  return payload;
};

export const createBooking = async (
  date: string,
  time: string,
  name: string,
  email: string,
  userId?: string
): Promise<CreateBookingResponse> => {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
      return { success: false, error: "Backend API not configured" };
  }

  try {
    // Get Auth Token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetchWithRetry(`${apiUrl}/bookings/`, {
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
    
    // Map backend error codes to user-friendly messages
    const errorCode = data.error_code;
    if (errorCode === 'SLOT_UNAVAILABLE') {
      return { success: false, error: 'This time slot is already confirmed. Please choose another time.' };
    }
    if (errorCode === 'SLOT_HELD') {
      return { success: false, error: 'Someone else is completing payment for this slot. Please wait a moment or choose another time.' };
    }
    if (errorCode === 'PAYMENT_GATEWAY_ERROR') {
      return { success: false, error: 'Payment service is temporarily unavailable. Please try again in a moment.' };
    }
    if (data.retryable) {
      return { success: false, error: (data.error || 'Temporary issue') + ' — please try again.' };
    }
    
    return { success: false, error: data.error || 'Failed to create booking' };
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('Booking creation failed', error);
    return { success: false, error: error.message || 'System error. Please try again.' };
  }
};

export const verifyPayment = async (
    bookingId: string,
    razorpayPaymentId: string,
    razorpayOrderId: string,
    razorpaySignature: string
): Promise<{ success: boolean; error?: string }> => {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
        return { success: false, error: "Backend API not configured" };
    }
    
    try {
        const response = await fetchWithRetry(`${apiUrl}/bookings/verify`, {
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
    } catch (err: unknown) {
        const error = err as Error;
        logger.error('Payment verification failed', error);
        return { success: false, error: error.message || "Network error during verification" };
    }
};

export const getBookingStatus = async (bookingId: string): Promise<BookingStatus> => {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
        throw new Error("Backend API not configured");
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
        throw new Error('You must be logged in to check booking status.');
    }

    const response = await fetchWithTimeout(`${apiUrl}/bookings/${bookingId}/status`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    const contentType = response.headers.get('content-type');
    let data: unknown = null;
    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    }

    if (!response.ok) {
        const payload = data as { error?: string } | null;
        throw new Error(payload?.error || 'Failed to fetch booking status');
    }

    const payload = ((data as { data?: BookingStatus })?.data || data) as BookingStatus;
    if (!payload || !payload.payment_status) {
        throw new Error('Invalid booking status response');
    }
    return payload;
};

// Cancel a pending booking (used when payment fails, user dismisses Razorpay, or user retries)
export const cancelPendingBooking = async (bookingId: string): Promise<void> => {
    const apiUrl = getApiUrl();
    if (!apiUrl) return;
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const res = await fetchWithTimeout(`${apiUrl}/bookings/${bookingId}/release-pending`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) {
            logger.warn('Pending booking release failed', { bookingId, status: res.status });
        }
    } catch {
        // Best-effort cleanup — scheduler will catch anything we miss
    }
};
