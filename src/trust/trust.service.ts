import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { StoreService } from '../store/store.service';
const LOW_RATING_THRESHOLD=3, MIN_REVIEWS_TO_FLAG=3;
@Injectable()
export class TrustService {
 constructor(private store:StoreService){}
 async addAgentReview(renterId:string,body:any){
  const listing=await this.store.findById('listings',body.listingId);if(!listing)throw new BadRequestException('Listing not found');
  const rating=Number(body.rating);if(!Number.isInteger(rating)||rating<1||rating>5)throw new BadRequestException('Rating must be an integer from 1 to 5');
  const txns=await this.store.all('transactions');const completed=txns.find(t=>t.listingId===listing.id&&t.renterId===renterId&&t.status==='completed'&&Number(t.rentPortion)>0);if(!completed)throw new ForbiddenException('You can only review a listing after a completed full rental');
  const reviews=await this.store.all('reviews');if(reviews.some(r=>r.listingId===listing.id&&r.renterId===renterId))throw new BadRequestException('You have already reviewed this rental');
  const review={id:uuid(),listingId:listing.id,agentId:listing.agentId,renterId,rating,comment:String(body.comment||'').trim(),createdAt:new Date().toISOString()};await this.store.insert('reviews',review);return review;
 }
 async getAgentRating(agentId:string){const all=await this.store.all('reviews');const reviews=all.filter(r=>r.agentId===agentId);const count=reviews.length;const average=count?reviews.reduce((s,r)=>s+Number(r.rating),0)/count:null;return{reviews,average,count,isLowRated:count>=MIN_REVIEWS_TO_FLAG&&!!average&&average<LOW_RATING_THRESHOLD};}
 async topAgents(){ const users=(await this.store.all('users')).filter(u=>u.role==='agent'); const reviews=await this.store.all('reviews'); const txns=await this.store.all('transactions'); return users.map(u=>{const rs=reviews.filter(r=>r.agentId===u.id);const completed=txns.filter(t=>t.status==='completed').filter(t=>{const ltx=String(t.listingId);return true;}).length;const avg=rs.length?rs.reduce((s,r)=>s+Number(r.rating),0)/rs.length:0;const score=(u.verified?2:0)+Math.min(completed,20)*0.15+(avg>=4.5?2:0)+Math.min(rs.length,10)*0.1;return{id:u.id,name:u.name,verified:u.verified,rating:avg?Number(avg.toFixed(1)):null,reviews:rs.length,completedRentals:completed,topAgent:score>=5&&u.verified};}).filter(a=>a.topAgent).sort((a,b)=>b.rating-a.rating||b.completedRentals-a.completedRentals); }
 async addSiteReview(userId:string,body:any){const rating=Number(body.rating);if(!Number.isInteger(rating)||rating<1||rating>5)throw new BadRequestException('Rating must be an integer from 1 to 5');const review={id:uuid(),userId,rating,comment:String(body.comment||'').trim(),createdAt:new Date().toISOString()};await this.store.insert('siteReviews',review);return review;}
 async getSiteReviews(){const reviews=await this.store.all('siteReviews');const average=reviews.length?reviews.reduce((s,r)=>s+Number(r.rating),0)/reviews.length:null;return{reviews,average,count:reviews.length};}
 async addReport(reporterId:string,body:any){if(!String(body.reason||'').trim())throw new BadRequestException('reason is required');if(!body.listingId&&!body.agentId)throw new BadRequestException('Provide a listingId or agentId to report');if(body.listingId&&!await this.store.findById('listings',body.listingId))throw new BadRequestException('Listing not found');if(body.agentId){const agent=await this.store.findById('users',body.agentId);if(!agent||agent.role!=='agent')throw new BadRequestException('Agent not found');}const report={id:uuid(),reporterId,listingId:body.listingId||null,agentId:body.agentId||null,reason:String(body.reason).trim(),status:'open',createdAt:new Date().toISOString()};await this.store.insert('reports',report);return report;}
 async getReports(){return this.store.all('reports');}
}
