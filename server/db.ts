import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
type Database = any;
import bcrypt from 'bcryptjs';

let dbInstance: Database | null = null;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'barsha_lodge.sqlite');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  ensureDataDir();
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
      initTablesAndSeeds(dbInstance);
      saveDb();
      return dbInstance;
    } catch (e) {
      console.error('Failed to load existing SQLite database, creating new one:', e);
    }
  }

  dbInstance = new SQL.Database();
  initTablesAndSeeds(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb() {
  if (!dbInstance) return;
  try {
    ensureDataDir();
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to save SQLite file:', err);
  }
}

function initTablesAndSeeds(db: Database) {
  // Read schema.sql or execute table creation
  const schemaPath = path.join(process.cwd(), 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.run(schemaSql);
  }

  // Seed default admin: subhodip7 / subhodip2007
  const adminCheck = db.exec("SELECT COUNT(*) as count FROM admins WHERE username = 'subhodip7'");
  const adminCount = adminCheck[0]?.values[0]?.[0] as number || 0;
  if (adminCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('subhodip2007', salt);
    db.run(
      `INSERT INTO admins (username, password_hash, name, email, role) 
       VALUES ('subhodip7', ?, 'Subhodip Garai', 'subhodipgarai@gmail.com', 'superadmin')`,
      [hash]
    );
  }

  // Seed default rooms
  const roomCheck = db.exec("SELECT COUNT(*) as count FROM rooms");
  const roomCount = roomCheck[0]?.values[0]?.[0] as number || 0;
  if (roomCount === 0) {
    const defaultRooms = [
      {
        name: 'Single Bed Room',
        room_number: '101',
        type: 'single',
        is_ac: 0,
        bed_type: 'Single Bed',
        price_per_night: 700,
        capacity: 1,
        amenities: JSON.stringify(['Single Bed', 'Geyser', 'Cable TV', 'Generator Backup', 'Free Wi-Fi', 'Attached Bathroom']),
        status: 'Available',
        image_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
        description: 'Budget-friendly, cozy single bed room ideal for solo pilgrims and travelers. Features clean attached bath, 24/7 hot water geyser, generator backup, and high-speed Wi-Fi.'
      },
      {
        name: 'Single Bed AC Room',
        room_number: '102',
        type: 'single',
        is_ac: 1,
        bed_type: 'Single Bed',
        price_per_night: 1400,
        capacity: 1,
        amenities: JSON.stringify(['Air Conditioning', 'Single Bed', 'Geyser', 'Cable TV', 'Generator Backup', 'Free Wi-Fi', 'Room Service']),
        status: 'Available',
        image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
        description: 'Cool and comfortable air-conditioned single bed room. Complete with modern split AC, geyser for warm bath after temple darshan, cable TV, and free Wi-Fi.'
      },
      {
        name: 'Non-AC Double Bed Room',
        room_number: '201',
        type: 'double',
        is_ac: 0,
        bed_type: 'Double Bed',
        price_per_night: 1000,
        capacity: 2,
        amenities: JSON.stringify(['Double Bed', 'Geyser', 'Cable TV', 'Generator Backup', 'Free Wi-Fi', 'Attached Bath', 'Large Windows']),
        status: 'Available',
        image_url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',
        description: 'Spacious and airy double bedroom with large king-size bed, suitable for couples and families. Includes hot water geyser, ceiling fan, cable TV, and uninterrupted generator power.'
      },
      {
        name: 'Double Bed AC Room',
        room_number: '202',
        type: 'double',
        is_ac: 1,
        bed_type: 'Double Bed',
        price_per_night: 1400,
        capacity: 2,
        amenities: JSON.stringify(['Air Conditioning', 'Double Bed', 'Geyser', 'Cable TV', 'Generator Backup', 'Free Wi-Fi', 'Attached Bathroom', 'Tea Kettle']),
        status: 'Available',
        image_url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
        description: 'Premium air-conditioned double bed room offering superior comfort. Features quiet cooling AC, geyser, cable TV, comfortable mattresses, and close proximity to Bharat Sevashram Sangha.'
      },
      {
        name: 'Family Triple Bed AC Room',
        room_number: '301',
        type: 'triple',
        is_ac: 1,
        bed_type: 'Triple Bed',
        price_per_night: 1800,
        capacity: 4,
        amenities: JSON.stringify(['Air Conditioning', 'Triple Bed (King + Single)', 'Geyser', 'Cable TV', 'Generator Backup', 'Free Wi-Fi', 'Family Dining Space']),
        status: 'Available',
        image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
        description: 'Large family room configured with king bed and additional bed to comfortably accommodate 3 to 4 family members visiting Tarapith for holy Puja.'
      }
    ];

    for (const r of defaultRooms) {
      db.run(
        `INSERT INTO rooms (name, room_number, type, is_ac, bed_type, price_per_night, capacity, amenities, status, image_url, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.name, r.room_number, r.type, r.is_ac, r.bed_type, r.price_per_night, r.capacity, r.amenities, r.status, r.image_url, r.description]
      );
    }
  }

  // Seed default facilities
  const facCheck = db.exec("SELECT COUNT(*) as count FROM facilities");
  const facCount = facCheck[0]?.values[0]?.[0] as number || 0;
  if (facCount === 0) {
    const defaultFacilities = [
      { name: 'AC & Non-AC Rooms', description: 'Clean, well-ventilated rooms with split AC or ceiling fans.', icon: 'AirVent', sort: 1 },
      { name: 'Single / Double / Triple Bed', description: 'Comfortable bedding options for solo, couple, or family stays.', icon: 'BedDouble', sort: 2 },
      { name: '24/7 Geyser (Hot Water)', description: 'Instant hot water geysers in attached bathrooms for fresh morning darshan.', icon: 'Flame', sort: 3 },
      { name: 'Cable TV Entertainment', description: 'Color TV with all popular Bengali, Hindi, and devotional channels.', icon: 'Tv', sort: 4 },
      { name: '24x7 Generator Backup', description: 'Uninterrupted power supply so your comfort is never compromised.', icon: 'Zap', sort: 5 },
      { name: 'Free High-Speed Wi-Fi', description: 'Seamless internet access throughout the lodge premises.', icon: 'Wifi', sort: 6 },
      { name: 'Sparkling Clean Rooms', description: 'Daily thorough sanitization and fresh bed linen service.', icon: 'Sparkles', sort: 7 },
      { name: 'Family & Pilgrim Friendly', description: 'Safe, homely environment tailored for devotees and families.', icon: 'HeartHandshake', sort: 8 },
      { name: 'Convenient Tarapith Location', description: 'Located near Bharat Sevashram Sangha, walking distance to Maa Tara Temple.', icon: 'MapPin', sort: 9 },
      { name: 'Maa Tara Puja Assistance', description: 'Friendly local guidance for VIP Darshan and temple puja rituals.', icon: 'Sun', sort: 10 }
    ];

    for (const f of defaultFacilities) {
      db.run(
        `INSERT INTO facilities (name, description, icon, is_active, sort_order)
         VALUES (?, ?, ?, 1, ?)`,
        [f.name, f.description, f.icon, f.sort]
      );
    }
  }

  // Seed default gallery
  const galCheck = db.exec("SELECT COUNT(*) as count FROM gallery");
  const galCount = galCheck[0]?.values[0]?.[0] as number || 0;
  if (galCount === 0) {
    const defaultGallery = [
      { title: 'Barsha Lodge Front View', category: 'Lodge', image_url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80', caption: 'Front elevation of Barsha Lodge in Tarapith near Bharat Sevashram Sangha', sort: 1 },
      { title: 'Deluxe AC Double Room', category: 'Rooms', image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80', caption: 'Clean, sanitized air-conditioned bedroom with premium bed linen', sort: 2 },
      { title: 'Lodge Reception & Lounge', category: 'Lodge', image_url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80', caption: '24/7 reception desk managed personally by Subhodip Garai', sort: 3 },
      { title: 'Comfortable Single Room', category: 'Rooms', image_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1000&q=80', caption: 'Affordable single bed room for devotees and solo pilgrims', sort: 4 },
      { title: 'Holy Maa Tara Mandir Darshan', category: 'Tarapith', image_url: 'https://images.unsplash.com/photo-1609766857327-024213cbdf33?auto=format&fit=crop&w=1000&q=80', caption: 'Divine temple of Maa Tara in Tarapith, Birbhum, West Bengal', sort: 5 },
      { title: 'Bharat Sevashram Sangha Proximity', category: 'Tarapith', image_url: 'https://images.unsplash.com/photo-1548625361-19602e1b1d7f?auto=format&fit=crop&w=1000&q=80', caption: 'Calm, serene atmosphere near Bharat Sevashram Sangha Tarapith', sort: 6 },
      { title: 'Clean Attached Bath with Geyser', category: 'Facilities', image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1000&q=80', caption: 'Hygienic bathroom equipped with instant geyser for hot water', sort: 7 },
      { title: 'Family Room with Extra Beds', category: 'Rooms', image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80', caption: 'Spacious family arrangement for a peaceful devotional holiday', sort: 8 }
    ];

    for (const g of defaultGallery) {
      db.run(
        `INSERT INTO gallery (title, category, image_url, sort_order, caption)
         VALUES (?, ?, ?, ?, ?)`,
        [g.title, g.category, g.image_url, g.sort, g.caption]
      );
    }
  }

  // Seed default website settings
  const settingsCheck = db.exec("SELECT COUNT(*) as count FROM website_settings");
  const settingsCount = settingsCheck[0]?.values[0]?.[0] as number || 0;
  if (settingsCount === 0) {
    const settings: Record<string, string> = {
      lodge_name: 'BARsha Lodge',
      lodge_tagline: 'Comfortable Stay Near Maa Tara Temple, Tarapith',
      manager_name: 'Subhodip Garai',
      phone_number: '8388957523',
      whatsapp_number: '8388957523',
      email: 'barshalodgetarapith@gmail.com',
      address: 'Tarapith, Near Bharat Sevashram Sangha, Birbhum, West Bengal - 731233',
      hero_title: 'Welcome to Barsha Lodge, Tarapith',
      hero_subtitle: 'Comfortable Stay Near Maa Tara Temple | আনন্দময় ও ভক্তিময় পরিবেশে আপনার নির্ভরযোগ্য আশ্রয়',
      about_text: 'Located just 2 minutes walking distance from Bharat Sevashram Sangha and adjacent to the sacred Maa Tara Mandir in Tarapith, Birbhum, Barsha Lodge offers peaceful, clean, and family-friendly accommodation. Managed personally by Subhodip Garai, we ensure 24/7 running water, hot geysers, generator power backup, fast Wi-Fi, and personalized pilgrim darshan guidance at honest, affordable rates.',
      upi_id: '8649883536@yapl',
      upi_number: '8649883536',
      upi_payee_name: 'Barsha Lodge / Subhodip Garai',
      upi_qr_image: '',
      advance_percent: '30',
      min_advance_amount: '500',
      google_maps_embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3652.887259020468!2d87.6745199!3d24.11667!2m3!1f0!2f0!3f0!3m2!1i1024!2f768!4f13.1!3m3!1m2!1s0x39f977c0dc778a3f%3A0x9597793d25ce46a5!2sTarapith%20Temple!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin',
      google_maps_link: 'https://maps.google.com/?q=Tarapith+Near+Bharat+Sevashram+Sangha+Birbhum+West+Bengal',
      check_in_time: '11:00 AM',
      check_out_time: '10:00 AM',
      custom_domain: 'barshalodgetarapith.com',
      published_url: 'https://ais-pre-55lmvatnmsrph5pgbwl73z-221829813937.asia-east1.run.app'
    };

    for (const [key, value] of Object.entries(settings)) {
      db.run(`INSERT INTO website_settings (key, value) VALUES (?, ?)`, [key, value]);
    }
  }

  // Seed sample initial bookings & customers for realistic dashboard analytics
  const bCheck = db.exec("SELECT COUNT(*) as count FROM bookings");
  const bCount = bCheck[0]?.values[0]?.[0] as number || 0;
  if (bCount === 0) {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const nextWeekEnd = new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0];

    // Customer 1
    db.run(
      `INSERT INTO customers (name, mobile, email, address, total_stays, total_spent, last_booking_id)
       VALUES ('Sourav Banerjee', '9830112233', 'sourav.b@gmail.com', 'Kolkata, West Bengal', 1, 2800, 'BL2026-0001')`
    );
    // Booking 1 (Confirmed, checked in today)
    db.run(
      `INSERT INTO bookings (booking_id, customer_id, room_id, guest_name, mobile_number, email, check_in_date, check_out_date, num_guests, num_rooms, special_requests, price_per_night, total_nights, total_amount, advance_amount, due_amount, status, payment_status, payment_method, transaction_id)
       VALUES ('BL2026-0001', 1, 4, 'Sourav Banerjee', '9830112233', 'sourav.b@gmail.com', ?, ?, 2, 1, 'Early morning temple darshan advice', 1400, 2, 2800, 1000, 1800, 'Confirmed', 'Partially Paid', 'UPI', 'UPI9830112233TXN1')`,
      [today, nextWeek]
    );
    db.run(
      `INSERT INTO payments (booking_id, customer_name, amount, payment_method, transaction_id, payment_status, notes)
       VALUES ('BL2026-0001', 'Sourav Banerjee', 1000, 'UPI', 'UPI9830112233TXN1', 'Partially Paid', 'Advance paid via Google Pay')`
    );

    // Customer 2
    db.run(
      `INSERT INTO customers (name, mobile, email, address, total_stays, total_spent, last_booking_id)
       VALUES ('Amitava Roy', '9434055667', 'amitava.roy@rediffmail.com', 'Durgapur, West Bengal', 1, 1400, 'BL2026-0002')`
    );
    // Booking 2 (Pending)
    db.run(
      `INSERT INTO bookings (booking_id, customer_id, room_id, guest_name, mobile_number, email, check_in_date, check_out_date, num_guests, num_rooms, special_requests, price_per_night, total_nights, total_amount, advance_amount, due_amount, status, payment_status, payment_method, transaction_id)
       VALUES ('BL2026-0002', 2, 2, 'Amitava Roy', '9434055667', 'amitava.roy@rediffmail.com', ?, ?, 1, 1, 'Near reception ground floor room requested', 1400, 1, 1400, 500, 900, 'Pending', 'Partially Paid', 'UPI', 'UPI9434055667TXN2')`,
      [tomorrow, nextWeekEnd]
    );

    // Customer 3
    db.run(
      `INSERT INTO customers (name, mobile, email, address, total_stays, total_spent, last_booking_id)
       VALUES ('Priya Mukherjee', '8910244556', 'priya.m@yahoo.com', 'Bardhaman, West Bengal', 2, 3600, 'BL2026-0003')`
    );
    // Booking 3 (Checked-in)
    db.run(
      `INSERT INTO bookings (booking_id, customer_id, room_id, guest_name, mobile_number, email, check_in_date, check_out_date, num_guests, num_rooms, special_requests, price_per_night, total_nights, total_amount, advance_amount, due_amount, status, payment_status, payment_method, transaction_id)
       VALUES ('BL2026-0003', 3, 5, 'Priya Mukherjee', '8910244556', 'priya.m@yahoo.com', ?, ?, 3, 1, 'Hot water geyser verification before checkin', 1800, 2, 3600, 3600, 0, 'Checked-in', 'Paid', 'UPI', 'UPI8910244556TXN3')`,
      [today, tomorrow]
    );
    db.run(
      `INSERT INTO payments (booking_id, customer_name, amount, payment_method, transaction_id, payment_status, notes)
       VALUES ('BL2026-0003', 'Priya Mukherjee', 3600, 'UPI', 'UPI8910244556TXN3', 'Paid', 'Full payment received via PhonePe')`
    );
  }

  // Ensure critical UPI credentials match official Amazon Pay account: 8649883536@yapl
  try {
    db.run(
      `INSERT INTO website_settings (key, value) VALUES ('upi_id', '8649883536@yapl')
       ON CONFLICT(key) DO UPDATE SET value = '8649883536@yapl' WHERE value LIKE '%@ybl'`
    );
    db.run(
      `INSERT INTO website_settings (key, value) VALUES ('upi_number', '8649883536')
       ON CONFLICT(key) DO UPDATE SET value = '8649883536' WHERE value = '8388957523'`
    );
    db.run(
      `INSERT INTO website_settings (key, value) VALUES ('published_url', 'https://ais-pre-55lmvatnmsrph5pgbwl73z-221829813937.asia-east1.run.app')
       ON CONFLICT(key) DO NOTHING`
    );
    db.run(
      `INSERT INTO website_settings (key, value) VALUES ('custom_domain', 'barshalodgetarapith.com')
       ON CONFLICT(key) DO NOTHING`
    );
  } catch (e) {
    // ignore
  }

  // Ensure default demo user exists: guest@example.com / guest123
  try {
    const userCheck = db.exec("SELECT COUNT(*) as count FROM users WHERE email = 'guest@example.com'");
    const userCount = (userCheck[0]?.values[0]?.[0] as number) || 0;
    if (userCount === 0) {
      const salt = bcrypt.genSaltSync(10);
      const guestHash = bcrypt.hashSync('guest123', salt);
      db.run(
        `INSERT INTO users (name, email, password_hash, phone, role)
         VALUES ('Anirban Ghosh', 'guest@example.com', ?, '9876543210', 'user')`,
        [guestHash]
      );
    }
  } catch (e) {
    // ignore
  }

  // Seed AI Knowledge Base if empty
  try {
    const kbCheck = db.exec("SELECT COUNT(*) as count FROM ai_knowledge_base");
    const kbCount = (kbCheck[0]?.values[0]?.[0] as number) || 0;
    if (kbCount === 0) {
      const defaultKnowledge = [
        {
          category: 'lodge_info',
          topic: 'About Barsha Lodge & Location',
          content: 'Barsha Lodge is a premier pilgrim lodge and hotel in Tarapith, Birbhum, West Bengal (PIN 731233). It is located directly beside the holy Bharat Sevashram Sangha and is just a short 5-7 minute walk (approx. 500 meters) to Maa Tara Temple (Tarapith Mandir) and the sacred Maha Smashan. Manager: Subhodip Garai (+91 8388957523). WhatsApp: +91 8388957523.',
          sort_order: 1
        },
        {
          category: 'rooms',
          topic: 'Rooms, Types & Tariffs',
          content: 'Barsha Lodge offers 7 room categories: 1) Single Bed Room (Non-AC) at ₹700/night for 1 guest; 2) Single Bed AC Room at ₹1,400/night for 1 guest; 3) Double Bed Room (Non-AC) at ₹1,000/night for 2 guests; 4) Double Bed AC Room at ₹1,800/night for 2 guests; 5) Triple Bed Room (Non-AC) at ₹1,500/night for 3 guests; 6) Triple Bed AC Deluxe Room at ₹2,200/night for 3 guests; 7) Four Bed Family Suite (AC) at ₹2,800/night for 4-5 guests. All rooms include clean attached bath, 24/7 hot water geyser, free high-speed Wi-Fi, cable TV, and silent generator power backup.',
          sort_order: 2
        },
        {
          category: 'policies',
          topic: 'Check-in, Check-out & Booking Rules',
          content: 'Standard Check-in time is 11:00 AM; standard Check-out time is 10:00 AM. Early check-in or late check-out is subject to room availability upon request. Valid government photo ID (Aadhaar, Voter ID, Driving License, Passport) is required for all adult guests at check-in. Minimum advance payment of 30% to 50% guarantees the room reservation via official UPI (8649883536@yapl), and the remaining balance is paid at the reception upon check-in.',
          sort_order: 3
        },
        {
          category: 'policies',
          topic: 'Cancellation & Refund Policy',
          content: 'Guests enjoy 100% free cancellation with a full refund of advance payment if cancelled at least 24 hours prior to the check-in date. Cancellations within 24 hours of check-in may incur a 1-night retention charge. To cancel, guests can use the website dashboard or message manager Subhodip Garai on WhatsApp (+91 8388957523).',
          sort_order: 4
        },
        {
          category: 'tarapith_guide',
          topic: 'Maa Tara Temple Timings & Rituals',
          content: 'Tarapith Maa Tara Mandir opens early morning around 6:00 AM with the sacred Mangal Aarti and Snan (holy bathing). Bhog puja and darshan continue through afternoon and evening until Sandhya Aarti and Shayan (approx. 9:00 PM). During auspicious Amavasya, Kaushiki Amavasya, and Tara Jayanti, darshan remains open extended hours. Our lodge staff can assist guests with reliable local panda/shebayet recommendations for puja and bhog coupons.',
          sort_order: 5
        },
        {
          category: 'tarapith_guide',
          topic: 'Local Sightseeing & Holy Attractions',
          content: '1) Maa Tara Temple (500m from lodge); 2) Tarapith Maha Smashan (famous tantric cremation ground of Sadhak Bamakhepa along Dwarka River); 3) Bamakhepa Ashram and Memorial Temple (800m); 4) Mundamali Tala and Dwarka River Ghats; 5) Mallarpur Shiv Mandir (approx. 10 km); 6) Nalhati Nalateshwari Shaktipeeth (approx. 25 km).',
          sort_order: 6
        },
        {
          category: 'transport',
          topic: 'How to Reach Barsha Lodge',
          content: 'By Train: Nearest major railway junction is Rampurhat (Station Code: RPH), just 9 km away from Tarapith. Frequent auto-rickshaws, e-rickshaws (Toto), and taxis are available from Rampurhat Station directly to Barsha Lodge (near Bharat Sevashram Sangha) in 15-20 minutes. By Bus: Tarapith Bus Stand is 600 meters away. By Car: Smooth drive via NH-14 and SH-11.',
          sort_order: 7
        },
        {
          category: 'faqs',
          topic: 'Food, Dining & Amenities FAQs',
          content: 'Hot water geysers operate 24/7. Silent generator power backup automatically switches on during any power cut. Secure car and two-wheeler parking is available on-site for lodge guests. We provide prompt room service with freshly cooked Bengali meals, pure vegetarian thalis, and Tara Ma\'s prasad bhog through trusted local kitchen partners.',
          sort_order: 8
        }
      ];

      for (const item of defaultKnowledge) {
        db.run(
          `INSERT INTO ai_knowledge_base (category, topic, content, sort_order)
           VALUES (?, ?, ?, ?)`,
          [item.category, item.topic, item.content, item.sort_order]
        );
      }
    }
  } catch (e) {
    // ignore
  }
}

// Database helper functions with automatic type conversion
export async function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function runQuery(sql: string, params: any[] = []): Promise<{ changes: number }> {
  const db = await getDb();
  db.run(sql, params);
  saveDb();
  return { changes: db.getRowsModified() };
}

export async function insertAndGetId(sql: string, params: any[] = []): Promise<number> {
  const db = await getDb();
  db.run(sql, params);
  saveDb();
  const res = db.exec("SELECT last_insert_rowid() as id");
  const id = res[0]?.values[0]?.[0] as number;
  return id || 0;
}
