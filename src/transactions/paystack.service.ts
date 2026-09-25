import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class PaystackService {
  private key = process.env.PAYSTACK_SECRET_KEY;
  private base = 'https://api.paystack.co';

  private requireKey() {
    if (!this.key) throw new ServiceUnavailableException('Paystack is not configured. Add PAYSTACK_SECRET_KEY on the server.');
  }

  async initializePayment({ email, amount, reference, callbackUrl }: { email: string; amount: number; reference: string; callbackUrl?: string }) {
    this.requireKey();
    const res = await fetch(`${this.base}/transaction/initialize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, amount: Math.round(amount * 100), reference, ...(callbackUrl ? { callback_url: callbackUrl } : {}) }),
    });
    const data: any = await res.json();
    if (!res.ok || !data.status) throw new BadRequestException(data.message || 'Paystack initialization failed');
    return { reference: data.data.reference, authorizationUrl: data.data.authorization_url, simulated: false };
  }

  async verifyPayment(reference: string) {
    this.requireKey();
    const res = await fetch(`${this.base}/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${this.key}` } });
    const data: any = await res.json();
    if (!res.ok || !data.status) throw new BadRequestException(data.message || 'Paystack verification failed');
    return data.data;
  }

  async createTransferRecipient(name:string,accountNumber:string,bankCode:string){ this.requireKey(); const res=await fetch(`${this.base}/transferrecipient`,{method:'POST',headers:{Authorization:`Bearer ${this.key}`,'Content-Type':'application/json'},body:JSON.stringify({type:'nuban',name,account_number:accountNumber,bank_code:bankCode,currency:'NGN'})}); const data:any=await res.json(); if(!res.ok||!data.status) throw new BadRequestException(data.message||'Unable to create payout recipient'); return data.data; }
  async initiateTransfer(amount:number,recipientCode:string,reference:string,reason:string){ this.requireKey(); const res=await fetch(`${this.base}/transfer`,{method:'POST',headers:{Authorization:`Bearer ${this.key}`,'Content-Type':'application/json'},body:JSON.stringify({source:'balance',amount:Math.round(amount*100),recipient:recipientCode,reference,reason})}); const data:any=await res.json(); if(!res.ok||!data.status) throw new BadRequestException(data.message||'Unable to send agent payout'); return data.data; }

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined) {
    this.requireKey();
    if (!signature) return false;
    const expected = createHmac('sha512', this.key!).update(rawBody).digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
