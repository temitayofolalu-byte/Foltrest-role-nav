import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { randomBytes, createHash } from 'crypto';
import { StoreService } from '../store/store.service';
import { JWT_SECRET } from '../common/guards/auth.guard';

@Injectable()
export class AuthService {
  constructor(private store: StoreService) {}
  async register(body: any) {
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const password = String(body.password || '');
    const role = body.role;
    const { idDocumentUrl, passportPhotoUrl } = body;
    if (!name || !email || !password || !role) throw new BadRequestException('name, email, password and role are required');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new BadRequestException('Enter a valid email address');
    if (password.length < 8) throw new BadRequestException('Password must be at least 8 characters');
    if (!['agent', 'renter'].includes(role)) throw new BadRequestException('role must be agent or renter');
    if (role === 'agent' && (!idDocumentUrl || !passportPhotoUrl)) throw new BadRequestException('Agents must provide a valid ID document and a passport photograph before registering.');
    const users = await this.store.all('users');
    if (users.some(u => String(u.email).toLowerCase() === email)) throw new ConflictException('Email already registered');
    const user = { id: uuid(), name, email, phone, password: bcrypt.hashSync(password, 12), role, verified: role === 'renter', idDocumentUrl: idDocumentUrl || null, passportPhotoUrl: passportPhotoUrl || null, emailVerified: false, createdAt: new Date().toISOString() };
    await this.store.insert('users', user);
    await this.sendVerificationEmail(user);
    return this.issueToken(user);
  }

  private async sendVerificationEmail(user: any) {
    const raw = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(raw).digest('hex');
    await this.store.update('users', user.id, { emailVerificationTokenHash: hash, emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() });
    const origin = (process.env.FRONTEND_ORIGIN || 'http://localhost:4000').replace(/\/$/, '');
    const verifyUrl = `${origin}/auth.html?verify=${raw}`;
    if (process.env.RESEND_API_KEY) {
      try {
        const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL || 'Foltrest <onboarding@resend.dev>', to: [user.email], subject: 'Verify your Foltrest email', html: `<p>Welcome to Foltrest! Please verify your email within 24 hours.</p><p><a href="${verifyUrl}">Verify my email</a></p>` }) });
        if (!res.ok) {
          console.error(`[Foltrest] Verification email FAILED (status ${res.status}): ${await res.text()}`);
          console.log(`[Foltrest] Fallback -- verification URL for ${user.email}: ${verifyUrl}`);
        } else {
          console.log(`[Foltrest] Verification email sent to ${user.email} via Resend.`);
        }
      } catch (err: any) {
        console.error(`[Foltrest] Verification email request threw an error: ${err.message}`);
        console.log(`[Foltrest] Fallback -- verification URL for ${user.email}: ${verifyUrl}`);
      }
    } else {
      console.log(`[Foltrest] Verification URL for ${user.email}: ${verifyUrl}`);
    }
  }

  async verifyEmail(token: string) {
    const hash = createHash('sha256').update(String(token || '')).digest('hex');
    const users = await this.store.all('users');
    const user = users.find(u => u.emailVerificationTokenHash === hash && u.emailVerificationExpiresAt && new Date(u.emailVerificationExpiresAt).getTime() > Date.now());
    if (!user) throw new BadRequestException('Verification link is invalid or expired');
    await this.store.update('users', user.id, { emailVerified: true, emailVerificationTokenHash: null, emailVerificationExpiresAt: null });
    return { message: 'Email verified successfully.' };
  }

  async resendVerification(email: string) {
    const normalized = String(email || '').trim().toLowerCase();
    const users = await this.store.all('users');
    const user = users.find(u => String(u.email).toLowerCase() === normalized);
    if (user && !user.emailVerified) await this.sendVerificationEmail(user);
    return { message: 'If an unverified account exists for that email, a new verification link has been sent.' };
  }

  async requestPasswordReset(email:string) {
    const normalized=String(email||'').trim().toLowerCase();
    const users=await this.store.all('users'); const user=users.find(u=>String(u.email).toLowerCase()===normalized);
    if(!user) return {message:'If an account exists for that email, a reset link has been sent.'};
    const raw=randomBytes(32).toString('hex'); const hash=createHash('sha256').update(raw).digest('hex');
    await this.store.update('users',user.id,{passwordResetTokenHash:hash,passwordResetExpiresAt:new Date(Date.now()+30*60*1000).toISOString()});
    const origin=(process.env.FRONTEND_ORIGIN||'http://localhost:4000').replace(/\/$/,''); const resetUrl=`${origin}/auth.html?reset=${raw}`;
    if(process.env.RESEND_API_KEY){
      try{
        const res = await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL||'Foltrest <onboarding@resend.dev>',to:[user.email],subject:'Reset your Foltrest password',html:`<p>Reset your password within 30 minutes.</p><p><a href="${resetUrl}">Reset password</a></p>`})});
        if(!res.ok){
          const errBody = await res.text();
          console.error(`[Foltrest] Resend email FAILED (status ${res.status}): ${errBody}`);
          console.log(`[Foltrest] Fallback -- password reset URL for ${user.email}: ${resetUrl}`);
        } else {
          console.log(`[Foltrest] Reset email sent to ${user.email} via Resend.`);
        }
      }catch(err:any){
        console.error(`[Foltrest] Resend email request threw an error: ${err.message}`);
        console.log(`[Foltrest] Fallback -- password reset URL for ${user.email}: ${resetUrl}`);
      }
    }
    else console.log(`[Foltrest] Password reset URL for ${user.email}: ${resetUrl}`);
    return {message:'If an account exists for that email, a reset link has been sent.'};
  }
  async resetPassword(token:string,password:string){
    if(String(password||'').length<8) throw new BadRequestException('Password must be at least 8 characters');
    const hash=createHash('sha256').update(String(token||'')).digest('hex'); const users=await this.store.all('users');
    const user=users.find(u=>u.passwordResetTokenHash===hash && u.passwordResetExpiresAt && new Date(u.passwordResetExpiresAt).getTime()>Date.now());
    if(!user) throw new BadRequestException('Reset link is invalid or expired');
    await this.store.update('users',user.id,{password:bcrypt.hashSync(password,12),passwordResetTokenHash:null,passwordResetExpiresAt:null});
    return {message:'Password reset successfully. You can now log in.'};
  }

  async login(email: string, password: string) {
    const normalized = String(email || '').trim().toLowerCase();
    const users = await this.store.all('users');
    const user = users.find(u => String(u.email).toLowerCase() === normalized);
    if (!user || !bcrypt.compareSync(password, user.password)) throw new UnauthorizedException('Invalid email or password');
    return this.issueToken(user);
  }
  private issueToken(user: any) {
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role, verified: user.verified, emailVerified: !!user.emailVerified, verificationRejectionReason: user.verificationRejectionReason || null } };
  }
}
