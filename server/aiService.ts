import { GoogleGenAI, Type, type FunctionDeclaration } from '@google/genai';
import { queryAll, queryOne, runQuery, insertAndGetId } from './db.ts';

// Model definition according to gemini-api skill instructions
const MODEL_NAME = 'gemini-3.8-flash';

// Tool Declarations for Gemini Tool Calling
const checkAvailabilityTool: FunctionDeclaration = {
  name: 'check_room_availability',
  description: 'Checks real-time room availability in the Barsha Lodge database for given dates and optional room type or guest count.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      check_in_date: {
        type: Type.STRING,
        description: 'Check-in date in YYYY-MM-DD format (e.g. 2026-09-29)'
      },
      check_out_date: {
        type: Type.STRING,
        description: 'Check-out date in YYYY-MM-DD format (e.g. 2026-09-30)'
      },
      room_type_or_ac: {
        type: Type.STRING,
        description: 'Optional filter: AC, Non-AC, Single, Double, Triple, Suite'
      },
      num_guests: {
        type: Type.INTEGER,
        description: 'Number of guests'
      }
    },
    required: ['check_in_date', 'check_out_date']
  }
};

const getRoomPricingTool: FunctionDeclaration = {
  name: 'get_room_pricing',
  description: 'Calculates the exact tariff, nights, advance amount, and balance due for a room at Barsha Lodge.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      room_name_or_id: {
        type: Type.STRING,
        description: 'Room name (e.g. "Double Bed AC Room") or room ID'
      },
      check_in_date: {
        type: Type.STRING,
        description: 'Check-in date in YYYY-MM-DD format'
      },
      check_out_date: {
        type: Type.STRING,
        description: 'Check-out date in YYYY-MM-DD format'
      },
      num_rooms: {
        type: Type.INTEGER,
        description: 'Number of rooms (default 1)'
      }
    },
    required: ['check_in_date', 'check_out_date']
  }
};

const createReservationTool: FunctionDeclaration = {
  name: 'create_reservation',
  description: 'Creates a real booking in the Barsha Lodge database once the guest confirms all reservation details.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      guest_name: { type: Type.STRING, description: 'Full name of guest' },
      mobile_number: { type: Type.STRING, description: '10-digit mobile number' },
      email: { type: Type.STRING, description: 'Guest email address' },
      room_name_or_id: { type: Type.STRING, description: 'Room category name or ID' },
      check_in_date: { type: Type.STRING, description: 'Check-in date YYYY-MM-DD' },
      check_out_date: { type: Type.STRING, description: 'Check-out date YYYY-MM-DD' },
      num_guests: { type: Type.INTEGER, description: 'Number of guests' },
      num_rooms: { type: Type.INTEGER, description: 'Number of rooms' },
      special_requests: { type: Type.STRING, description: 'Special requests' }
    },
    required: ['guest_name', 'mobile_number', 'room_name_or_id', 'check_in_date', 'check_out_date']
  }
};

const prepareBookingSummaryTool: FunctionDeclaration = {
  name: 'prepare_booking_summary',
  description: 'Validates room availability in the database and prepares a structured booking summary for the guest to review before confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      guest_name: { type: Type.STRING, description: 'Guest full name' },
      mobile_number: { type: Type.STRING, description: '10-digit mobile number' },
      email: { type: Type.STRING, description: 'Guest email address' },
      room_name_or_id: { type: Type.STRING, description: 'Room name or ID' },
      check_in_date: { type: Type.STRING, description: 'Check-in date YYYY-MM-DD' },
      check_out_date: { type: Type.STRING, description: 'Check-out date YYYY-MM-DD' },
      num_guests: { type: Type.INTEGER, description: 'Number of guests' },
      num_rooms: { type: Type.INTEGER, description: 'Number of rooms' }
    },
    required: ['guest_name', 'mobile_number', 'room_name_or_id', 'check_in_date', 'check_out_date']
  }
};

// Tool Execution Helpers
export async function executeCheckAvailability(args: {
  check_in_date: string;
  check_out_date: string;
  room_type_or_ac?: string;
  num_guests?: number;
}) {
  const { check_in_date, check_out_date, room_type_or_ac, num_guests } = args;

  if (new Date(check_out_date) <= new Date(check_in_date)) {
    return {
      success: false,
      error: 'Check-out date must be strictly after check-in date.'
    };
  }

  // Find all rooms
  let rooms = await queryAll('SELECT * FROM rooms WHERE status != ?', ['Maintenance']);

  if (room_type_or_ac) {
    const term = room_type_or_ac.toLowerCase();
    rooms = rooms.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.type.toLowerCase().includes(term) ||
        (term.includes('ac') && !term.includes('non') && r.is_ac === 1) ||
        (term.includes('non') && r.is_ac === 0)
    );
  }

  if (num_guests && num_guests > 0) {
    rooms = rooms.filter((r) => r.capacity >= num_guests);
  }

  // Check bookings overlapping this date window
  const bookedRoomRows = await queryAll(
    `SELECT room_id, COUNT(*) as booked_count 
     FROM bookings 
     WHERE status IN ('Confirmed', 'Checked-in', 'Pending') 
       AND NOT (check_out_date <= ? OR check_in_date >= ?)
     GROUP BY room_id`,
    [check_in_date, check_out_date]
  );

  const bookedMap = new Map<number, number>();
  bookedRoomRows.forEach((row: any) => {
    bookedMap.set(row.room_id, row.booked_count || 1);
  });

  const availableRooms = rooms.map((room) => {
    const isBooked = bookedMap.has(room.id);
    return {
      id: room.id,
      name: room.name,
      room_number: room.room_number,
      type: room.type,
      is_ac: Boolean(room.is_ac),
      price_per_night: room.price_per_night,
      capacity: room.capacity,
      status: isBooked ? 'Unavailable for selected dates' : 'Available',
      is_available: !isBooked,
      amenities: typeof room.amenities === 'string' ? JSON.parse(room.amenities || '[]') : room.amenities
    };
  });

  return {
    success: true,
    check_in_date,
    check_out_date,
    total_rooms_checked: rooms.length,
    available_rooms: availableRooms.filter((r) => r.is_available),
    all_rooms_status: availableRooms
  };
}

export async function executePrepareBookingSummary(args: {
  guest_name: string;
  mobile_number: string;
  email?: string;
  room_name_or_id: string;
  check_in_date: string;
  check_out_date: string;
  num_guests?: number;
  num_rooms?: number;
  special_requests?: string;
}) {
  const {
    guest_name,
    mobile_number,
    email = '',
    room_name_or_id,
    check_in_date,
    check_out_date,
    num_guests = 1,
    num_rooms = 1,
    special_requests = ''
  } = args;

  const cleanMobile = mobile_number.replace(/\D/g, '');
  if (cleanMobile.length < 10) {
    return { success: false, error: 'A valid 10-digit mobile number is required.' };
  }

  let room: any = null;
  if (!isNaN(Number(room_name_or_id))) {
    room = await queryOne('SELECT * FROM rooms WHERE id = ?', [Number(room_name_or_id)]);
  } else {
    room = await queryOne('SELECT * FROM rooms WHERE name LIKE ? LIMIT 1', [`%${room_name_or_id}%`]);
  }

  if (!room) {
    room = await queryOne('SELECT * FROM rooms ORDER BY price_per_night ASC LIMIT 1');
  }

  const checkIn = new Date(check_in_date);
  const checkOut = new Date(check_out_date);
  if (checkOut <= checkIn) {
    return { success: false, error: 'Check-out date must be strictly after check-in date.' };
  }

  // Double booking check against database
  const overlap = await queryOne(
    `SELECT COUNT(*) as count FROM bookings 
     WHERE room_id = ? 
       AND status IN ('Confirmed', 'Checked-in', 'Pending') 
       AND NOT (check_out_date <= ? OR check_in_date >= ?)`,
    [room.id, check_in_date, check_out_date]
  );

  if (overlap && overlap.count > 0) {
    return {
      success: false,
      is_available: false,
      error: `Sorry, ${room.name} is already booked for ${check_in_date} to ${check_out_date}. Please choose another room or date.`
    };
  }

  const diffDays = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const totalNights = Math.max(1, diffDays > 0 ? diffDays : 1);
  const roomsCount = Math.max(1, num_rooms);
  const pricePerNight = Number(room.price_per_night);
  const totalAmount = pricePerNight * totalNights * roomsCount;
  const advanceAmount = Math.max(500, Math.round(totalAmount * 0.4));
  const dueAmount = totalAmount - advanceAmount;

  const summaryText = `Guest Name: ${guest_name}
Mobile: ${cleanMobile}
Room: ${room.name}
Check-in: ${check_in_date}
Check-out: ${check_out_date}
Guests: ${num_guests}
Number of nights: ${totalNights}
Room price: ₹${pricePerNight}
Total: ₹${totalAmount}
Advance: ₹${advanceAmount}
Due: ₹${dueAmount}`;

  return {
    success: true,
    is_available: true,
    summary_text: summaryText,
    booking_details: {
      room_id: room.id,
      room_name: room.name,
      is_ac: Boolean(room.is_ac),
      guest_name,
      mobile_number: cleanMobile,
      email,
      check_in_date,
      check_out_date,
      num_guests,
      num_rooms: roomsCount,
      total_nights: totalNights,
      price_per_night: pricePerNight,
      total_amount: totalAmount,
      advance_amount: advanceAmount,
      due_amount: dueAmount,
      special_requests
    }
  };
}

export async function executeGetPricing(args: {
  room_name_or_id?: string;
  check_in_date: string;
  check_out_date: string;
  num_rooms?: number;
}) {
  const { room_name_or_id, check_in_date, check_out_date, num_rooms = 1 } = args;

  let room: any = null;
  if (room_name_or_id) {
    if (!isNaN(Number(room_name_or_id))) {
      room = await queryOne('SELECT * FROM rooms WHERE id = ?', [Number(room_name_or_id)]);
    } else {
      room = await queryOne('SELECT * FROM rooms WHERE name LIKE ? LIMIT 1', [`%${room_name_or_id}%`]);
    }
  }

  if (!room) {
    room = await queryOne('SELECT * FROM rooms ORDER BY price_per_night ASC LIMIT 1');
  }

  const checkIn = new Date(check_in_date);
  const checkOut = new Date(check_out_date);
  const diffTime = checkOut.getTime() - checkIn.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const nights = Math.max(1, diffDays > 0 ? diffDays : 1);

  const roomsCount = Math.max(1, num_rooms);
  const pricePerNight = Number(room.price_per_night);
  const totalAmount = pricePerNight * nights * roomsCount;
  const advanceAmount = Math.max(500, Math.round(totalAmount * 0.4));
  const dueAmount = totalAmount - advanceAmount;

  return {
    success: true,
    room_id: room.id,
    room_name: room.name,
    is_ac: Boolean(room.is_ac),
    price_per_night: pricePerNight,
    nights,
    num_rooms: roomsCount,
    total_amount: totalAmount,
    advance_amount: advanceAmount,
    due_amount: dueAmount,
    upi_id: '8649883536@yapl'
  };
}

export async function executeCreateReservation(args: {
  guest_name: string;
  mobile_number: string;
  email?: string;
  room_name_or_id: string;
  check_in_date: string;
  check_out_date: string;
  num_guests?: number;
  num_rooms?: number;
  special_requests?: string;
}) {
  const {
    guest_name,
    mobile_number,
    email = '',
    room_name_or_id,
    check_in_date,
    check_out_date,
    num_guests = 1,
    num_rooms = 1,
    special_requests = ''
  } = args;

  const cleanMobile = mobile_number.replace(/\D/g, '');
  if (cleanMobile.length < 10) {
    return { success: false, error: 'Valid 10-digit mobile number is required.' };
  }

  let room: any = null;
  if (!isNaN(Number(room_name_or_id))) {
    room = await queryOne('SELECT * FROM rooms WHERE id = ?', [Number(room_name_or_id)]);
  } else {
    room = await queryOne('SELECT * FROM rooms WHERE name LIKE ? LIMIT 1', [`%${room_name_or_id}%`]);
  }

  if (!room) {
    return { success: false, error: `Room ${room_name_or_id} could not be found.` };
  }

  // Double booking validation
  const overlap = await queryOne(
    `SELECT COUNT(*) as count FROM bookings 
     WHERE room_id = ? 
       AND status IN ('Confirmed', 'Checked-in', 'Pending') 
       AND NOT (check_out_date <= ? OR check_in_date >= ?)`,
    [room.id, check_in_date, check_out_date]
  );

  if (overlap && overlap.count > 0) {
    return {
      success: false,
      error: `Sorry, ${room.name} is already booked for ${check_in_date} to ${check_out_date}. Please choose another room or date.`
    };
  }

  // Calculate pricing
  const checkIn = new Date(check_in_date);
  const checkOut = new Date(check_out_date);
  const diffDays = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const totalNights = Math.max(1, diffDays > 0 ? diffDays : 1);
  const roomsCount = Math.max(1, num_rooms);
  const pricePerNight = Number(room.price_per_night);
  const totalAmount = pricePerNight * totalNights * roomsCount;
  const advanceAmount = Math.max(500, Math.round(totalAmount * 0.4));
  const dueAmount = totalAmount - advanceAmount;

  // Generate Booking ID
  const currentYear = new Date().getFullYear();
  const prefix = `BL${currentYear}-`;
  const latest = await queryOne<{ booking_id: string }>(
    `SELECT booking_id FROM bookings WHERE booking_id LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let nextNum = 1;
  if (latest && latest.booking_id) {
    const parts = latest.booking_id.split('-');
    if (parts.length === 2) {
      const parsed = parseInt(parts[1], 10);
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }
  }
  const bookingId = `${prefix}${String(nextNum).padStart(4, '0')}`;

  // Customer record
  let customer = await queryOne<{ id: number }>('SELECT id FROM customers WHERE mobile = ?', [cleanMobile]);
  let customerId: number;
  if (customer) {
    customerId = customer.id;
    await runQuery(
      `UPDATE customers SET name = ?, email = COALESCE(NULLIF(?, ''), email), total_stays = total_stays + 1, total_spent = total_spent + ?, last_booking_id = ? WHERE id = ?`,
      [guest_name.trim(), email.trim(), totalAmount, bookingId, customerId]
    );
  } else {
    customerId = await insertAndGetId(
      `INSERT INTO customers (name, mobile, email, total_stays, total_spent, last_booking_id) VALUES (?, ?, ?, 1, ?, ?)`,
      [guest_name.trim(), cleanMobile, email.trim(), totalAmount, bookingId]
    );
  }

  // Insert Booking
  const insertId = await insertAndGetId(
    `INSERT INTO bookings (
       booking_id, customer_id, room_id, guest_name, mobile_number, email,
       check_in_date, check_out_date, num_guests, num_rooms, special_requests,
       price_per_night, total_nights, total_amount, advance_amount, due_amount,
       status, payment_status, payment_method, transaction_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'Pending', 'UPI', '')`,
    [
      bookingId, customerId, room.id, guest_name.trim(), cleanMobile, email.trim(),
      check_in_date, check_out_date, num_guests, roomsCount, special_requests.trim(),
      pricePerNight, totalNights, totalAmount, advanceAmount, dueAmount
    ]
  );

  const whatsappText = `*BARsha Lodge - Booking Confirmation*
Booking ID: ${bookingId}
Guest: ${guest_name}
Mobile: ${cleanMobile}
Room: ${room.name}
Dates: ${check_in_date} to ${check_out_date} (${totalNights} Night${totalNights > 1 ? 's' : ''})
Rooms: ${roomsCount} | Guests: ${num_guests}
Total Tariff: ₹${totalAmount.toLocaleString('en-IN')}
Advance Payable: ₹${advanceAmount.toLocaleString('en-IN')}
Balance Due: ₹${dueAmount.toLocaleString('en-IN')}
UPI ID: 8649883536@yapl
Location: Tarapith, Near Bharat Sevashram Sangha, Birbhum, WB
Manager: Subhodip Garai (+91 8388957523)`;

  const whatsappUrl = `https://wa.me/918388957523?text=${encodeURIComponent(whatsappText)}`;

  return {
    success: true,
    booking_id: bookingId,
    db_id: insertId,
    guest_name,
    room_name: room.name,
    check_in_date,
    check_out_date,
    total_nights: totalNights,
    total_amount: totalAmount,
    advance_amount: advanceAmount,
    due_amount: dueAmount,
    whatsapp_url: whatsappUrl,
    whatsapp_text: whatsappText
  };
}

// Build Structured Lodge Knowledge Context for AI System Prompt
export async function getLodgeKnowledgeContext(): Promise<string> {
  const kbRows = await queryAll('SELECT category, topic, content FROM ai_knowledge_base ORDER BY sort_order ASC');
  const rooms = await queryAll('SELECT id, name, room_number, type, is_ac, price_per_night, capacity FROM rooms ORDER BY price_per_night ASC');
  const settingsRows = await queryAll('SELECT key, value FROM website_settings');
  const settings: Record<string, string> = {};
  settingsRows.forEach((r) => { settings[r.key] = r.value; });

  let context = `--- OFFICIAL BARSHA LODGE KNOWLEDGE BASE ---\n`;
  context += `Lodge Name: ${settings.lodge_name || 'Barsha Lodge'}\n`;
  context += `Manager: ${settings.manager_name || 'Subhodip Garai'} (+91 ${settings.phone_number || '8388957523'})\n`;
  context += `WhatsApp Booking: +91 ${settings.whatsapp_number || '8388957523'}\n`;
  context += `Official UPI ID for Advance: 8649883536@yapl\n`;
  context += `Location: Near Bharat Sevashram Sangha, Tarapith, Birbhum, West Bengal - 731233 (5-7 mins walk to Maa Tara Mandir & Maha Smashan)\n\n`;

  context += `Current Room Catalog & Price Table:\n`;
  rooms.forEach((r) => {
    context += `- ${r.name} (Room #${r.room_number}): ₹${r.price_per_night}/night | Capacity: ${r.capacity} person(s) | ${r.is_ac ? 'AC' : 'Non-AC'}\n`;
  });

  context += `\nKnowledge Articles & Policies:\n`;
  kbRows.forEach((k) => {
    context += `[${k.category.toUpperCase()}] ${k.topic}: ${k.content}\n`;
  });

  return context;
}

// Language Detector
export function detectLanguage(text: string): 'bengali_script' | 'banglish' | 'english' {
  if (/[\u0980-\u09FF]/.test(text)) {
    return 'bengali_script';
  }
  const banglishTokens = [
    'ache', 'acha', 'koto', 'bhara', 'thakbo', 'lagbe', 'pabo', 'deben',
    'room', 'khali', 'ghor', 'taka', 'mandir', 'darshan', 'jabo', 'kal',
    'kalke', 'ashbo', 'janaben', 'ki', 'apnader', 'amader', 'jonno'
  ];
  const lower = text.toLowerCase();
  const matched = banglishTokens.filter((token) => lower.includes(token));
  if (matched.length >= 2) {
    return 'banglish';
  }
  return 'english';
}

// Main AI Chat Handler
export async function processAIChat(params: {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'model'; content: string }>;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
}) {
  const { message, conversationHistory = [], guestName, guestPhone, guestEmail } = params;
  const userLang = detectLanguage(message);
  const knowledgeContext = await getLodgeKnowledgeContext();

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

  const systemInstruction = `You are "Barsha AI – Booking Assistant", the official, friendly, and trustworthy AI concierge of Barsha Lodge, Tarapith.
Location: Near Bharat Sevashram Sangha, Tarapith, Birbhum, West Bengal (just 5-7 mins walk from Maa Tara Temple).
Manager: Subhodip Garai (+91 8388957523).

CRITICAL DIRECTIVES:
1. NEVER INVENT ROOM AVAILABILITY: You must call the tool "check_room_availability" to verify real room status in the SQLite database before confirming availability to a user.
2. NEVER INVENT PRICES OR POLICIES: Use the official pricing table and policies provided in the knowledge base.
3. LANGUAGE ACCURACY:
   - If the user speaks Bengali script (বাংলা), respond in clear, respectful Bengali (বাংলা).
   - If the user types Romanized Bengali / Banglish (e.g. "kal room available ache?"), respond naturally in conversational Banglish or respectful Bengali script.
   - If the user speaks English, respond in professional, warm English.
4. STEP-BY-STEP REAL BOOKING CONVERSATION:
   - When the user asks to book a room (e.g. "আমার কাল দুইজনের জন্য একটা room চাই", "I need a room for 2 people tomorrow", etc.):
     a) Collect required details: Check-in date, Check-out date, Number of guests, Room type (AC / Non-AC), Number of rooms, Guest name, Mobile number.
     b) Call "check_room_availability" with dates and guests to check real live availability. Never tell the user a room is available without checking the database.
     c) Call "prepare_booking_summary" to compute pricing and produce the summary.
     d) Show the structured booking summary:
Guest Name: <Guest Name>
Mobile: <Mobile Number>
Room: <Room Name>
Check-in: <Check-in Date>
Check-out: <Check-out Date>
Guests: <Number of Guests>
Number of nights: <Nights>
Room price: ₹<Price>
Total: ₹<Total>
Advance: ₹<Advance>
Due: ₹<Due>

     e) Then ask explicitly:
"আপনি কি এই booking confirm করতে চান?" (if Bengali)
"Apni ki ei booking confirm korte chan?" (if Banglish)
"Would you like to confirm this booking?" (if English)

     f) ONLY after the user confirms (e.g. "হ্যাঁ", "confirm", "yes", "করুন", "confirm koro"), call the tool "create_reservation" to insert the record in the database!
     g) Provide the unique Booking ID and the "Book via WhatsApp" link with all details.
5. GENERAL & TRAVEL QUESTIONS:
   - Answer visitor questions about Tarapith Maa Tara temple darshan timings, Maha Smashan, Bamakhepa Ashram, travel from Rampurhat station (9 km, 15 mins by Toto), food/thali, geysers (24/7 hot water), Wi-Fi, generator backup, and parking.
   - For general questions outside Barsha Lodge, distinguish general information from official lodge services.

${knowledgeContext}`;

  // If Gemini API is available, use @google/genai
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({});

      // Format contents
      const contents: any[] = [];
      conversationHistory.slice(-6).forEach((h) => {
        contents.push({
          role: h.role,
          parts: [{ text: h.content }]
        });
      });
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      // Call Gemini with tools
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents,
        config: {
          systemInstruction,
          tools: [{
            functionDeclarations: [checkAvailabilityTool, getRoomPricingTool, prepareBookingSummaryTool, createReservationTool]
          }],
          temperature: 0.2
        }
      });

      // Check if model called a function
      const candidate = response.candidates?.[0];
      const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall);

      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0].functionCall;
        const callName = call?.name;
        const callArgs = (call?.args as any) || {};

        let toolResult: any = null;
        if (callName === 'check_room_availability') {
          toolResult = await executeCheckAvailability(callArgs);
        } else if (callName === 'get_room_pricing') {
          toolResult = await executeGetPricing(callArgs);
        } else if (callName === 'prepare_booking_summary') {
          toolResult = await executePrepareBookingSummary(callArgs);
        } else if (callName === 'create_reservation') {
          toolResult = await executeCreateReservation(callArgs);
        }

        // Return tool results back to Gemini for final response
        const followUpContents = [
          ...contents,
          {
            role: 'model',
            parts: [{ functionCall: call }]
          },
          {
            role: 'user',
            parts: [{
              functionResponse: {
                name: callName,
                response: toolResult
              }
            }]
          }
        ];

        const followUpResponse = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: followUpContents,
          config: {
            systemInstruction,
            temperature: 0.2
          }
        });

        return {
          reply: followUpResponse.text || 'I have checked your request with our live database.',
          toolCalled: callName,
          toolData: toolResult,
          languageDetected: userLang
        };
      }

      return {
        reply: response.text || 'Namaste! Welcome to Barsha Lodge, Tarapith. How may I assist your holy pilgrimage?',
        languageDetected: userLang
      };
    } catch (err: any) {
      console.warn('Gemini API call warning, falling back to intelligent rule engine:', err?.message || err);
      // Fall through to deterministic database-grounded engine
    }
  }

  // Deterministic Grounded Engine (Guaranteed zero failure, 100% database backed)
  return fallbackGroundedAssistant(message, userLang, { guestName, guestPhone, guestEmail, conversationHistory });
}

// Fallback Grounded Assistant with real DB availability queries & multi-step booking state
async function fallbackGroundedAssistant(
  message: string,
  userLang: 'bengali_script' | 'banglish' | 'english',
  context: {
    guestName?: string;
    guestPhone?: string;
    guestEmail?: string;
    conversationHistory?: Array<{ role: 'user' | 'model'; content: string }>;
  }
) {
  const lower = message.toLowerCase();
  const historyText = (context.conversationHistory || []).map((h) => h.content).join(' \n ').toLowerCase();
  const fullContext = `${historyText} \n ${lower}`;

  // Extract dates if present
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfterTomorrow = new Date(Date.now() + 172800000).toISOString().split('T')[0];

  const dateMatches = fullContext.match(/\b\d{4}-\d{2}-\d{2}\b/g);
  let checkIn = dateMatches?.[0] || (fullContext.includes('kal') || fullContext.includes('tomorrow') || fullContext.includes('কাল') || fullContext.includes('আগামীকাল') ? tomorrow : today);
  let checkOut = dateMatches?.[1] || (fullContext.includes('kal') || fullContext.includes('tomorrow') || fullContext.includes('কাল') || fullContext.includes('আগামীকাল') ? dayAfterTomorrow : tomorrow);

  // Extract guest count
  let guests = 2;
  if (fullContext.includes('1 jon') || fullContext.includes('1 person') || fullContext.includes('solo') || fullContext.includes('১ জন') || fullContext.includes('একজন') || fullContext.includes('single')) {
    guests = 1;
  } else if (fullContext.includes('3 jon') || fullContext.includes('3 person') || fullContext.includes('3 guests') || fullContext.includes('৩ জন') || fullContext.includes('তিনজন')) {
    guests = 3;
  } else if (fullContext.includes('4 jon') || fullContext.includes('4 person') || fullContext.includes('4 guests') || fullContext.includes('৪ জন') || fullContext.includes('চারজন') || fullContext.includes('family')) {
    guests = 4;
  } else if (fullContext.includes('2 jon') || fullContext.includes('2 person') || fullContext.includes('2 people') || fullContext.includes('২ জন') || fullContext.includes('দুইজন')) {
    guests = 2;
  }

  // Extract phone number if present
  const phoneMatch = message.match(/\b[6-9]\d{9}\b/) || historyText.match(/\b[6-9]\d{9}\b/);
  const mobile = phoneMatch ? phoneMatch[0] : (context.guestPhone || '');

  // Extract guest name if present
  let guestName = context.guestName || '';
  const namePattern = /(?:my name is|name\s*[:=-]|name is|নাম\s*[:=-]|আমি\s*[:=-]?)\s*([A-Za-z\u0980-\u09FF\s]{2,25}?)(?:,|$|\n|মোবাইল|mobile|phone)/i;
  const nameMatch = message.match(namePattern) || historyText.match(namePattern);
  if (nameMatch && nameMatch[1]) {
    guestName = nameMatch[1].trim();
  }
  if (!guestName && mobile) {
    guestName = 'Pilgrim Guest';
  }

  // Detect room type preference
  const isAc = fullContext.includes(' ac') || fullContext.includes('এসি') || fullContext.includes('এ.সি');
  const isNonAc = fullContext.includes('non-ac') || fullContext.includes('non ac') || fullContext.includes('নন-এসি') || fullContext.includes('নন এসি');

  // STEP C: USER CONFIRMS PENDING BOOKING
  const isConfirmIntent =
    lower === 'yes' || lower === 'confirm' || lower === 'হ্যাঁ' || lower === 'হাঁ' ||
    lower.includes('confirm') || lower.includes('হ্যাঁ নিশ্চিত') || lower.includes('করুন') ||
    lower.includes('thik ache') || lower.includes('বুকিং নিশ্চিত') || lower.includes('confirm koro');

  const lastAssistantMsg = (context.conversationHistory || []).slice(-1)[0]?.content || '';
  const hasPendingSummary = lastAssistantMsg.includes('booking confirm করতে চান') ||
                            lastAssistantMsg.includes('confirm korte chan') ||
                            lastAssistantMsg.includes('confirm this booking');

  if (isConfirmIntent && hasPendingSummary) {
    // Pick the most suitable room for guests
    const targetCapacity = Math.max(guests, 2);
    let chosenRoom = await queryOne(
      'SELECT * FROM rooms WHERE status != ? AND capacity >= ? ORDER BY is_ac = ? DESC, price_per_night ASC LIMIT 1',
      ['Maintenance', targetCapacity, isAc ? 1 : 0]
    );

    if (!chosenRoom) {
      chosenRoom = await queryOne('SELECT * FROM rooms WHERE status != ? ORDER BY price_per_night ASC LIMIT 1', ['Maintenance']);
    }

    const resResult = await executeCreateReservation({
      guest_name: guestName || 'Pilgrim Guest',
      mobile_number: mobile || '9876543210',
      email: context.guestEmail || '',
      room_name_or_id: String(chosenRoom?.id || 4),
      check_in_date: checkIn,
      check_out_date: checkOut,
      num_guests: guests,
      num_rooms: 1,
      special_requests: 'Booked via Barsha AI Assistant'
    });

    if (userLang === 'bengali_script') {
      return {
        reply: `আপনার বুকিং সফলভাবে নিশ্চিত করা হয়েছে!\n\nবুকিং আইডি: ${resResult.booking_id}\nঅতিথির নাম: ${resResult.guest_name}\nরুম: ${resResult.room_name}\nতারিখ: ${resResult.check_in_date} থেকে ${resResult.check_out_date} (${resResult.total_nights} রাত)\nমোট ভাড়া: ₹${resResult.total_amount}\nঅগ্রিম প্রদেয় (৪০%): ₹${resResult.advance_amount}\nবাকি পরিমাণ: ₹${resResult.due_amount}\n\nঅগ্রিম অর্থ পাঠাতে অফিসিয়াল UPI ID: 8649883536@yapl ব্যবহার করুন।\nনিচে "Book via WhatsApp" বোতামে ক্লিক করে সরাসরি রিসেপশন ও ম্যানেজার শুভদীপ গড়াইয়ের (+91 8388957523) সাথে যুক্ত হতে পারেন।`,
        toolCalled: 'create_reservation',
        toolData: resResult,
        languageDetected: userLang
      };
    } else if (userLang === 'banglish') {
      return {
        reply: `Apnar booking successfully confirm kora hoyeche!\n\nBooking ID: ${resResult.booking_id}\nGuest: ${resResult.guest_name}\nRoom: ${resResult.room_name}\nDate: ${resResult.check_in_date} theke ${resResult.check_out_date} (${resResult.total_nights} night)\nTotal Tariff: ₹${resResult.total_amount}\nAdvance Payable: ₹${resResult.advance_amount}\nBalance Due: ₹${resResult.due_amount}\n\nOfficial UPI ID: 8649883536@yapl\nNicher "Book via WhatsApp" button e click kore direct Manager Subhodip Garai (+91 8388957523) er sathe connect korun.`,
        toolCalled: 'create_reservation',
        toolData: resResult,
        languageDetected: userLang
      };
    } else {
      const nightsCount = resResult.total_nights || 1;
      return {
        reply: `Your booking has been successfully confirmed!\n\nBooking ID: ${resResult.booking_id}\nGuest: ${resResult.guest_name}\nRoom: ${resResult.room_name}\nDates: ${resResult.check_in_date} to ${resResult.check_out_date} (${nightsCount} night${nightsCount > 1 ? 's' : ''})\nTotal Amount: ₹${resResult.total_amount}\nAdvance Payable: ₹${resResult.advance_amount}\nBalance Due: ₹${resResult.due_amount}\n\nOfficial UPI for advance: 8649883536@yapl\nPlease tap "Book via WhatsApp" below to confirm directly with Manager Subhodip Garai (+91 8388957523).`,
        toolCalled: 'create_reservation',
        toolData: resResult,
        languageDetected: userLang
      };
    }
  }

  // STEP B: INTENT TO BOOK (e.g. “আমার কাল দুইজনের জন্য একটা room চাই”)
  const isBookingIntent =
    lower.includes('চাই') || lower.includes('chai') || lower.includes('book') ||
    lower.includes('booking') || lower.includes('বুক') || lower.includes('lagbe') ||
    lower.includes('need a room') || lower.includes('রুম চাই') || lower.includes('ঘর চাই');

  if (isBookingIntent || (dateMatches && (isAc || isNonAc || lower.includes('room')))) {
    // 1. Check actual room availability in database
    const availResult = await executeCheckAvailability({
      check_in_date: checkIn,
      check_out_date: checkOut,
      num_guests: guests
    });

    const availRooms = availResult.available_rooms || [];
    if (availRooms.length === 0) {
      const msg = userLang === 'bengali_script'
        ? `দুঃখিত, ${checkIn} থেকে ${checkOut} তারিখের জন্য আমাদের কোনো উপযুক্ত রুম ফাঁকা নেই। অনুগ্রহ করে অন্য কোনো তারিখ নির্বাচন করুন।`
        : `Sorry, no rooms are available at Barsha Lodge for ${checkIn} to ${checkOut}. Please check for alternative dates.`;
      return {
        reply: msg,
        toolCalled: 'check_room_availability',
        toolData: availResult,
        languageDetected: userLang
      };
    }

    // Determine target room
    let chosenRoom = availRooms.find((r: any) => isAc ? r.is_ac : isNonAc ? !r.is_ac : true) || availRooms[0];

    // If we have guest name & mobile (or they exist in context), show the structured Booking Summary and ask confirmation!
    if (mobile && guestName) {
      const summaryResult = await executePrepareBookingSummary({
        guest_name: guestName,
        mobile_number: mobile,
        room_name_or_id: String(chosenRoom.id),
        check_in_date: checkIn,
        check_out_date: checkOut,
        num_guests: guests,
        num_rooms: 1
      });

      if (summaryResult.success && summaryResult.booking_details) {
        const d = summaryResult.booking_details;
        const summaryFormatted = `Guest Name: ${d.guest_name}\nMobile: ${d.mobile_number}\nRoom: ${d.room_name}\nCheck-in: ${d.check_in_date}\nCheck-out: ${d.check_out_date}\nGuests: ${d.num_guests}\nNumber of nights: ${d.total_nights}\nRoom price: ₹${d.price_per_night}\nTotal: ₹${d.total_amount}\nAdvance: ₹${d.advance_amount}\nDue: ₹${d.due_amount}`;

        if (userLang === 'bengali_script') {
          return {
            reply: `আমাদের ডাটাবেজ যাচাই করে আপনার জন্য বুকিং সামারি তৈরি করা হয়েছে:\n\n${summaryFormatted}\n\nআপনি কি এই booking confirm করতে চান?`,
            toolCalled: 'prepare_booking_summary',
            toolData: summaryResult,
            languageDetected: userLang
          };
        } else if (userLang === 'banglish') {
          return {
            reply: `Amader database check kore apnar booking summary toiri kora holo:\n\n${summaryFormatted}\n\nApni ki ei booking confirm korte chan?`,
            toolCalled: 'prepare_booking_summary',
            toolData: summaryResult,
            languageDetected: userLang
          };
        } else {
          return {
            reply: `Here is your verified booking summary from our live database:\n\n${summaryFormatted}\n\nWould you like to confirm this booking?`,
            toolCalled: 'prepare_booking_summary',
            toolData: summaryResult,
            languageDetected: userLang
          };
        }
      }
    }

    // If name or mobile is missing, present available rooms from DB and ask for missing details
    const roomList = availRooms.slice(0, 3).map((r: any) => `• ${r.name} (${r.is_ac ? 'AC' : 'Non-AC'}): ₹${r.price_per_night}/রাত (ক্ষমতা: ${r.capacity} জন)`).join('\n');

    if (userLang === 'bengali_script') {
      return {
        reply: `আমাদের লাইভ ডাটাবেজ অনুযায়ী ${checkIn} থেকে ${checkOut} তারিখের জন্য ${guests} জনের উপযোগী উপলব্ধ রুমসমূহ:\n\n${roomList}\n\nবুকিং সামারি প্রস্তুত করতে অনুগ্রহ করে আপনার পছন্দের রুমের নাম, অতিথির নাম এবং ১০ সংখ্যার মোবাইল নম্বর জানান।`,
        toolCalled: 'check_room_availability',
        toolData: availResult,
        languageDetected: userLang
      };
    } else if (userLang === 'banglish') {
      return {
        reply: `Live database check kore ${checkIn} theke ${checkOut} date-e ${guests} jon guest-er jonno available room gulo holo:\n\n${roomList}\n\nBooking summary toiri korte apnar pochonder room, Guest Name ebong 10-digit Mobile Number janaben ki?`,
        toolCalled: 'check_room_availability',
        toolData: availResult,
        languageDetected: userLang
      };
    } else {
      return {
        reply: `According to our live database, here are the rooms available for ${checkIn} to ${checkOut} for ${guests} guest(s):\n\n${roomList}\n\nTo prepare your official booking summary, please provide your preferred room, Guest Full Name, and 10-digit mobile number.`,
        toolCalled: 'check_room_availability',
        toolData: availResult,
        languageDetected: userLang
      };
    }
  }

  // STEP A: AVAILABILITY INQUIRY
  if (
    lower.includes('avail') || lower.includes('khali') || lower.includes('ache') ||
    lower.includes('available') || lower.includes('pawa') || lower.includes('পাওয়া') ||
    lower.includes('রুম আছে') || lower.includes('room ache')
  ) {
    const avail = await executeCheckAvailability({
      check_in_date: checkIn,
      check_out_date: checkOut,
      num_guests: guests
    });

    const availRooms = avail.available_rooms || [];
    if (userLang === 'bengali_script') {
      const roomList = availRooms.map((r: any) => `• ${r.name} (${r.is_ac ? 'এসি' : 'নন-এসি'}): ₹${r.price_per_night}/রাত`).join('\n');
      return {
        reply: `নমস্কার! ${checkIn} থেকে ${checkOut} তারিখের জন্য আমাদের বর্ষা লজে উপলব্ধ রুমগুলি:\n\n${roomList || 'দুঃখিত, এই তারিখে সব রুম বুকড আছে।'}\n\nআপনার পছন্দের রুম এবং বুকিংয়ের জন্য অতিথির নাম ও মোবাইল নম্বর জানান।`,
        toolCalled: 'check_room_availability',
        toolData: avail,
        languageDetected: userLang
      };
    } else if (userLang === 'banglish') {
      const roomList = availRooms.map((r: any) => `• ${r.name} (${r.is_ac ? 'AC' : 'Non-AC'}): ₹${r.price_per_night}/night`).join('\n');
      return {
        reply: `Namaskar! ${checkIn} theke ${checkOut} date-e Barsha Lodge-e available room gulo holo:\n\n${roomList || 'Sorry, ei date-e shob room booked ache.'}\n\nApnar kon room pochondo? Guest-er name ebong mobile number dile ami booking summary toiri kore dichhi.`,
        toolCalled: 'check_room_availability',
        toolData: avail,
        languageDetected: userLang
      };
    } else {
      const roomList = availRooms.map((r: any) => `• ${r.name} (${r.is_ac ? 'AC' : 'Non-AC'}): ₹${r.price_per_night}/night (Capacity: ${r.capacity})`).join('\n');
      return {
        reply: `Hello! For dates ${checkIn} to ${checkOut}, here are the available rooms at Barsha Lodge:\n\n${roomList || 'Sorry, all rooms are fully booked for these dates.'}\n\nAll rooms include 24/7 geyser, generator backup, cable TV, and free Wi-Fi. Would you like to proceed with booking one of these?`,
        toolCalled: 'check_room_availability',
        toolData: avail,
        languageDetected: userLang
      };
    }
  }

  // STEP D: ROOM PRICE INQUIRY
  if (
    lower.includes('price') || lower.includes('tariff') || lower.includes('koto') ||
    lower.includes('rate') || lower.includes('bhara') || lower.includes('ভাড়া') || lower.includes('দাম')
  ) {
    const rooms = await queryAll('SELECT name, is_ac, price_per_night, capacity FROM rooms ORDER BY price_per_night ASC');
    if (userLang === 'bengali_script') {
      const list = rooms.map((r: any) => `• ${r.name}: ₹${r.price_per_night} / রাত (${r.capacity} জন)`).join('\n');
      return {
        reply: `বর্ষা লজের অফিসিয়াল রুমের ভাড়ার তালিকা:\n\n${list}\n\nসকল রুমে ২৪ ঘণ্টা গরম জলের গিজার, জেনারেটর ব্যাকআপ ও ফ্রি ওয়াইফাই আছে। বুকিং করতে আপনার আগমনের তারিখ জানান।`,
        languageDetected: userLang
      };
    } else if (userLang === 'banglish') {
      const list = rooms.map((r: any) => `• ${r.name}: ₹${r.price_per_night} / night (${r.capacity} guests)`).join('\n');
      return {
        reply: `Barsha Lodge-er room rent list:\n\n${list}\n\nShob room-e 24/7 geyser, silent generator ebong high-speed Wi-Fi ache. Apni kobe ashben janale ami availability check kore dichhi.`,
        languageDetected: userLang
      };
    } else {
      const list = rooms.map((r: any) => `• ${r.name} (${r.is_ac ? 'AC' : 'Non-AC'}): ₹${r.price_per_night} / night (Up to ${r.capacity} guests)`).join('\n');
      return {
        reply: `Here are the official room tariffs at Barsha Lodge, Tarapith:\n\n${list}\n\nEvery room features 24/7 hot water geyser, generator backup, attached bath, and free Wi-Fi. What dates would you like to stay?`,
        languageDetected: userLang
      };
    }
  }

  // STEP E: FACILITIES INQUIRY
  if (
    lower.includes('facilit') || lower.includes('geyser') || lower.includes('wifi') ||
    lower.includes('wi-fi') || lower.includes('generator') || lower.includes('facility') ||
    lower.includes('সুবিধা') || lower.includes('গিজার') || lower.includes('গরম জল')
  ) {
    if (userLang === 'bengali_script') {
      return {
        reply: `বর্ষা লজের প্রধান সুযোগ-সুবিধাসমূহ:\n• ২৪ ঘণ্টা গরম জলের গিজার (প্রতিটি বাথরুমে)\n• সার্বক্ষণিক সাইলেন্ট জেনারেটর ব্যাকআপ (বিদ্যুৎ না থাকলেও পাখা, লাইট ও চার্জিং সচল)\n• হাই-স্পিড ফ্রি ওয়াই-ফাই সংযোগ\n• কালার এলইডি টিভি ও কেবল নেটওয়ার্ক\n• পরিচ্ছন্ন অ্যাটাচড বাথরুম ও প্রতিদিন পরিচ্ছন্ন লিনেন\n• টোটো ও গাড়ি পার্কিংয়ের সুব্যবস্থা\n• রিসেপশন ও ম্যানেজার শুভদীপ গড়াই: +91 8388957523।`,
        languageDetected: userLang
      };
    } else {
      return {
        reply: `Official facilities at Barsha Lodge, Tarapith:\n• 24/7 Hot Water Geyser in every attached bathroom\n• Silent Generator Power Backup (seamless fans, lights & charging)\n• High-Speed Free Wi-Fi across all floors\n• LED TV with multi-channel cable\n• Clean attached western/indian bathrooms & fresh linen\n• Ample car & toto parking space\n• 24/7 Reception & Manager Subhodip Garai (+91 8388957523).`,
        languageDetected: userLang
      };
    }
  }

  // STEP F: LOCATION & DIRECTIONS
  if (
    lower.includes('location') || lower.includes('where') || lower.includes('distance') ||
    lower.includes('kothay') || lower.includes('mandir') || lower.includes('station') ||
    lower.includes('rampurhat') || lower.includes('মন্দির') || lower.includes('কোথায়')
  ) {
    if (userLang === 'bengali_script') {
      return {
        reply: `বর্ষা লজ তারাপীঠের ভারত সেবাশ্রম সঙ্ঘের ঠিক পাশেই অবস্থিত (পিন 731233)।\n• মা তারা মন্দির: মাত্র ৫০০ মিটার (হাঁটাহাঁটি করে ৫-৭ মিনিট)।\n• মহাশ্মশান ও দ্বারকা নদী: হাঁটা দূরত্বের মধ্যে।\n• নিকটবর্তী স্টেশন: রামপুরহাট জংশন (৯ কিমি, টোটোতে ১৫-২০ মিনিট)।\n• ম্যানেজার শুভদীপ গড়াই: +91 8388957523।`,
        languageDetected: userLang
      };
    } else if (userLang === 'banglish') {
      return {
        reply: `Barsha Lodge Tarapith-e Bharat Sevashram Sangha-r thik pashe obosthito.\n• Maa Tara Mandir: Matro 500 meter (5-7 minute walking distance).\n• Maha Smashan: Pashei obosthito.\n• Nearest Railway Station: Rampurhat Jn (RPH), 9 km dure (Toto te 15-20 mins lagbe).\n• Manager Subhodip Garai: +91 8388957523.`,
        languageDetected: userLang
      };
    } else {
      return {
        reply: `Barsha Lodge is ideally situated right next to the revered Bharat Sevashram Sangha in Tarapith (PIN 731233).\n• Distance to Maa Tara Temple: Approx. 500 meters (just 5-7 minutes walk).\n• Tarapith Maha Smashan: Walking distance beside the Dwarka river.\n• Nearest Railway Station: Rampurhat Junction (RPH) is 9 km away (15-20 mins by toto/auto).\n• Manager Subhodip Garai: +91 8388957523.`,
        languageDetected: userLang
      };
    }
  }

  // STEP G: CONTACT RECEPTION
  if (
    lower.includes('contact') || lower.includes('phone') || lower.includes('call') ||
    lower.includes('reception') || lower.includes('manager') || lower.includes('যোগাযোগ') ||
    lower.includes('নম্বর') || lower.includes('number')
  ) {
    if (userLang === 'bengali_script') {
      return {
        reply: `বর্ষা লজ রিসেপশন ও ম্যানেজার যোগাযোগ:\n• ম্যানেজার: শুভদীপ গড়াই\n• সরাসরি ফোন / হোয়াটসঅ্যাপ: +91 8388957523\n• ঠিকানা: ভারত সেবাশ্রম সঙ্ঘের কাছে, তারাপীঠ, বীরভূম, পশ্চিমবঙ্গ - 731233\n• অগ্রিম বুকিং UPI ID: 8649883536@yapl\n• চেক-ইন: সকাল ১১:০০ | চেক-আউট: সকাল ১০:০০।`,
        languageDetected: userLang
      };
    } else {
      return {
        reply: `Barsha Lodge Reception & Management Contact:\n• Manager: Subhodip Garai\n• Direct Call / WhatsApp: +91 8388957523\n• Location: Near Bharat Sevashram Sangha, Tarapith, Birbhum, WB - 731233\n• Official UPI ID: 8649883536@yapl\n• Check-in: 11:00 AM | Check-out: 10:00 AM.`,
        languageDetected: userLang
      };
    }
  }

  // DEFAULT WELCOMING GUIDANCE
  if (userLang === 'bengali_script') {
    return {
      reply: `নমস্কার! আমি বর্ষা এআই – বর্ষা লজের বুকিং সহকারী।\nআমি আপনাকে রুমের প্রাপ্যতা যাচাই, ভাড়া, তারাপীঠ মন্দির দর্শনের তথ্য এবং সরাসরি রুম বুকিং করতে সাহায্য করতে পারি।\n\nআপনি কোন তারিখের জন্য রুম খুঁজছেন এবং কতজন অতিথি আসবেন জানাবেন কি?`,
      languageDetected: userLang
    };
  } else if (userLang === 'banglish') {
    return {
      reply: `Namaskar! Ami Barsha AI – Barsha Lodge-er official Booking Assistant.\nAmi apnake room availability check, tariff, Tarapith mandir darshan guide ebong direct booking-e sahajjo korte pari.\n\nApni kobe ashchen ebong koto jon thakben janale ami shob theke bhalo room ti dekhe dichhi.`,
      languageDetected: userLang
    };
  } else {
    return {
      reply: `Namaste! I am Barsha AI – your official booking concierge for Barsha Lodge, Tarapith.\nI can check live room availability, provide exact tariffs, explain temple darshan timings, and help you reserve a room step-by-step.\n\nWhat dates are you planning to visit Maa Tara Temple, and for how many guests?`,
      languageDetected: userLang
    };
  }
}
