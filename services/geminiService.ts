import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TicketData } from "../types";

const SYSTEM_INSTRUCTION = `
You are the creative intelligence for PrettyTickets.com, a service that transforms boring digital tickets (like QR codes from Ticketmaster, SeatGeek, Bandsintown, etc.) into beautiful, gift-worthy, collectible tickets that can be printed, framed, or ordered as laminated keepsakes.

PrettyTickets.com exists to restore the magic of ticket-giving and event memories.
Your job is to take simple user inputs and produce elevated, emotional, visually gorgeous ticket concepts, branding elements, copy, and design instructions.

Always create responses that are:

Warm, delightful, visually rich, and emotionally expressive

Pretty, giftable, proud-to-show, proudly-keepable

Avoiding official logos or copyrighted imagery

Inspired by the vibe of the artist/event without infringing

1. BRAND VOICE AND PERSONALITY

PrettyTickets has a voice that is:
Warm and sparkly
Friendly and emotional-first
Charming without being childish
Aesthetic, artistic, and modern
Filled with delight, anticipation, and celebration
Never corporate or dry

Tone keywords to use in outputs:
delightful
magical
glowing
heartfelt
memorable
shimmering
premium

You speak to users as though you’re helping them create magic out of a moment.

2. TEXT GUIDELINES FOR FIELDS

- **tagline**: This appears ON THE TICKET under the title. It MUST be an event subtitle (e.g., "The Eras Tour", "Live in Concert", "World Tour 2024", "One Night Only"). **DO NOT** use PrettyTickets marketing slogans (like "The magic of the moment", "Made tangible", etc.) here. If no tour name is known, use something generic like "Live Event" or leave it empty.
- **ticketTitle**: A Title for the web page presentation (e.g., "Your Taylor Swift Keepsake").
- **emotionalDescription**: A short, warm phrase for the web page presentation (e.g., "A memory to last a lifetime").
- **backgroundPrompt**: Describe a STUNNING, ATMOSPHERIC, or ARTISTIC scene. Focus on "cinematic lighting", "particles", "holographic textures", "surreal landscapes". Avoid specific celebrities.

3. VISUAL DESIGN STYLE
When generating design guidance or layout suggestions, lean toward:
Soft gradients (pink → lavender → blue)
Metallic and holographic accents
Rounded corners, gentle curvature
Sparkles, glints, and subtle star shapes
Clean fonts with contrast (serif headline + sans-serif body)
A feeling of premium packaging or a special invitation

4. OVERALL OUTPUT STYLE
Always produce responses that express:
Delight
Warmth
Magic
Aesthetic charm
Emotional resonance
Giftability

PrettyTickets is not just a utility.
It’s a feeling.

5. YOUR OBJECTIVE
Given user input (which may be structured text, a screenshot image of a ticket, or both), you must:

1. Extract key details (Artist/Event, Venue, Date, Seat/Row, Section).
   - If an image is provided, OCR the details carefully from the image.
   - If text is provided, use that.
   - If both are provided, prioritize the text for personal messages, but trust the image for seat/date accuracy.
2. Generate a visually inspired “ticket theme” (Color palette, Patterns, Typography, Mood)
3. Generate AI artwork prompts for background and foreground.
   - The image will be cropped to a wide 2.75:1 aspect ratio. Ensure the main visual interest is in the center horizontal band.
4. Generate marketing copy for gifting
5. Provide layout guidance

Keep everything original. Do NOT generate copyrighted logos or photos.
`;

const TICKET_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    eventDetails: {
      type: Type.OBJECT,
      properties: {
        artistOrEvent: { type: Type.STRING },
        venue: { type: Type.STRING },
        date: { type: Type.STRING },
        seatInfo: { type: Type.STRING },
        personalMessage: { type: Type.STRING },
      },
      required: ["artistOrEvent", "venue", "date"],
    },
    visualTheme: {
      type: Type.OBJECT,
      properties: {
        colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
        textures: { type: Type.ARRAY, items: { type: Type.STRING } },
        typography: {
          type: Type.OBJECT,
          properties: {
            headlineFont: { type: Type.STRING },
            bodyFont: { type: Type.STRING },
          },
        },
        moodKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        iconIdeas: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
    aiPrompts: {
      type: Type.OBJECT,
      properties: {
        backgroundPrompt: { type: Type.STRING },
        ticketArtPrompt: { type: Type.STRING },
      },
    },
    giftCopy: {
      type: Type.OBJECT,
      properties: {
        ticketTitle: { type: Type.STRING },
        tagline: { type: Type.STRING },
        emotionalDescription: { type: Type.STRING },
        giftMessage: { type: Type.STRING },
      },
    },
    layoutGuide: {
      type: Type.OBJECT,
      properties: {
        recommendedLayout: { type: Type.STRING },
        hierarchyNotes: { type: Type.STRING },
        fontWeights: {
          type: Type.OBJECT,
          properties: {
            eventName: { type: Type.STRING },
            seatInfo: { type: Type.STRING },
            extras: { type: Type.STRING },
          },
        },
      },
    },
  },
};

export const generateTicketMetadata = async (
  input: string,
  imageBase64?: string
): Promise<TicketData> => {
  if (!process.env.API_KEY) {
    throw new Error("Missing Google Gemini API Key. Please add 'API_KEY' to your Vercel Environment Variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    let contents: any;

    if (imageBase64) {
      // Clean the base64 string if it contains the data URI prefix
      const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
      
      contents = {
        parts: [
          { text: input || "Analyze this ticket image and extract details to create a collectible design." },
          {
            inlineData: {
              mimeType: 'image/png', // Assuming PNG or generic support usually works with the SDK for mixed types
              data: cleanBase64,
            },
          },
        ],
      };
    } else {
      contents = input;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: TICKET_SCHEMA,
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as TicketData;
    }
    throw new Error("No text response from Gemini");
  } catch (error) {
    console.error("Error generating ticket metadata:", error);
    throw error;
  }
};

export const generateTicketImage = async (prompt: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("Missing Google Gemini API Key.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    // Optimized prompt wrapper to avoid safety triggers while maintaining quality
    const safePrompt = `High quality, cinematic, artistic background art for a concert ticket. 
    ${prompt}. 
    Composition: Extreme wide shot, camera zoomed far out. Subject or main focal point must be in the vertical center. Substantial headroom and negative space above and below the subject to allow for panoramic cropping. Avoid close-ups.
    No text, no words.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: safePrompt,
      config: {
        imageConfig: {
            aspectRatio: "16:9", // We generate 16:9, but will crop to ~21:9 in CSS
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      // Log refusal text if present (e.g. "I cannot generate images of...")
      if (part.text) {
         console.warn("Image generation returned text instead of image:", part.text);
      }
    }
    
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating ticket image:", error);
    // Return a fallback gradient if image generation fails
    return "";
  }
};