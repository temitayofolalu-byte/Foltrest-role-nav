import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { StoreService } from '../store/store.service';
import { PaystackService } from './paystack.service';
import { NotificationsService } from '../notifications/notifications.service';
const PLATFORM_COMMISSION_RATE = 0.05;

@Injectable()
export class TransactionsService {
  constructor(private store: StoreService, private paystack: PaystackService, private notifications: NotificationsService) {}

  async initiate(renterId: string, body: any) {
    const renter = await this.store.findById('users', renterId);
    if (!renter?.emailVerified) throw new ForbiddenException('Please verify your email before making a payment. Check your inbox for the verification link, or request a new one from the login page.');
    const listing = await this.store.findById('listings', body.listingId);
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.verificationStatus !== 'approved' || listing.status !== 'available') throw new ConflictException('This apartment is not currently available for payment.');
    const existing = await this.store.all('transactions');
    if (existing.some(t => t.listingId === listing.id && ['pending', 'paid'].includes(t.status))) throw new ConflictException('This apartment already has an active payment attempt. Please try another listing.');
    const rentPortion = body.payFull ? Number(listing.rentPrice) : 0;
    const agentFeeAmount = Number(listing.agentFee);
    const amountToPay = rentPortion + agentFeeAmount;
    if (!Number.isFinite(amountToPay) || amountToPay <= 0) throw new BadRequestException('Invalid listing payment amount');
    const transactionId = uuid();
    const paymentRef = `FOLTREST_${transactionId}`;
    const origin = (process.env.FRONTEND_ORIGIN || 'http://localhost:4000').replace(/\/$/, '');
    const callbackUrl = `${origin}/listing.html?id=${encodeURIComponent(listing.id)}&transactionId=${encodeURIComponent(transactionId)}`;
    const payment = await this.paystack.initializePayment({ email: String(body.email || ''), amount: amountToPay, reference: paymentRef, callbackUrl });
    const transaction = {
      id: transactionId,
      listingId: listing.id,
      renterId,
      amountPaid: amountToPay,
      agentFeeAmount,
      rentPortion,
      platformCommission: Math.round(amountToPay * PLATFORM_COMMISSION_RATE),
      status: 'pending',
      paymentRef: payment.reference,
      date: new Date().toISOString(),
    };
    await this.store.insert('transactions', transaction);
    return { transaction, checkoutUrl: payment.authorizationUrl };
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!this.paystack.verifyWebhookSignature(rawBody, signature)) {
      throw new ForbiddenException('Invalid Paystack webhook signature');
    }
    let event: any;
    try { event = JSON.parse(rawBody.toString('utf8')); } catch { throw new BadRequestException('Invalid webhook payload'); }
    if (event?.event !== 'charge.success') return { received: true, ignored: true };

    const data = event.data || {};
    const reference = String(data.reference || '');
    if (!reference) throw new BadRequestException('Webhook is missing payment reference');

    const transactions = await this.store.all('transactions');
    const txn = transactions.find(t => String(t.paymentRef) === reference);
    if (!txn) return { received: true, ignored: true, reason: 'transaction-not-found' };

    const expectedKobo = Math.round(Number(txn.amountPaid) * 100);
    if (String(data.status || '').toLowerCase() !== 'success' || Number(data.amount) !== expectedKobo || String(data.currency || 'NGN').toUpperCase() !== 'NGN') {
      return { received: true, ignored: true, reason: 'payment-data-mismatch' };
    }

    if (['paid', 'completed'].includes(txn.status)) return { received: true, alreadyProcessed: true };

    const updated = await this.store.update('transactions', txn.id, {
      status: 'paid',
      paidAt: new Date().toISOString(),
      paymentChannel: data.channel || null,
      paystackTransactionId: data.id || null,
    });
    return { received: true, transaction: updated };
  }

  async setAgentBank(agentId:string,body:any){
    const agent=await this.store.findById('users',agentId); if(!agent||agent.role!=='agent') throw new ForbiddenException('Agent account required');
    const accountNumber=String(body.accountNumber||'').replace(/\D/g,''); const bankCode=String(body.bankCode||'').trim(); const accountName=String(body.accountName||agent.name).trim();
    if(!/^\d{10}$/.test(accountNumber)||!bankCode) throw new BadRequestException('Valid 10-digit account number and bank code are required');
    const recipient=await this.paystack.createTransferRecipient(accountName,accountNumber,bankCode);
    const updated=await this.store.update('users',agentId,{bankAccountNumber:accountNumber,bankCode,bankAccountName:accountName,paystackRecipientCode:recipient.recipient_code});
    return {accountNumber:'******'+accountNumber.slice(-4),bankCode,accountName,recipientCode:recipient.recipient_code,updated};
  }

  async payoutForTransaction(id:string){
    const txn=await this.store.findById('transactions',id); if(!txn) throw new NotFoundException('Transaction not found'); if(txn.status!=='completed') throw new BadRequestException('Transaction must be completed before payout');
    if(!String(process.env.ENABLE_AGENT_PAYOUTS||'false').toLowerCase().includes('true')) return {status:'disabled',message:'Agent payouts are disabled until ENABLE_AGENT_PAYOUTS=true is set.'};
    if(txn.payoutStatus==='paid') return {status:'paid',message:'Agent payout already completed'};
    const listing=await this.store.findById('listings',txn.listingId); const agent=listing&&await this.store.findById('users',listing.agentId);
    if(!agent?.paystackRecipientCode) throw new BadRequestException('Agent has not configured a payout bank account');
    const payoutAmount=Math.max(0,Number(txn.agentFeeAmount)); if(!payoutAmount) throw new BadRequestException('No agent payout amount');
    const transfer=await this.paystack.initiateTransfer(payoutAmount,agent.paystackRecipientCode,`FOLTREST_PAYOUT_${txn.id}`,'Foltrest agent fee payout');
    await this.store.update('transactions',id,{payoutStatus:'paid',payoutAt:new Date().toISOString(),paystackTransferId:String(transfer.id||'')});
    return {status:'paid',transfer};
  }

 async confirm(renterId: string, id: string) {
  const txn = await this.store.findById('transactions', id);

  if (!txn) {
    throw new NotFoundException('Transaction not found');
  }

  if (txn.renterId !== renterId) {
    throw new ForbiddenException('Not your transaction');
  }

  if (!['pending', 'paid'].includes(txn.status)) {
    throw new BadRequestException(`Transaction is already ${txn.status}`);
  }

  // Keep a verification fallback for payments whose webhook has not reached us yet.
  const verified = await this.paystack.verifyPayment(txn.paymentRef);

  const expectedKobo = Math.round(Number(txn.amountPaid) * 100);

  if (
    verified.status !== 'success' ||
    Number(verified.amount) !== expectedKobo
  ) {
    throw new BadRequestException(
      'Payment has not been verified for the expected amount',
    );
  }

  const updated = await this.store.update('transactions', id, {
    status: 'completed',
    confirmedAt: new Date().toISOString(),
  });

  if (Number(txn.rentPortion) > 0) {
    await this.store.update('listings', txn.listingId, {
      status: 'rented',
      rentedAt: new Date().toISOString(),
    });
  }

  const renter = await this.store.findById('users', renterId);

  if (renter) {
    await this.notifications.create(
      renter.id,
      'Rental confirmed',
      'Your apartment rental has been confirmed successfully.',
      'rental',
      renter.email,
    );
  }

  let payout: any = null;

  try {
    payout = await this.payoutForTransaction(id);
  } catch (e: any) {
    payout = {
      status: 'pending',
      message: e?.message || 'Payout pending',
    };
  }

  return {
    message: 'Payment verified and rental confirmed.',
    transaction: updated,
    payout,
  };
}

  async mine(user: any) {
    const listings = await this.store.all('listings');
    const allTxns = await this.store.all('transactions');
    let mine: any[];
    if (user.role === 'renter') mine = allTxns.filter(t => t.renterId === user.id);
    else if (user.role === 'agent') {
      const ids = listings.filter(l => l.agentId === user.id).map(l => l.id);
      mine = allTxns.filter(t => ids.includes(t.listingId));
    } else mine = allTxns;
    return Promise.all(mine.map(async t => {
      const listing = await this.store.findById('listings', t.listingId);
      return { ...t, listingTitle: listing?.title };
    }));
  }
}
