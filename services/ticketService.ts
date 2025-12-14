import { supabase, isSupabaseConfigured } from './supabaseClient';
import { TicketData, DbTicket } from '../types';

/**
 * Saves a new ticket to Supabase.
 */
export const saveTicketToDb = async (ticketData: TicketData, imageBase64: string): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    console.warn("Skipping DB save: Supabase keys not configured.");
    return null;
  }

  try {
    const aiPromptsWithImage = {
        ...ticketData.aiPrompts,
        cached_image_base64: imageBase64
    };

    const { data, error } = await supabase
      .from('tickets')
      .insert([
        {
          event_details: ticketData.eventDetails,
          visual_theme: ticketData.visualTheme,
          gift_copy: ticketData.giftCopy,
          ai_prompts: aiPromptsWithImage,
          is_paid: false
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '42P01') {
         console.error("🚨 DATABASE ERROR: 'tickets' table missing.");
      } else {
         console.error('Error saving ticket:', error);
      }
      throw error;
    }

    return data.id;
  } catch (err) {
    console.error('Failed to save ticket to DB', err);
    return null;
  }
};

/**
 * Loads a ticket by ID.
 */
export const getTicketFromDb = async (id: string): Promise<{ ticketData: TicketData, imageUrl: string, isPaid: boolean } | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    const ticket = data as DbTicket;
    const mapped = mapDbTicketToApp(ticket);
    
    return {
        ...mapped,
        isPaid: ticket.is_paid || false
    };

  } catch (err) {
    console.error('Failed to fetch ticket', err);
    return null;
  }
};

/**
 * Verifies a Stripe Session ID is unique and marks the ticket as paid.
 * Returns true if successful, false if the session was already used.
 */
export const markTicketAsPaid = async (ticketId: string, sessionId: string): Promise<{ success: boolean; message?: string }> => {
  if (!isSupabaseConfigured()) return { success: false, message: "Database not connected" };

  try {
    // 1. Security Check: Has this specific Stripe Session already been used for ANY ticket?
    // This prevents sharing the URL to unlock multiple tickets.
    const { data: usedSessions, error: checkError } = await supabase
        .from('tickets')
        .select('id')
        .eq('stripe_session_id', sessionId);

    if (checkError) throw checkError;

    if (usedSessions && usedSessions.length > 0) {
        // If the session is associated with THIS ticket, it's just a refresh, so return true.
        if (usedSessions[0].id === ticketId) {
            return { success: true };
        }
        // Otherwise, someone is trying to reuse a payment code.
        return { success: false, message: "This payment has already been used." };
    }

    // 2. Mark as paid and lock the session ID to this ticket
    const { error: updateError } = await supabase
        .from('tickets')
        .update({ 
            is_paid: true, 
            stripe_session_id: sessionId 
        })
        .eq('id', ticketId);

    if (updateError) throw updateError;

    return { success: true };

  } catch (err) {
      console.error("Payment verification failed:", err);
      return { success: false, message: "Verification failed. Please contact support." };
  }
};

export const getRecentTickets = async (limit = 12): Promise<Array<{ id: string, ticketData: TicketData, imageUrl: string }>> => {
  if (!isSupabaseConfigured()) return [];
  
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];

    return (data as DbTicket[]).map(mapDbTicketToApp).filter(t => t !== null) as any;
  } catch (err) {
    return [];
  }
};

const mapDbTicketToApp = (ticket: DbTicket) => {
    const imageUrl = ticket.ai_prompts?.cached_image_base64 || '';

    const ticketData: TicketData = {
        eventDetails: ticket.event_details,
        visualTheme: ticket.visual_theme,
        giftCopy: ticket.gift_copy,
        aiPrompts: ticket.ai_prompts,
        layoutGuide: { 
            recommendedLayout: 'standard', 
            hierarchyNotes: '', 
            fontWeights: { eventName: 'bold', seatInfo: 'medium', extras: 'light' } 
        }
    };

    return { id: ticket.id, ticketData, imageUrl };
};