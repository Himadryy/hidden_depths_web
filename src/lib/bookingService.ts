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

  const { data, error } = await supabase
    .from('bookings')
    .select('time')
    .eq('date', date);

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
): Promise<{ success: boolean; error?: string }> => {
  if (API_URL) {
    try {
      const response = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time, name, email, user_id: userId }),
      });

      if (response.ok) return { success: true };
      if (response.status === 409) {
        return { success: false, error: 'This slot was just booked by someone else. Please choose another time.' };
      }
      throw new Error('Failed to create booking');
    } catch (err) {
      console.error('Go API error, falling back to Supabase:', err);
    }
  }
  
  // 1. Attempt to insert the booking
  // The database should have a UNIQUE constraint on (date, time)
  const { error } = await supabase
    .from('bookings')
    .insert([
      { date, time, name, email, user_id: userId }
    ]);

  if (error) {
    // Code 23505 is PostgreSQL for "unique_violation"
    if (error.code === '23505') {
      return { success: false, error: 'This slot was just booked by someone else. Please choose another time.' };
    }
    console.error('Booking creation error:', error);
    return { success: false, error: 'Failed to secure the booking. Please try again.' };
  }

  return { success: true };
};
