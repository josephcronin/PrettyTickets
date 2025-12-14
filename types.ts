export interface TicketData {
  eventDetails: {
    artistOrEvent: string;
    venue: string;
    date: string;
    seatInfo: string;
    personalMessage: string;
  };
  visualTheme: {
    colorPalette: string[];
    textures: string[];
    typography: {
      headlineFont: string;
      bodyFont: string;
    };
    moodKeywords: string[];
    iconIdeas: string[];
  };
  aiPrompts: {
    backgroundPrompt: string;
    ticketArtPrompt: string;
    cached_image_base64?: string;
  };
  giftCopy: {
    ticketTitle: string;
    tagline: string;
    emotionalDescription: string;
    giftMessage: string;
  };
  layoutGuide: {
    recommendedLayout: string;
    hierarchyNotes: string;
    fontWeights: {
      eventName: string;
      seatInfo: string;
      extras: string;
    };
  };
}

export interface GeneratedAsset {
  imageUrl: string;
  ticketData: TicketData;
}

export interface DbTicket {
  id: string;
  created_at: string;
  user_id?: string | null;
  event_details: TicketData['eventDetails'];
  visual_theme: TicketData['visualTheme'];
  gift_copy: TicketData['giftCopy'];
  ai_prompts: TicketData['aiPrompts'];
  is_paid: boolean;
  stripe_session_id?: string | null;
}