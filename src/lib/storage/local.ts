import 'server-only';

import path from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';

export function getUploadRoot(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
}

function objectPath(bucket: string, filePath: string) {
  return path.join(getUploadRoot(), bucket, filePath);
}

export async function storageUpload(
  bucket: string,
  filePath: string,
  buffer: Buffer,
  _contentType?: string
): Promise<{ error: { message: string } | null }> {
  try {
    const full = objectPath(bucket, filePath);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, buffer);
    return { error: null };
  } catch (error) {
    return { error: { message: error instanceof Error ? error.message : 'Upload failed' } };
  }
}

export async function storageDownload(
  bucket: string,
  filePath: string
): Promise<{ data: Buffer | null; error: { message: string } | null }> {
  try {
    const full = objectPath(bucket, filePath);
    const data = await readFile(full);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : 'Download failed' } };
  }
}

export function createStorageClient() {
  return {
    from(bucket: string) {
      return {
        upload: (filePath: string, body: Buffer, options?: { contentType?: string; upsert?: boolean }) =>
          storageUpload(bucket, filePath, body, options?.contentType),
        download: (filePath: string) => storageDownload(bucket, filePath),
      };
    },
  };
}
