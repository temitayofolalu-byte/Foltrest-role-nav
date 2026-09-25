import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { StoreService } from '../store/store.service';

@Injectable()
export class NotificationsService {
  constructor(private store: StoreService) {}
  async create(userId:string, title:string, body:string, type='info', email?:string){
    const n={id:uuid(),userId,title,body,type,read:false,createdAt:new Date().toISOString()};
    await this.store.insert('notifications',n);
    if(email && process.env.RESEND_API_KEY) {
      try {
        const res = await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL||'Foltrest <onboarding@resend.dev>',to:[email],subject:title,html:`<p>${body}</p>`})});
        if(!res.ok){ console.error(`[Foltrest] Notification email FAILED (status ${res.status}): ${await res.text()}`); }
      } catch(err:any) { console.error(`[Foltrest] Notification email request threw: ${err.message}`); }
    }
    return n;
  }
  async mine(userId:string){ return (await this.store.all('notifications')).filter(n=>n.userId===userId).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()); }
  async unreadCount(userId:string){ return (await this.store.all('notifications')).filter(n=>n.userId===userId&&!n.read).length; }
  async markRead(userId:string,id:string){ const n=await this.store.findById('notifications',id); if(!n||n.userId!==userId)return null; return this.store.update('notifications',id,{read:true}); }
}
