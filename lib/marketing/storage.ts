// Storage-helpers voor de ad-pipeline. Bucket 'ad-batches' is private,
// dus na upload returneren we een signed URL (1 jaar geldig) — dat is
// wat we in ad_candidates persisten zodat de UI de assets kan openen.

import { createServiceClient } from '@/lib/supabase'

const BUCKET = 'ad-batches'
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 // 1 jaar

/**
 * Download een bestand van een externe URL en upload 'm direct in
 * Supabase Storage. Returns een signed URL voor lezen.
 */
export async function uploadToStorage(
  sourceUrl: string,
  bucketPath: string,
  contentType: string,
): Promise<string> {
  const res = await fetch(sourceUrl)
  if (!res.ok) {
    throw new Error(`Download van ${sourceUrl} faalde: ${res.status}`)
  }
  const buffer = await res.arrayBuffer()
  return uploadBufferToStorage(buffer, bucketPath, contentType)
}

/**
 * Upload een buffer/blob direct (geen externe URL als source).
 */
export async function uploadBufferToStorage(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  bucketPath: string,
  contentType: string,
): Promise<string> {
  const supabase = createServiceClient()
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(bucketPath, buffer, {
      contentType,
      upsert: true,
    })
  if (uploadError) {
    throw new Error(`Storage upload faalde: ${uploadError.message}`)
  }

  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(bucketPath, SIGNED_URL_TTL_SECONDS)
  if (signError || !data) {
    throw new Error(`Signed URL faalde: ${signError?.message ?? 'unknown'}`)
  }

  return data.signedUrl
}
