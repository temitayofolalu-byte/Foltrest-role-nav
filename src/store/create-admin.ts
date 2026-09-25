// Creates ONE real admin account for you. No demo data, no fake
// listings, no test accounts — just your actual admin login.
//
// Set these in your .env file before running this:
//   ADMIN_NAME=Your Name
//   ADMIN_EMAIL=you@yourdomain.com
//   ADMIN_PASSWORD=a-real-strong-password
//
// Then run: npm run create-admin

import * as dotenv from 'dotenv';
dotenv.config();
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { StoreService } from './store.service';

async function createAdmin() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error('Missing ADMIN_NAME, ADMIN_EMAIL or ADMIN_PASSWORD in your .env file.');
    console.error('Add all three, then run: npm run create-admin');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  const store = new StoreService();
  const existing = await store.all('users');
  const already = existing.find((u: any) => String(u.email).toLowerCase() === email.toLowerCase());
  if (already) {
    console.log(`An account with ${email} already exists (role: ${already.role}). Nothing created.`);
    process.exit(0);
  }

  await store.insert('users', {
    id: uuid(),
    name,
    email,
    phone: process.env.ADMIN_PHONE || null,
    password: bcrypt.hashSync(password, 12),
    role: 'admin',
    verified: true,
    idDocumentUrl: null,
    passportPhotoUrl: null,
    createdAt: new Date().toISOString(),
  });

  console.log(`Admin account created: ${email}`);
  console.log('You can now log in with this account and use the Admin panel.');
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('Failed to create admin account:', err.message);
  process.exit(1);
});
