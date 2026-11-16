import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '../lib/supabase';

const BUCKET = 'avatars';
/** Plenty for a round picture of at most ~100pt, and keeps uploads small. */
const SIZE = 512;

/**
 * Lets the user choose a photo (cropped square by the system picker) and
 * returns it as a small JPEG, or null if they cancelled. The system photo
 * picker needs no permission prompt.
 */
export async function pickAvatar(): Promise<{ base64: string } | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;

  const context = ImageManipulator.manipulate(result.assets[0].uri);
  context.resize({ width: SIZE });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!saved.base64) throw new Error('Could not read the picture');
  return { base64: saved.base64 };
}

function toBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Uploads under a fresh random name and returns its public URL. */
export async function uploadAvatar(userId: string, base64: string): Promise<string> {
  const random = Math.random().toString(36).slice(2, 10);
  const path = `${userId}/${Date.now().toString(36)}-${random}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, toBytes(base64), { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Deletes every picture in the user's folder except `keepUrl`. */
export async function removeAvatars(userId: string, keepUrl?: string | null): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).list(userId);
  if (error) throw error;
  const paths = (data ?? [])
    .map((file) => `${userId}/${file.name}`)
    .filter((path) => !keepUrl || !keepUrl.endsWith(path));
  if (paths.length === 0) return;
  const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths);
  if (removeError) throw removeError;
}
