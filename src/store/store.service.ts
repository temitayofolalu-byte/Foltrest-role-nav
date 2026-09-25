import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ quiet: true });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', url);
console.log('KEY exists:', !!key);

if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

export const supabase: SupabaseClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

@Injectable()
export class StoreService implements OnModuleInit {
  async onModuleInit() {
    await this.all('users');
  }
  async all(table: string): Promise<any[]> {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw new Error(`[${table}] ${error.message}`);
    return data || [];
  }
  async findById(table: string, id: string): Promise<any> {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`[${table}] ${error.message}`);
    return data;
  }
  async insert(table: string, row: any): Promise<any> {
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) throw new Error(`[${table}] ${error.message}`);
    return data;
  }
  async update(table: string, id: string, patch: any): Promise<any> {
    const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().maybeSingle();
    if (error) throw new Error(`[${table}] ${error.message}`);
    return data;
  }
  async remove(table: string, id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(`[${table}] ${error.message}`);
  }
}