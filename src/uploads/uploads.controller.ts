import { BadRequestException, Controller, Get, Param, Post, Res, UseGuards, UploadedFile, UseInterceptors, OnModuleInit } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname, basename } from 'path';
import { Response } from 'express';
import { v4 as uuid } from 'uuid';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { supabase } from '../store/store.service';

// Files now live in Supabase Storage instead of the server's local disk.
// This matters because most hosting platforms (Railway, Render, etc.)
// wipe local disk on every restart/redeploy -- Storage is permanent.
//
// Two buckets:
//  - "uploads"            -> public, for listing exterior/interior photos
//  - "private-documents"  -> private, ID/passport photos, admin-only access

const PUBLIC_BUCKET = 'uploads';
const PRIVATE_BUCKET = 'private-documents';
const PRIVATE_SIGNED_URL_SECONDS = 300; // link is valid for 5 minutes when admin opens it

function photoFilter(req: any, file: Express.Multer.File, cb: (error: any, acceptFile: boolean) => void) {
  const ext = extname(file.originalname).toLowerCase(); const mime = String(file.mimetype || '').toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext) || !mime.startsWith('image/')) return cb(new BadRequestException('Only JPG, PNG or WEBP listing photos are allowed'), false);
  cb(null, true);
}

function documentFilter(req: any, file: Express.Multer.File, cb: (error: any, acceptFile: boolean) => void) {
  const ext = extname(file.originalname).toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();
  const allowed = (ext === '.pdf' && mime === 'application/pdf') ||
    (['.jpg', '.jpeg', '.png', '.webp'].includes(ext) && mime.startsWith('image/'));
  if (!allowed) return cb(new BadRequestException('Only valid JPG, PNG, WEBP or PDF files are allowed'), false);
  cb(null, true);
}

@Controller('api/uploads')
export class UploadsController implements OnModuleInit {
  async onModuleInit() {
    // Create both buckets on startup if they don't already exist -- no
    // manual Supabase dashboard step needed.
    const { data: buckets } = await supabase.storage.listBuckets();
    const names = (buckets || []).map(b => b.name);
    if (!names.includes(PUBLIC_BUCKET)) {
      const { error } = await supabase.storage.createBucket(PUBLIC_BUCKET, { public: true, fileSizeLimit: 8 * 1024 * 1024 });
      if (error) console.error(`[Foltrest] Could not create "${PUBLIC_BUCKET}" storage bucket: ${error.message}`);
    }
    if (!names.includes(PRIVATE_BUCKET)) {
      const { error } = await supabase.storage.createBucket(PRIVATE_BUCKET, { public: false, fileSizeLimit: 5 * 1024 * 1024 });
      if (error) console.error(`[Foltrest] Could not create "${PRIVATE_BUCKET}" storage bucket: ${error.message}`);
    }
  }

  @Post('listing-photo')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('agent')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: photoFilter }))
  async uploadListingPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file received');
    const path = `${uuid()}${extname(file.originalname).toLowerCase()}`;
    const { error } = await supabase.storage.from(PUBLIC_BUCKET).upload(path, file.buffer, { contentType: file.mimetype });
    if (error) throw new BadRequestException(`Upload failed: ${error.message}`);
    const { data } = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, originalName: file.originalname };
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: documentFilter }))
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file received');
    const path = `${uuid()}${extname(file.originalname).toLowerCase()}`;
    const { error } = await supabase.storage.from(PRIVATE_BUCKET).upload(path, file.buffer, { contentType: file.mimetype });
    if (error) throw new BadRequestException(`Upload failed: ${error.message}`);
    // Kept as an internal indirection URL (not the raw storage path) so
    // access always goes through our admin-only auth check below.
    return { url: `/api/uploads/private/${path}`, originalName: file.originalname };
  }

  @Get('private/:filename')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async getPrivateDocument(@Param('filename') filenameParam: string, @Res() res: Response) {
    const filename = basename(String(filenameParam || ''));
    if (!filename) return res.status(404).json({ message: 'Document not found' });
    const { data, error } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(filename, PRIVATE_SIGNED_URL_SECONDS);
    if (error || !data) return res.status(404).json({ message: 'Document not found' });
    return res.redirect(data.signedUrl);
  }
}
