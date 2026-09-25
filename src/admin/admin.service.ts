import { Injectable, NotFoundException } from '@nestjs/common';
import { StoreService } from '../store/store.service';
import { ListingsService } from '../listings/listings.service';
import { MessagesService } from '../messages/messages.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RoommatesService } from '../roommates/roommates.service';

@Injectable()
export class AdminService {
  constructor(private store: StoreService, private listings: ListingsService, private messages: MessagesService, private notifications: NotificationsService, private roommates: RoommatesService) {}

  async allRoommatePosts(page?: any, limit?: any) { return this.roommates.allForAdmin(page, limit); }
  async removeRoommatePost(id: string) { return this.roommates.remove('', id, true); }

  async pendingAgents() {
    const all = await this.store.all('users');
    return all.filter((u) => u.role === 'agent' && !u.verified).map(({ password, ...rest }) => rest);
  }

  async verifyAgent(id: string) {
    const user = await this.store.findById('users', id);
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'agent') throw new NotFoundException('Agent not found');
    const updated = await this.store.update('users', id, { verified: true, verificationRejectionReason: null });
    await this.notifications.create(id,'Agent verification approved','Your Foltrest agent account has been approved. You can now post listings.','approval',user.email);
    if (!updated) throw new NotFoundException('User not found');
    const { password, ...safe } = updated;
    return safe;
  }

  async rejectAgentVerification(id: string, reason: string) {
    const user = await this.store.findById('users', id);
    if (!user || user.role !== 'agent') throw new NotFoundException('Agent not found');
    const updated = await this.store.update('users', id, { verified: false, verificationRejectionReason: reason || 'Documents unclear or invalid — please resubmit a valid ID and passport photo.' });
    await this.notifications.create(id,'Agent verification rejected',reason || 'Your documents need attention. Please resubmit valid documents.','rejection',user.email);
    if (!updated) throw new NotFoundException('User not found');
    const { password, ...safe } = updated;
    return safe;
  }

  async pendingListings() { return this.listings.pendingForAdmin(); }
  async approveListing(id: string) { const l=await this.listings.approve(id); const u=await this.store.findById('users',l.agentId); if(u) await this.notifications.create(u.id,'Listing approved',`Your listing "${l.title}" is now approved.`,'approval',u.email); return l; }
  async rejectListing(id: string, reason: string) { const l=await this.listings.reject(id, reason); const u=await this.store.findById('users',l.agentId); if(u) await this.notifications.create(u.id,'Listing rejected',reason||'Your listing was rejected.','rejection',u.email); return l; }
  async removeListing(id: string) { await this.listings.remove(id); return { message: 'Listing removed' }; }

  private paginate(rows: any[], page: any, limit: any) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const sorted = [...rows].sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
    const start = (p - 1) * l;
    return { items: sorted.slice(start, start + l), total: sorted.length, page: p, limit: l, hasMore: start + l < sorted.length };
  }

  async transactionsOverview(page?: any, limit?: any) {
    const txns = await this.store.all('transactions');
    const totalCommission = txns.filter((t) => t.status === 'completed').reduce((sum, t) => sum + Number(t.platformCommission), 0);
    const paged = this.paginate(txns, page, limit);
    return { ...paged, transactions: paged.items, totalCommission };
  }

  async allMessages(page?: any, limit?: any) { return this.paginate(await this.messages.all(), page, limit); }
  async reports(page?: any, limit?: any) { return this.paginate(await this.store.all('reports'), page, limit); }

  async supportContact() {
    const all = await this.store.all('users');
    const admin = all.find((u) => u.role === 'admin');
    return admin ? { id: admin.id, name: admin.name } : null;
  }
}
