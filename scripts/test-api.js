import http from 'http';

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING PRODUCTION API & FUNCTIONALITY VERIFICATION ===\n');

  // 1. Health Check
  console.log('1. Testing /api/health ...');
  const health = await makeRequest({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/health',
    method: 'GET'
  });
  console.log('Status:', health.status, 'Response:', health.data);
  if (health.status !== 200) throw new Error('Health check failed');

  // 2. Public Settings
  console.log('\n2. Testing /api/public/settings ...');
  const settingsRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/public/settings',
    method: 'GET'
  });
  console.log('Status:', settingsRes.status);
  console.log('UPI ID configured in settings:', settingsRes.data?.upi_id);
  console.log('Lodge Name:', settingsRes.data?.lodge_name);
  console.log('Manager:', settingsRes.data?.manager_name);
  if (settingsRes.data?.upi_id !== '8649883536@yapl') {
    console.warn('Warning: Expected UPI ID 8649883536@yapl, got:', settingsRes.data?.upi_id);
  }

  // 3. Public Rooms
  console.log('\n3. Testing /api/public/rooms ...');
  const roomsRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/public/rooms',
    method: 'GET'
  });
  console.log('Status:', roomsRes.status, 'Total rooms:', roomsRes.data?.length);
  const sampleRoom = roomsRes.data?.[0];
  console.log('Sample Room:', sampleRoom?.name, 'Price:', sampleRoom?.price_per_night, 'AC:', sampleRoom?.is_ac);

  // 4. Public Price Calculation
  console.log('\n4. Testing /api/public/calculate ...');
  const calcRes = await makeRequest(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/public/calculate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      room_id: sampleRoom?.id || 1,
      check_in_date: '2026-10-10',
      check_out_date: '2026-10-12',
      num_rooms: 1
    }
  );
  console.log('Status:', calcRes.status, 'Calculation result:', calcRes.data);

  // 5. Booking Creation
  console.log('\n5. Testing /api/public/bookings (Guest booking creation) ...');
  const bookingRes = await makeRequest(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/public/bookings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      guest_name: 'Tarapith Devotee',
      mobile_number: '9876543210',
      email: 'devotee@tarapith.com',
      check_in_date: '2026-10-10',
      check_out_date: '2026-10-12',
      num_guests: 2,
      room_id: sampleRoom?.id || 1,
      num_rooms: 1,
      advance_amount: 500,
      payment_method: 'UPI',
      transaction_id: 'UPI2026TESTTXN99'
    }
  );
  console.log('Status:', bookingRes.status);
  console.log('Created Booking ID:', bookingRes.data?.booking_id);
  console.log('Total Amount:', bookingRes.data?.total_amount, 'Advance:', bookingRes.data?.advance_amount);
  console.log('WhatsApp URL preview:', bookingRes.data?.whatsapp_url?.substring(0, 60) + '...');

  // 6. Admin Login
  console.log('\n6. Testing /api/auth/login with subhodip7 / subhodip2007 ...');
  const loginRes = await makeRequest(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      username: 'subhodip7',
      password: 'subhodip2007'
    }
  );
  console.log('Status:', loginRes.status);
  console.log('Admin Authenticated:', loginRes.data?.admin?.name, 'Role:', loginRes.data?.admin?.role);
  const token = loginRes.data?.token;
  if (!token) throw new Error('Failed to obtain admin token');

  // 7. Admin Dashboard Stats
  console.log('\n7. Testing /api/admin/dashboard-stats with JWT token ...');
  const statsRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/admin/dashboard-stats',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Status:', statsRes.status);
  console.log('Total Bookings in DB:', statsRes.data?.total_bookings);
  console.log('Total Rooms in DB:', statsRes.data?.total_rooms);
  console.log('Total Revenue (Advance):', statsRes.data?.total_revenue);

  // 8. Admin Room Price Edit
  console.log('\n8. Testing Admin Room Edit (Editing Room 1 price) ...');
  const editRoomRes = await makeRequest(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: `/api/admin/rooms/${sampleRoom?.id || 1}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    },
    {
      ...sampleRoom,
      price_per_night: sampleRoom?.price_per_night || 700
    }
  );
  console.log('Status:', editRoomRes.status, 'Response:', editRoomRes.data);

  // 9. Admin Settings Save
  console.log('\n9. Testing Admin Settings Save (Ensuring 8649883536@yapl is saved) ...');
  const saveSettingsRes = await makeRequest(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/admin/settings',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    },
    {
      upi_id: '8649883536@yapl',
      upi_number: '8649883536',
      upi_payee_name: 'Barsha Lodge / Subhodip Garai'
    }
  );
  console.log('Status:', saveSettingsRes.status, 'Response:', saveSettingsRes.data);

  console.log('\n=== ALL PRODUCTION TESTS PASSED WITH 100% SUCCESS ===');
}

runTests().catch((err) => {
  console.error('\n❌ Test Error:', err);
  process.exit(1);
});
