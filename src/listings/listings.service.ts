import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { StoreService } from '../store/store.service';
import { TrustService } from '../trust/trust.service';
export const POSTING_GUIDELINES = [
  'Use real, recent photos of the actual apartment — both exterior and interior. Listings with stock/unrelated photos get rejected.',
  'State the rent and agent fee accurately and separately.',
  'Only post apartments that are genuinely available.',
  'Give an honest description — water availability, distance from FUNAAB, condition of the building.',
  'Every new listing is reviewed by an admin before it goes live. If rejected, fix it and resubmit.',
];
@Injectable()
export class ListingsService {
  constructor(private store: StoreService, private trust: TrustService) {}
  private isVisible(l: any) {
    if (l.status === 'available') return true;
    if (l.status === 'rented') {
      if (!l.rentedAt) return true; // no timestamp yet (e.g. rented before this feature existed) — stay visible until backfilled
      const hoursSinceRented = (Date.now() - new Date(l.rentedAt).getTime()) / (1000 * 60 * 60);
      return hoursSinceRented < 24;
    }
    return false;
  }
  private async attachAgentInfo(listing: any, includePhone = false) {
    const agent = await this.store.findById('users', listing.agentId);
    const rating = await this.trust.getAgentRating(listing.agentId);
    const completedRentals = (await this.store.all('transactions')).filter(t=>t.status==='completed' && Number(t.rentPortion)>0 && t.listingId===listing.id).length;
    const topAgent = !!agent?.verified && rating.count >= 3 && !!rating.average && rating.average >= 4.5 && completedRentals >= 3;
    const info: any = { ...listing, agentName: agent?.name, agentVerified: agent?.verified, agentRating: rating.average, agentReviewCount: rating.count, agentLowRated: rating.isLowRated, topAgent };
    if (includePhone) info.agentPhone = agent?.phone;
    return info;
  }
  async browse(query: any) {
    const all = await this.store.all('listings');
    let listings = all.filter(l => l.verificationStatus === 'approved' && this.isVisible(l));
    if (query.minPrice !== undefined && query.minPrice !== '') listings = listings.filter(l => Number(l.rentPrice) >= Number(query.minPrice));
    if (query.maxPrice !== undefined && query.maxPrice !== '') listings = listings.filter(l => Number(l.rentPrice) <= Number(query.maxPrice));
    if (query.rooms) listings = listings.filter(l => l.rooms === query.rooms);
    if (query.search) { const q = String(query.search).toLowerCase(); listings = listings.filter(l => String(l.title).toLowerCase().includes(q) || String(l.location).toLowerCase().includes(q)); }
    listings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
    const total = listings.length;
    const start = (page - 1) * limit;
    const pageSlice = listings.slice(start, start + limit);

    const items = await Promise.all(pageSlice.map(l => this.attachAgentInfo(l)));
    return { items, total, page, limit, hasMore: start + limit < total };

  }
  async getById(id: string) {
    const listing = await this.store.findById('listings', id);
    if (!listing || listing.verificationStatus !== 'approved' || !this.isVisible(listing)) throw new NotFoundException('Listing not found');
    return this.attachAgentInfo(listing, false);
  }
  async create(agentId: string, body: any) {
    const agent = await this.store.findById('users', agentId);
    if (!agent) throw new NotFoundException('Agent not found');
    if (!agent.verified) throw new ForbiddenException('Your agent account is pending admin verification.');
    const title = String(body.title || '').trim(), description = String(body.description || '').trim(), location = String(body.location || '').trim();
    const rentPrice = Number(body.rentPrice), agentFee = Number(body.agentFee);
    const exterior = Array.isArray(body.photos?.exterior) ? body.photos.exterior.filter(Boolean) : [];
    const interior = Array.isArray(body.photos?.interior) ? body.photos.interior.filter(Boolean) : [];
    if (!title || !location || !Number.isFinite(rentPrice) || rentPrice <= 0 || !Number.isFinite(agentFee) || agentFee < 0) throw new BadRequestException('Enter a valid title, location, rent and agent fee');
    if (!exterior.length || !interior.length) throw new BadRequestException('At least one exterior and one interior photo are required');
    const listing = { id: uuid(), agentId, title, description, location, rooms: body.rooms || 'Self-con', rentPrice, agentFee, photos: { exterior, interior }, status: 'available', verificationStatus: 'pending', rejectionReason: null, createdAt: new Date().toISOString() };
    return this.store.insert('listings', listing);
  }
  async update(agentId: string, id: string, body: any) {
    const listing = await this.store.findById('listings', id); if (!listing) throw new NotFoundException('Listing not found');
    if (listing.agentId !== agentId) throw new ForbiddenException('Not your listing');
    if (listing.verificationStatus !== 'rejected') throw new BadRequestException('Only rejected listings can be edited and resubmitted');
    const patch: any = {};
    for (const k of ['title','description','location','rooms']) if (body[k] !== undefined) patch[k] = String(body[k]).trim();
    if (body.rentPrice !== undefined) { const n=Number(body.rentPrice); if(!Number.isFinite(n)||n<=0) throw new BadRequestException('Invalid rent price'); patch.rentPrice=n; }
    if (body.agentFee !== undefined) { const n=Number(body.agentFee); if(!Number.isFinite(n)||n<0) throw new BadRequestException('Invalid agent fee'); patch.agentFee=n; }
    if (body.photos) { const ext=Array.isArray(body.photos.exterior)?body.photos.exterior.filter(Boolean):[]; const int=Array.isArray(body.photos.interior)?body.photos.interior.filter(Boolean):[]; if(!ext.length||!int.length) throw new BadRequestException('At least one exterior and one interior photo are required'); patch.photos={exterior:ext,interior:int}; }
    patch.verificationStatus='pending'; patch.rejectionReason=null; patch.status='available';
    return this.store.update('listings', id, patch);
  }
  async updateStatus(agentId: string, id: string, status: 'available' | 'rented') { const listing=await this.store.findById('listings',id); if(!listing)throw new NotFoundException('Listing not found'); if(listing.agentId!==agentId)throw new ForbiddenException('Not your listing'); if(!['available','rented'].includes(status))throw new BadRequestException('Invalid status'); const patch:any={status}; if(status==='rented')patch.rentedAt=new Date().toISOString(); if(status==='available')patch.rentedAt=null; return this.store.update('listings',id,patch); }
  async mine(agentId: string) { const allListings=await this.store.all('listings'); const mine=allListings.filter(l=>l.agentId===agentId); const allTxns=await this.store.all('transactions'); const myCompleted=allTxns.filter(t=>mine.some(l=>l.id===t.listingId)&&t.status==='completed'); const feesEarned=myCompleted.reduce((sum,t)=>sum+Number(t.agentFeeAmount),0); return { listings:mine, stats:{active:mine.filter(l=>l.status==='available').length,rented:mine.filter(l=>l.status==='rented').length,feesEarned} }; }
  async pendingForAdmin(){return (await this.store.all('listings')).filter(l=>l.verificationStatus==='pending');}
  async approve(id:string){const listing=await this.store.findById('listings',id);if(!listing)throw new NotFoundException('Listing not found');return this.store.update('listings',id,{verificationStatus:'approved',rejectionReason:null});}
  async reject(id:string,reason:string){if(!String(reason||'').trim())throw new BadRequestException('A rejection reason is required');const listing=await this.store.findById('listings',id);if(!listing)throw new NotFoundException('Listing not found');return this.store.update('listings',id,{verificationStatus:'rejected',rejectionReason:String(reason).trim()});}
  async remove(id:string){return this.store.remove('listings',id);} guidelines(){return POSTING_GUIDELINES;}
}
