import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { StoreService } from '../store/store.service';

@Injectable()
export class RoommatesService {
  constructor(private store: StoreService) {}

  private async attachPosterInfo(post: any) {
    const poster = await this.store.findById('users', post.posterId);
    return { ...post, posterName: poster?.name, posterVerified: !!poster?.verified };
  }

  async browse(query: any) {
    const all = await this.store.all('roommatePosts');
    let posts = all.filter((p) => p.status === 'open');
    if (query.genderPreference) posts = posts.filter((p) => p.genderPreference === query.genderPreference || p.genderPreference === 'any');
    if (query.location) { const q = String(query.location).toLowerCase(); posts = posts.filter((p) => String(p.location).toLowerCase().includes(q)); }
    if (query.maxRent !== undefined && query.maxRent !== '') posts = posts.filter((p) => p.rentShare == null || Number(p.rentShare) <= Number(query.maxRent));
    posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
    const total = posts.length;
    const start = (page - 1) * limit;
    const items = await Promise.all(posts.slice(start, start + limit).map((p) => this.attachPosterInfo(p)));
    return { items, total, page, limit, hasMore: start + limit < total };
  }

  async getById(id: string) {
    const post = await this.store.findById('roommatePosts', id);
    if (!post) throw new NotFoundException('Roommate post not found');
    return this.attachPosterInfo(post);
  }

  async create(posterId: string, body: any) {
    const { title, description, location, rentShare, moveInDate, genderPreference, photos } = body;
    if (!title || !location) throw new BadRequestException('title and location are required');
    const allowedGender = ['any', 'male', 'female'];
    const gender = allowedGender.includes(genderPreference) ? genderPreference : 'any';
    const post = {
      id: uuid(), posterId, title, description: description || '', location,
      rentShare: rentShare ? Number(rentShare) : null,
      moveInDate: moveInDate || null,
      genderPreference: gender,
      photos: Array.isArray(photos) ? photos : [],
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    await this.store.insert('roommatePosts', post);
    return post;
  }

  async update(posterId: string, id: string, body: any) {
    const post = await this.store.findById('roommatePosts', id);
    if (!post) throw new NotFoundException('Roommate post not found');
    if (post.posterId !== posterId) throw new ForbiddenException('Not your post');
    const patch: any = {};
    if (body.title !== undefined) patch.title = body.title;
    if (body.description !== undefined) patch.description = body.description;
    if (body.location !== undefined) patch.location = body.location;
    if (body.rentShare !== undefined) patch.rentShare = body.rentShare ? Number(body.rentShare) : null;
    if (body.moveInDate !== undefined) patch.moveInDate = body.moveInDate;
    if (body.genderPreference !== undefined && ['any', 'male', 'female'].includes(body.genderPreference)) patch.genderPreference = body.genderPreference;
    if (body.photos !== undefined && Array.isArray(body.photos)) patch.photos = body.photos;
    if (body.status !== undefined && ['open', 'closed'].includes(body.status)) patch.status = body.status;
    return this.store.update('roommatePosts', id, patch);
  }

  async remove(userId: string, id: string, isAdmin: boolean) {
    const post = await this.store.findById('roommatePosts', id);
    if (!post) throw new NotFoundException('Roommate post not found');
    if (!isAdmin && post.posterId !== userId) throw new ForbiddenException('Not your post');
    await this.store.remove('roommatePosts', id);
    return { message: 'Roommate post removed' };
  }

  async mine(posterId: string) {
    const all = await this.store.all('roommatePosts');
    return all.filter((p) => p.posterId === posterId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Admin oversight -- lets admin see and moderate every post regardless of status
  async allForAdmin(page?: any, limit?: any) {
    const all = await this.store.all('roommatePosts');
    const sorted = [...all].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const start = (p - 1) * l;
    const items = await Promise.all(sorted.slice(start, start + l).map((post) => this.attachPosterInfo(post)));
    return { items, total: sorted.length, page: p, limit: l, hasMore: start + l < sorted.length };
  }
}
