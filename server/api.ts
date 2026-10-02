import express, { type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import {
  queryAll,
  queryOne,
  runQuery,
  insertAndGetId
} from './db.ts';
import {
  requireAdmin,
  requireUser,
  signAdminToken,
  signUserToken,
  checkLoginRateLimit,
  resetLoginRateLimit,
  type AuthRequest
} from './auth.ts';
import { processAIChat, executeCreateReservation } from './aiService.ts';

export const apiRouter = express.Router();

// Helper to log admin actions
async function logAdminAction(action: string, details: string, ip: string = '') {
  try {
    await runQuery(
      `INSERT INTO admin_logs (action, details, ip) VALUES (?, ?, ?)`,
      [action, details, ip]
    );
  } catch (err) {
    console.error('Failed to log admin action:', err);
  }
}

// Generate unique Booking ID like BL2026-0001
async function generateBookingId(): Promise<string> {
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

  const padded = String(nextNum).padStart(4, '0');
  return `${prefix}${padded}`;
}

// ==========================================
// 1. PUBLIC API ROUTES
// ==========================================

// Get Website Settings
apiRouter.get('/public/settings', async (req: Request, res: Response) => {
  try {
    const rows = await queryAll<{ key: string; value: string }>(
      `SELECT key, value FROM website_settings`
    );
    const settings: Record<string, string> = {};
    rows.forEach((r) => {
      settings[r.key] = r.value;
    });
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load website settings' });
  }
});

// Get Public Rooms & Prices
apiRouter.get('/public/rooms', async (req: Request, res: Response) => {
  try {
    const rows = await queryAll(
      `SELECT * FROM rooms ORDER BY is_ac ASC, price_per_night ASC`
    );
    const rooms = rows.map((r: any) => ({
      ...r,
      amenities: typeof r.amenities === 'string' ? JSON.parse(r.amenities || '[]') : r.amenities
    }));
    res.json(rooms);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load rooms' });
  }
});

// Get Public Facilities
apiRouter.get('/public/facilities', async (req: Request, res: Response) => {
  try {
    const rows = await queryAll(
      `SELECT * FROM facilities WHERE is_active = 1 ORDER BY sort_order ASC`
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load facilities' });
  }
});

// Get Public Gallery
apiRouter.get('/public/gallery', async (req: Request, res: Response) => {
  try {
    const rows = await queryAll(
      `SELECT * FROM gallery ORDER BY sort_order ASC, id DESC`
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load gallery' });
  }
});

// Calculate Price & Nights
apiRouter.post('/public/calculate', async (req: Request, res: Response) => {
  try {
    const { room_id, check_in_date, check_out_date, num_rooms = 1 } = req.body;
    if (!room_id || !check_in_date || !check_out_date) {
      return res.status(400).json({ error: 'room_id, check_in_date, and check_out_date are required' });
    }

    const room = await queryOne(`SELECT * FROM rooms WHERE id = ?`, [room_id]);
    if (!room) {
      return res.status(404).json({ error: 'Selected room does not exist' });
    }

    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const diffTime = checkOut.getTime() - checkIn.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const nights = Math.max(1, diffDays > 0 ? diffDays : 1);

    const roomsCount = Math.max(1, parseInt(num_rooms, 10) || 1);
    const pricePerNight = Number(room.price_per_night);
    const totalAmount = pricePerNight * nights * roomsCount;

    // Get settings for advance payment calculation
    const advPercentSetting = await queryOne(
      `SELECT value FROM website_settings WHERE key = 'advance_percent'`
    );
    const advPercent = parseInt(advPercentSetting?.value || '30', 10);
    const minAdvanceSetting = await queryOne(
      `SELECT value FROM website_settings WHERE key = 'min_advance_amount'`
    );
    const minAdvance = parseInt(minAdvanceSetting?.value || '500', 10);

    const calculatedAdvance = Math.round((totalAmount * advPercent) / 100);
    const advanceAmount = Math.max(minAdvance, Math.min(calculatedAdvance, totalAmount));
    const dueAmount = totalAmount - advanceAmount;

    res.json({
      room_name: room.name,
      price_per_night: pricePerNight,
      total_nights: nights,
      num_rooms: roomsCount,
      total_amount: totalAmount,
      advance_amount: advanceAmount,
      due_amount: dueAmount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to calculate price' });
  }
});

// Check Room Availability
apiRouter.get('/public/availability', async (req: Request, res: Response) => {
  try {
    const { room_id, month, year } = req.query;
    // Return all bookings for the specified room or all rooms
    let sql = `SELECT id, booking_id, room_id, check_in_date, check_out_date, status, num_rooms 
               FROM bookings WHERE status IN ('Confirmed', 'Checked-in', 'Pending')`;
    const params: any[] = [];
    if (room_id) {
      sql += ` AND room_id = ?`;
      params.push(room_id);
    }
    const bookings = await queryAll(sql, params);
    res.json({ bookings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch availability' });
  }
});

// Create Customer Booking
apiRouter.post('/public/bookings', async (req: Request, res: Response) => {
  try {
    const {
      guest_name,
      mobile_number,
      email = '',
      check_in_date,
      check_out_date,
      num_guests = 1,
      room_id,
      num_rooms = 1,
      special_requests = '',
      advance_amount: customAdvance,
      payment_method = 'UPI',
      transaction_id = ''
    } = req.body;

    // Validate inputs
    if (!guest_name || !guest_name.trim()) {
      return res.status(400).json({ error: 'Guest name is required' });
    }
    const cleanMobile = (mobile_number || '').replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
    }
    if (!check_in_date || !check_out_date) {
      return res.status(400).json({ error: 'Check-in and check-out dates are required' });
    }

    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    if (checkOut <= checkIn) {
      return res.status(400).json({ error: 'Check-out date must be strictly after check-in date.' });
    }

    const room = await queryOne(`SELECT * FROM rooms WHERE id = ?`, [room_id]);
    if (!room) {
      return res.status(404).json({ error: 'Selected room category not found' });
    }

    // Double-booking prevention
    const overlap = await queryOne(
      `SELECT COUNT(*) as count FROM bookings 
       WHERE room_id = ? 
         AND status IN ('Confirmed', 'Checked-in', 'Pending') 
         AND NOT (check_out_date <= ? OR check_in_date >= ?)`,
      [room_id, check_in_date, check_out_date]
    );

    if (overlap && overlap.count > 0) {
      return res.status(409).json({
        error: `Sorry, this room is already reserved for the selected dates (${check_in_date} to ${check_out_date}). Please choose another room or different dates.`
      });
    }

    const diffTime = checkOut.getTime() - checkIn.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalNights = Math.max(1, diffDays > 0 ? diffDays : 1);

    const roomsCount = Math.max(1, parseInt(num_rooms, 10) || 1);
    const pricePerNight = Number(room.price_per_night);
    const totalAmount = pricePerNight * totalNights * roomsCount;

    let advanceAmount = Number(customAdvance) || Math.round(totalAmount * 0.3);
    if (advanceAmount > totalAmount) advanceAmount = totalAmount;
    if (advanceAmount < 0) advanceAmount = 0;
    const dueAmount = totalAmount - advanceAmount;

    // Auto payment status
    let paymentStatus = 'Pending';
    if (transaction_id && transaction_id.trim()) {
      paymentStatus = advanceAmount >= totalAmount ? 'Paid' : 'Partially Paid';
    }

    const bookingId = await generateBookingId();

    // 1. Get or Create Customer
    let customer = await queryOne<{ id: number; total_stays: number; total_spent: number }>(
      `SELECT id, total_stays, total_spent FROM customers WHERE mobile = ?`,
      [cleanMobile]
    );

    let customerId: number;
    if (customer) {
      customerId = customer.id;
      await runQuery(
        `UPDATE customers SET 
           name = ?, 
           email = COALESCE(NULLIF(?, ''), email), 
           total_stays = total_stays + 1, 
           total_spent = total_spent + ?, 
           last_booking_id = ? 
         WHERE id = ?`,
        [guest_name.trim(), email.trim(), totalAmount, bookingId, customerId]
      );
    } else {
      customerId = await insertAndGetId(
        `INSERT INTO customers (name, mobile, email, total_stays, total_spent, last_booking_id)
         VALUES (?, ?, ?, 1, ?, ?)`,
        [guest_name.trim(), cleanMobile, email.trim(), totalAmount, bookingId]
      );
    }

    // 2. Insert Booking
    const insertBookingSql = `
      INSERT INTO bookings (
        booking_id, customer_id, room_id, guest_name, mobile_number, email,
        check_in_date, check_out_date, num_guests, num_rooms, special_requests,
        price_per_night, total_nights, total_amount, advance_amount, due_amount,
        status, payment_status, payment_method, transaction_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)
    `;

    const newBookingDbId = await insertAndGetId(insertBookingSql, [
      bookingId,
      customerId,
      room.id,
      guest_name.trim(),
      cleanMobile,
      email.trim(),
      check_in_date,
      check_out_date,
      parseInt(num_guests, 10) || 1,
      roomsCount,
      special_requests.trim(),
      pricePerNight,
      totalNights,
      totalAmount,
      advanceAmount,
      dueAmount,
      paymentStatus,
      payment_method,
      transaction_id.trim()
    ]);

    // 3. Insert Payment record if transaction_id provided or advance paid
    if (advanceAmount > 0 && transaction_id.trim()) {
      await runQuery(
        `INSERT INTO payments (booking_id, customer_name, amount, payment_method, transaction_id, payment_status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          bookingId,
          guest_name.trim(),
          advanceAmount,
          payment_method,
          transaction_id.trim(),
          paymentStatus,
          'Advance payment submitted during booking'
        ]
      );
    }

    // 4. Generate formatted WhatsApp text
    const whatsappMessage = `*Barsha Lodge Booking*
Booking ID: ${bookingId}
Guest Name: ${guest_name.trim()}
Mobile: ${cleanMobile}
Room: ${room.name} (${room.is_ac ? 'AC' : 'Non-AC'})
Check-in: ${check_in_date}
Check-out: ${check_out_date}
Nights: ${totalNights}
Guests: ${num_guests}
Number of Rooms: ${roomsCount}
Total Amount: ₹${totalAmount.toLocaleString('en-IN')}
Advance: ₹${advanceAmount.toLocaleString('en-IN')}
Due: ₹${dueAmount.toLocaleString('en-IN')}${transaction_id ? `\nTransaction ID: ${transaction_id}` : ''}${special_requests ? `\nNote: ${special_requests}` : ''}
Location: Tarapith, Near Bharat Sevashram Sangha
Manager: Subhodip Garai (8388957523)`;

    const whatsappNumberSetting = await queryOne(
      `SELECT value FROM website_settings WHERE key = 'whatsapp_number'`
    );
    const waNumber = whatsappNumberSetting?.value || '8388957523';
    const cleanWaNumber = waNumber.replace(/\D/g, '');
    const waFullNumber = cleanWaNumber.startsWith('91') ? cleanWaNumber : `91${cleanWaNumber}`;
    const whatsappUrl = `https://wa.me/${waFullNumber}?text=${encodeURIComponent(whatsappMessage)}`;

    res.status(201).json({
      success: true,
      booking_id: bookingId,
      id: newBookingDbId,
      guest_name: guest_name.trim(),
      mobile_number: cleanMobile,
      room_name: room.name,
      check_in_date,
      check_out_date,
      total_nights: totalNights,
      total_amount: totalAmount,
      advance_amount: advanceAmount,
      due_amount: dueAmount,
      status: 'Pending',
      payment_status: paymentStatus,
      whatsapp_message: whatsappMessage,
      whatsapp_url: whatsappUrl
    });
  } catch (err: any) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: err.message || 'Failed to create booking' });
  }
});

// Lookup Booking by ID or Mobile
apiRouter.get('/public/booking/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await queryOne(
      `SELECT b.*, r.name as room_name, r.is_ac, r.bed_type, r.image_url as room_image
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       WHERE b.booking_id = ? OR b.mobile_number = ?
       ORDER BY b.id DESC LIMIT 1`,
      [id, id]
    );

    if (!booking) {
      return res.status(404).json({ error: 'No booking found with this ID or Mobile number' });
    }

    res.json(booking);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to lookup booking' });
  }
});

// ==========================================
// 2. ADMIN AUTHENTICATION
// ==========================================

// Login endpoint with rate limiting & bcrypt verification
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown_ip';
    if (!checkLoginRateLimit(ip)) {
      return res.status(429).json({
        error: 'Too many failed login attempts. Please wait 15 minutes before retrying.'
      });
    }

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = await queryOne<{
      id: number;
      username: string;
      password_hash: string;
      name: string;
      role: string;
    }>(`SELECT * FROM admins WHERE username = ?`, [username.trim()]);

    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = bcrypt.compareSync(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Success: reset rate limit & issue token
    resetLoginRateLimit(ip);
    const token = signAdminToken({
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role
    });

    await logAdminAction('Admin Login', `Admin ${admin.username} logged in successfully`, ip);

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Admin Me
apiRouter.get('/auth/me', requireAdmin, async (req: AuthRequest, res: Response) => {
  res.json({ admin: req.admin });
});

// Change Admin Password
apiRouter.post('/auth/change-password', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const admin = await queryOne(`SELECT * FROM admins WHERE id = ?`, [req.admin?.id]);
    if (!admin) {
      return res.status(404).json({ error: 'Admin account not found' });
    }

    const isMatch = bcrypt.compareSync(currentPassword, admin.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);
    await runQuery(`UPDATE admins SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
      newHash,
      req.admin?.id
    ]);

    await logAdminAction('Password Changed', `Admin ${req.admin?.username} updated password`);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update password' });
  }
});

// ==========================================
// 2B. GUEST / USER AUTHENTICATION & PORTAL
// ==========================================

// Register Guest User
apiRouter.post('/auth/user/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone = '' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const cleanPhone = phone.replace(/\D/g, '');

    const userId = await insertAndGetId(
      `INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, 'user')`,
      [name.trim(), cleanEmail, hash, cleanPhone]
    );

    const token = signUserToken({
      id: userId,
      email: cleanEmail,
      name: name.trim(),
      role: 'user'
    });

    res.status(201).json({
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        role: 'user'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to register account' });
  }
});

// Login Guest User
apiRouter.post('/auth/user/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const cleanEmail = email.toLowerCase().trim();
    const user = await queryOne<{
      id: number;
      name: string;
      email: string;
      password_hash: string;
      phone: string;
      role: string;
    }>('SELECT * FROM users WHERE email = ?', [cleanEmail]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signUserToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user'
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role || 'user'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to log in' });
  }
});

// Guest User Profile
apiRouter.get('/auth/user/profile', requireUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const user = await queryOne('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Stats
    const bookings = await queryAll(
      `SELECT COUNT(*) as total_bookings, SUM(total_amount) as total_spent 
       FROM bookings WHERE email = ? OR (mobile_number = ? AND ? != '')`,
      [user.email, user.phone, user.phone || '']
    );

    res.json({
      user,
      stats: {
        total_bookings: bookings[0]?.total_bookings || 0,
        total_spent: bookings[0]?.total_spent || 0
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load profile' });
  }
});

// Update Guest User Profile
apiRouter.put('/auth/user/profile', requireUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, phone } = req.body;
    await runQuery('UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      name.trim(),
      (phone || '').replace(/\D/g, ''),
      userId
    ]);
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update profile' });
  }
});

// Forgot Password
apiRouter.post('/auth/user/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    const cleanEmail = email.toLowerCase().trim();
    const user = await queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (!user) {
      return res.json({ success: true, message: 'If this email is registered, password reset instructions have been dispatched.' });
    }

    const resetToken = Math.random().toString(36).substring(2, 8).toUpperCase();
    await runQuery(
      `UPDATE users SET reset_token = ?, reset_expires = datetime('now', '+1 hour') WHERE id = ?`,
      [resetToken, user.id]
    );

    res.json({
      success: true,
      message: 'Reset token generated successfully.',
      demo_reset_code: resetToken
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process request' });
  }
});

// Reset Password with Token
apiRouter.post('/auth/user/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'Email, reset code, and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await queryOne('SELECT id, reset_token FROM users WHERE email = ?', [cleanEmail]);
    if (!user || user.reset_token !== token.trim()) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);
    await runQuery(
      `UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [hash, user.id]
    );

    res.json({ success: true, message: 'Password reset successfully! You can now log in.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reset password' });
  }
});

// Guest User Bookings List
apiRouter.get('/user/bookings', requireUser, async (req: AuthRequest, res: Response) => {
  try {
    const userEmail = req.user?.email;
    const user = await queryOne('SELECT phone FROM users WHERE id = ?', [req.user?.id]);
    const userPhone = user?.phone || '';

    const bookings = await queryAll(
      `SELECT b.*, r.name as room_name, r.is_ac, r.image_url as room_image
       FROM bookings b
       LEFT JOIN rooms r ON b.room_id = r.id
       WHERE b.email = ? OR (b.mobile_number = ? AND ? != '')
       ORDER BY b.id DESC`,
      [userEmail, userPhone, userPhone]
    );
    res.json({ bookings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load bookings' });
  }
});

// Guest User Cancel Booking Request
apiRouter.post('/user/bookings/:id/cancel', requireUser, async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = req.params.id;
    const userEmail = req.user?.email;
    const booking = await queryOne('SELECT * FROM bookings WHERE id = ? OR booking_id = ?', [bookingId, bookingId]);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.email !== userEmail) {
      return res.status(403).json({ error: 'You are not authorized to cancel this reservation' });
    }
    if (booking.status === 'Checked-in' || booking.status === 'Checked-out') {
      return res.status(400).json({ error: 'Active or completed stays cannot be cancelled online' });
    }

    await runQuery(`UPDATE bookings SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [booking.id]);
    res.json({ success: true, message: 'Booking reservation has been cancelled.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to cancel booking' });
  }
});

// ==========================================
// 2C. BARSHA AI – BOOKING ASSISTANT ENDPOINT
// ==========================================
apiRouter.post('/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, conversationHistory = [], guestName, guestPhone, guestEmail } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const aiResult = await processAIChat({
      message: message.trim(),
      conversationHistory,
      guestName,
      guestPhone,
      guestEmail
    });

    res.json(aiResult);
  } catch (err: any) {
    console.error('AI chat endpoint error:', err);
    res.status(500).json({
      error: 'AI service temporarily unavailable',
      reply: 'Namaste! Our concierge is currently assisting other guests. You can also reach our manager Subhodip Garai directly at +91 8388957523.'
    });
  }
});

apiRouter.post('/ai/confirm-booking', async (req: Request, res: Response) => {
  try {
    const {
      guest_name,
      mobile_number,
      email,
      room_name_or_id,
      check_in_date,
      check_out_date,
      num_guests,
      num_rooms,
      special_requests
    } = req.body;

    if (!guest_name || !mobile_number || !room_name_or_id || !check_in_date || !check_out_date) {
      return res.status(400).json({ error: 'Missing required booking details.' });
    }

    const result = await executeCreateReservation({
      guest_name,
      mobile_number,
      email,
      room_name_or_id,
      check_in_date,
      check_out_date,
      num_guests: num_guests || 1,
      num_rooms: num_rooms || 1,
      special_requests: special_requests || 'Confirmed via Barsha AI'
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to create booking' });
    }

    res.json(result);
  } catch (err: any) {
    console.error('Confirm booking error:', err);
    res.status(500).json({ error: err.message || 'Failed to confirm booking' });
  }
});

// ==========================================
// 2D. AI KNOWLEDGE BASE MANAGEMENT
// ==========================================
apiRouter.get('/public/knowledge-base', async (_req: Request, res: Response) => {
  try {
    const rows = await queryAll('SELECT id, category, topic, content, sort_order FROM ai_knowledge_base ORDER BY sort_order ASC, id ASC');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load knowledge base' });
  }
});

apiRouter.get('/admin/knowledge-base', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await queryAll('SELECT * FROM ai_knowledge_base ORDER BY sort_order ASC, id ASC');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load knowledge base' });
  }
});

apiRouter.post('/admin/knowledge-base', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { category, topic, content, sort_order = 0 } = req.body;
    if (!category || !topic || !content) {
      return res.status(400).json({ error: 'Category, topic, and content are required' });
    }
    const id = await insertAndGetId(
      `INSERT INTO ai_knowledge_base (category, topic, content, sort_order) VALUES (?, ?, ?, ?)`,
      [category.trim(), topic.trim(), content.trim(), Number(sort_order) || 0]
    );
    res.status(201).json({ success: true, id, message: 'Knowledge article created' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create knowledge entry' });
  }
});

apiRouter.put('/admin/knowledge-base/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const { category, topic, content, sort_order } = req.body;
    await runQuery(
      `UPDATE ai_knowledge_base SET category = ?, topic = ?, content = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [category.trim(), topic.trim(), content.trim(), Number(sort_order) || 0, id]
    );
    res.json({ success: true, message: 'Knowledge article updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update knowledge entry' });
  }
});

apiRouter.delete('/admin/knowledge-base/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    await runQuery(`DELETE FROM ai_knowledge_base WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Knowledge article deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete knowledge entry' });
  }
});

// ==========================================
// 3. ADMIN DASHBOARD & MANAGEMENT
// ==========================================

// Dashboard Statistics & Analytics
apiRouter.get('/admin/dashboard-stats', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Counts
    const totalBookingsRow = await queryOne(`SELECT COUNT(*) as count FROM bookings`);
    const todayCheckinsRow = await queryOne(
      `SELECT COUNT(*) as count FROM bookings WHERE check_in_date = ? AND status != 'Cancelled'`,
      [today]
    );
    const todayCheckoutsRow = await queryOne(
      `SELECT COUNT(*) as count FROM bookings WHERE check_out_date = ? AND status != 'Cancelled'`,
      [today]
    );
    const pendingBookingsRow = await queryOne(
      `SELECT COUNT(*) as count FROM bookings WHERE status = 'Pending'`
    );
    const confirmedBookingsRow = await queryOne(
      `SELECT COUNT(*) as count FROM bookings WHERE status = 'Confirmed'`
    );
    const cancelledBookingsRow = await queryOne(
      `SELECT COUNT(*) as count FROM bookings WHERE status = 'Cancelled'`
    );

    // Rooms stats
    const totalRoomsRow = await queryOne(`SELECT COUNT(*) as count FROM rooms`);
    const occupiedRoomsRow = await queryOne(
      `SELECT COUNT(*) as count FROM rooms WHERE status IN ('Occupied', 'Booked')`
    );
    const totalRooms = totalRoomsRow?.count || 0;
    const occupiedRooms = occupiedRoomsRow?.count || 0;
    const availableRooms = Math.max(0, totalRooms - occupiedRooms);

    // Revenue stats
    const revenueRow = await queryOne(
      `SELECT SUM(advance_amount) as advance, SUM(total_amount) as total FROM bookings WHERE status != 'Cancelled'`
    );
    const totalRevenue = revenueRow?.advance || 0;

    const pendingPaymentsRow = await queryOne(
      `SELECT SUM(due_amount) as due FROM bookings WHERE status != 'Cancelled' AND payment_status != 'Paid'`
    );
    const pendingPayments = pendingPaymentsRow?.due || 0;

    // Recent Bookings
    const recentBookings = await queryAll(
      `SELECT b.*, r.name as room_name, r.is_ac
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       ORDER BY b.id DESC LIMIT 8`
    );

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    res.json({
      total_bookings: totalBookingsRow?.count || 0,
      today_checkins: todayCheckinsRow?.count || 0,
      today_checkouts: todayCheckoutsRow?.count || 0,
      pending_bookings: pendingBookingsRow?.count || 0,
      confirmed_bookings: confirmedBookingsRow?.count || 0,
      cancelled_bookings: cancelledBookingsRow?.count || 0,
      total_rooms: totalRooms,
      available_rooms: availableRooms,
      occupied_rooms: occupiedRooms,
      total_revenue: totalRevenue,
      pending_payments: pendingPayments,
      occupancy_rate: occupancyRate,
      recent_bookings: recentBookings
    });
  } catch (err: any) {
    console.error('Failed to get dashboard stats:', err);
    res.status(500).json({ error: err.message || 'Failed to load dashboard statistics' });
  }
});

// Bookings List & Filter
apiRouter.get('/admin/bookings', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, room_id, check_in_from, check_in_to } = req.query;
    let sql = `
      SELECT b.*, r.name as room_name, r.is_ac, r.bed_type, r.room_number
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ` AND (b.booking_id LIKE ? OR b.guest_name LIKE ? OR b.mobile_number LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (status && status !== 'all') {
      sql += ` AND b.status = ?`;
      params.push(status);
    }
    if (room_id && room_id !== 'all') {
      sql += ` AND b.room_id = ?`;
      params.push(room_id);
    }
    if (check_in_from) {
      sql += ` AND b.check_in_date >= ?`;
      params.push(check_in_from);
    }
    if (check_in_to) {
      sql += ` AND b.check_in_date <= ?`;
      params.push(check_in_to);
    }

    sql += ` ORDER BY b.id DESC`;
    const rows = await queryAll(sql, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch bookings' });
  }
});

// Admin Create Booking
apiRouter.post('/admin/bookings', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      guest_name,
      mobile_number,
      email = '',
      room_id,
      check_in_date,
      check_out_date,
      num_guests = 1,
      num_rooms = 1,
      total_amount,
      advance_amount = 0,
      status = 'Confirmed',
      payment_status = 'Pending',
      payment_method = 'Cash',
      transaction_id = '',
      special_requests = ''
    } = req.body;

    const room = await queryOne(`SELECT * FROM rooms WHERE id = ?`, [room_id]);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const bookingId = await generateBookingId();
    const totAmount = Number(total_amount) || Number(room.price_per_night);
    const advAmount = Number(advance_amount) || 0;
    const dueAmount = Math.max(0, totAmount - advAmount);

    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const diffDays = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24));
    const totalNights = Math.max(1, diffDays > 0 ? diffDays : 1);

    // Customer
    let customer = await queryOne<{ id: number }>(`SELECT id FROM customers WHERE mobile = ?`, [mobile_number]);
    let customerId: number;
    if (customer) {
      customerId = customer.id;
    } else {
      customerId = await insertAndGetId(
        `INSERT INTO customers (name, mobile, email, total_stays, total_spent, last_booking_id)
         VALUES (?, ?, ?, 1, ?, ?)`,
        [guest_name, mobile_number, email, totAmount, bookingId]
      );
    }

    const newId = await insertAndGetId(
      `INSERT INTO bookings (
        booking_id, customer_id, room_id, guest_name, mobile_number, email,
        check_in_date, check_out_date, num_guests, num_rooms, special_requests,
        price_per_night, total_nights, total_amount, advance_amount, due_amount,
        status, payment_status, payment_method, transaction_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingId,
        customerId,
        room_id,
        guest_name,
        mobile_number,
        email,
        check_in_date,
        check_out_date,
        num_guests,
        num_rooms,
        special_requests,
        room.price_per_night,
        totalNights,
        totAmount,
        advAmount,
        dueAmount,
        status,
        payment_status,
        payment_method,
        transaction_id
      ]
    );

    await logAdminAction('Create Booking', `Admin created booking ${bookingId} for ${guest_name}`);
    res.status(201).json({ success: true, booking_id: bookingId, id: newId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create booking' });
  }
});

// Update Booking Status & Details
apiRouter.put('/admin/bookings/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      status,
      payment_status,
      advance_amount,
      due_amount,
      special_requests,
      check_in_date,
      check_out_date,
      room_id
    } = req.body;

    const existing = await queryOne(`SELECT * FROM bookings WHERE id = ?`, [id]);
    if (!existing) return res.status(404).json({ error: 'Booking not found' });

    let sql = `UPDATE bookings SET updated_at = CURRENT_TIMESTAMP`;
    const params: any[] = [];

    if (status !== undefined) {
      sql += `, status = ?`;
      params.push(status);
    }
    if (payment_status !== undefined) {
      sql += `, payment_status = ?`;
      params.push(payment_status);
    }
    if (advance_amount !== undefined) {
      sql += `, advance_amount = ?`;
      params.push(advance_amount);
    }
    if (due_amount !== undefined) {
      sql += `, due_amount = ?`;
      params.push(due_amount);
    }
    if (special_requests !== undefined) {
      sql += `, special_requests = ?`;
      params.push(special_requests);
    }
    if (check_in_date !== undefined) {
      sql += `, check_in_date = ?`;
      params.push(check_in_date);
    }
    if (check_out_date !== undefined) {
      sql += `, check_out_date = ?`;
      params.push(check_out_date);
    }
    if (room_id !== undefined) {
      sql += `, room_id = ?`;
      params.push(room_id);
    }

    sql += ` WHERE id = ?`;
    params.push(id);

    await runQuery(sql, params);

    // If status changed to Checked-in, optionally update room status
    if (status === 'Checked-in' && existing.room_id) {
      await runQuery(`UPDATE rooms SET status = 'Occupied' WHERE id = ?`, [existing.room_id]);
    } else if (status === 'Checked-out' && existing.room_id) {
      await runQuery(`UPDATE rooms SET status = 'Available' WHERE id = ?`, [existing.room_id]);
    }

    await logAdminAction(
      'Update Booking',
      `Admin updated booking ${existing.booking_id} status to ${status || existing.status}`
    );

    res.json({ success: true, message: 'Booking updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update booking' });
  }
});

// Delete Booking
apiRouter.delete('/admin/bookings/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await queryOne<{ booking_id: string }>(`SELECT booking_id FROM bookings WHERE id = ?`, [id]);
    if (!existing) return res.status(404).json({ error: 'Booking not found' });

    await runQuery(`DELETE FROM bookings WHERE id = ?`, [id]);
    await logAdminAction('Delete Booking', `Admin deleted booking ${existing.booking_id}`);
    res.json({ success: true, message: 'Booking deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete booking' });
  }
});

// Customers Management
apiRouter.get('/admin/customers', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    let sql = `SELECT * FROM customers`;
    const params: any[] = [];
    if (search) {
      sql += ` WHERE name LIKE ? OR mobile LIKE ? OR last_booking_id LIKE ?`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    sql += ` ORDER BY id DESC`;
    const rows = await queryAll(sql, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load customers' });
  }
});

// Rooms Management
apiRouter.get('/admin/rooms', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await queryAll(`SELECT * FROM rooms ORDER BY room_number ASC`);
    const rooms = rows.map((r: any) => ({
      ...r,
      amenities: typeof r.amenities === 'string' ? JSON.parse(r.amenities || '[]') : r.amenities
    }));
    res.json(rooms);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load rooms' });
  }
});

apiRouter.post('/admin/rooms', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      room_number,
      type,
      is_ac = 0,
      bed_type,
      price_per_night,
      capacity = 2,
      amenities = [],
      status = 'Available',
      image_url,
      description
    } = req.body;

    const newId = await insertAndGetId(
      `INSERT INTO rooms (name, room_number, type, is_ac, bed_type, price_per_night, capacity, amenities, status, image_url, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        room_number,
        type,
        is_ac ? 1 : 0,
        bed_type,
        price_per_night,
        capacity,
        JSON.stringify(amenities),
        status,
        image_url,
        description
      ]
    );

    await logAdminAction('Add Room', `Admin added room ${room_number} (${name})`);
    res.status(201).json({ success: true, id: newId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add room' });
  }
});

apiRouter.put('/admin/rooms/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      room_number,
      type,
      is_ac,
      bed_type,
      price_per_night,
      capacity,
      amenities,
      status,
      image_url,
      description
    } = req.body;

    await runQuery(
      `UPDATE rooms SET 
         name = ?, room_number = ?, type = ?, is_ac = ?, bed_type = ?,
         price_per_night = ?, capacity = ?, amenities = ?, status = ?,
         image_url = ?, description = ?
       WHERE id = ?`,
      [
        name,
        room_number,
        type,
        is_ac ? 1 : 0,
        bed_type,
        price_per_night,
        capacity,
        JSON.stringify(amenities),
        status,
        image_url,
        description,
        id
      ]
    );

    await logAdminAction('Edit Room', `Admin updated room ID ${id}`);
    res.json({ success: true, message: 'Room updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update room' });
  }
});

apiRouter.delete('/admin/rooms/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await runQuery(`DELETE FROM rooms WHERE id = ?`, [id]);
    await logAdminAction('Delete Room', `Admin deleted room ID ${id}`);
    res.json({ success: true, message: 'Room deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete room' });
  }
});

// Payments Management
apiRouter.get('/admin/payments', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await queryAll(`SELECT * FROM payments ORDER BY id DESC`);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch payments' });
  }
});

apiRouter.put('/admin/payments/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { payment_status, transaction_id, notes, amount } = req.body;
    await runQuery(
      `UPDATE payments SET payment_status = ?, transaction_id = ?, notes = ?, amount = ? WHERE id = ?`,
      [payment_status, transaction_id, notes, amount, id]
    );
    res.json({ success: true, message: 'Payment record updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update payment' });
  }
});

// Gallery Management
apiRouter.get('/admin/gallery', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await queryAll(`SELECT * FROM gallery ORDER BY sort_order ASC, id DESC`);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load gallery' });
  }
});

apiRouter.post('/admin/gallery', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, category = 'Lodge', image_url, sort_order = 0, caption = '' } = req.body;
    if (!title || !image_url) {
      return res.status(400).json({ error: 'Title and image URL are required' });
    }
    const newId = await insertAndGetId(
      `INSERT INTO gallery (title, category, image_url, sort_order, caption) VALUES (?, ?, ?, ?, ?)`,
      [title, category, image_url, sort_order, caption]
    );
    await logAdminAction('Add Gallery Image', `Admin added image "${title}"`);
    res.status(201).json({ success: true, id: newId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add image' });
  }
});

apiRouter.delete('/admin/gallery/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await runQuery(`DELETE FROM gallery WHERE id = ?`, [id]);
    await logAdminAction('Delete Gallery Image', `Admin deleted image ID ${id}`);
    res.json({ success: true, message: 'Image deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete image' });
  }
});

// Facilities Management
apiRouter.get('/admin/facilities', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await queryAll(`SELECT * FROM facilities ORDER BY sort_order ASC`);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load facilities' });
  }
});

apiRouter.post('/admin/facilities', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description = '', icon = 'CheckCircle', is_active = 1, sort_order = 0 } = req.body;
    const newId = await insertAndGetId(
      `INSERT INTO facilities (name, description, icon, is_active, sort_order) VALUES (?, ?, ?, ?, ?)`,
      [name, description, icon, is_active ? 1 : 0, sort_order]
    );
    res.status(201).json({ success: true, id: newId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add facility' });
  }
});

apiRouter.put('/admin/facilities/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, icon, is_active, sort_order } = req.body;
    await runQuery(
      `UPDATE facilities SET name = ?, description = ?, icon = ?, is_active = ?, sort_order = ? WHERE id = ?`,
      [name, description, icon, is_active ? 1 : 0, sort_order, id]
    );
    res.json({ success: true, message: 'Facility updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update facility' });
  }
});

apiRouter.delete('/admin/facilities/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await runQuery(`DELETE FROM facilities WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Facility deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete facility' });
  }
});

// Settings Management
apiRouter.get('/admin/settings', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await queryAll<{ key: string; value: string }>(`SELECT key, value FROM website_settings`);
    const settings: Record<string, string> = {};
    rows.forEach((r) => (settings[r.key] = r.value));
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch settings' });
  }
});

apiRouter.put('/admin/settings', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const updates: Record<string, string> = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await runQuery(
        `INSERT INTO website_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        [key, String(value)]
      );
    }
    await logAdminAction('Update Website Settings', 'Admin updated website content and configuration');
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save settings' });
  }
});

// Reports Generation
apiRouter.get('/admin/reports', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { from_date, to_date } = req.query;
    let dateFilter = '';
    const params: any[] = [];
    if (from_date && to_date) {
      dateFilter = ' WHERE check_in_date BETWEEN ? AND ?';
      params.push(from_date, to_date);
    }

    const bookings = await queryAll(
      `SELECT b.*, r.name as room_name, r.is_ac 
       FROM bookings b 
       JOIN rooms r ON b.room_id = r.id 
       ${dateFilter} 
       ORDER BY b.check_in_date DESC`,
      params
    );

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.status !== 'Cancelled' ? Number(b.advance_amount || 0) : 0), 0);
    const totalGross = bookings.reduce((sum, b) => sum + (b.status !== 'Cancelled' ? Number(b.total_amount || 0) : 0), 0);
    const totalDue = bookings.reduce((sum, b) => sum + (b.status !== 'Cancelled' ? Number(b.due_amount || 0) : 0), 0);
    const cancelledCount = bookings.filter((b) => b.status === 'Cancelled').length;
    const confirmedCount = bookings.filter((b) => b.status === 'Confirmed' || b.status === 'Checked-in' || b.status === 'Checked-out').length;

    res.json({
      summary: {
        total_bookings: totalBookings,
        confirmed_count: confirmedCount,
        cancelled_count: cancelledCount,
        collected_revenue: totalRevenue,
        gross_booking_value: totalGross,
        pending_due_amount: totalDue
      },
      bookings
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate report' });
  }
});

// Admin Logs
apiRouter.get('/admin/logs', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await queryAll(`SELECT * FROM admin_logs ORDER BY id DESC LIMIT 50`);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch logs' });
  }
});
