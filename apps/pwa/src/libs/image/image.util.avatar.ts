/** Avatars show at most a few hundred pixels; anything bigger is wasted upload. */
const AVATAR_SIZE = 512;

/**
 * A profile photo as it should be uploaded: centre-cropped to a square — every
 * avatar is shown square or round — scaled to 512px and re-encoded as JPEG,
 * with EXIF rotation applied. A phone photo goes from several megabytes, often
 * HEIC, to a JPEG of tens of kilobytes the server accepts.
 *
 * A browser that can't decode the file (HEIC outside Safari, say) gets the
 * original back, and the server's answer decides.
 */
export async function prepareAvatar(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const side = Math.min(bitmap.width, bitmap.height);
    const size = Math.min(AVATAR_SIZE, side);

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    // JPEG has no transparency; a transparent PNG would otherwise turn black.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    return blob ? new File([blob], 'avatar.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}
