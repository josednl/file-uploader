import { supabase } from '../../../lib/supabase';
import { randomUUID } from 'crypto';
import path from 'path';

export async function uploadToSupabaseStorage(file: Express.Multer.File) {
  const ext = path.extname(file.originalname);
  const filename = `${randomUUID()}${ext}`;

  const { error } = await supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET!)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    console.error(error);
    throw new Error('Failed to upload file to Supabase');
  }

  const { data } = supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET!)
    .getPublicUrl(filename);

  return {
    filename,
    publicUrl: data.publicUrl,
  };
}
