/**
 * Client-Side Canvas 2D Image Compression Pipeline
 * 
 * Scaled for mobile web environments:
 * - Strictly caps max dimensions to 1200px to prevent mobile GPU canvas crashes.
 * - 5-second safety timeout prevents infinite compression spinner locks.
 * - Fallbacks instantly to raw FileReader base64 representation on unreadable mobile formats (e.g., raw HEIC).
 * - Full memory teardown of Image objects and Canvas elements.
 */

export interface CompressionResult {
  compressedBase64: string;
  mimeType: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  width: number;
  height: number;
}

const MAX_MOBILE_DIMENSION = 1200;
const COMPRESSION_TIMEOUT_MS = 5000;

export async function compressImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.75
): Promise<CompressionResult> {
  const originalSizeKb = Math.round(file.size / 1024);

  // 1. Read file to data URL first
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const res = e.target?.result as string;
      if (res) resolve(res);
      else reject(new Error('Failed to read image file data.'));
    };
    reader.onerror = () => reject(new Error('FileReader error loading image.'));
    reader.onabort = () => reject(new Error('FileReader operation aborted.'));
    reader.readAsDataURL(file);
  });

  const fallbackResult: CompressionResult = {
    compressedBase64: rawDataUrl,
    mimeType: file.type || 'image/jpeg',
    originalSizeKb,
    compressedSizeKb: Math.round((rawDataUrl.length * 0.75) / 1024),
    width: 800,
    height: 600
  };

  // 2. Perform canvas downscaling race with a 5-second safety timeout
  return new Promise((resolve) => {
    let isSettled = false;
    let img: HTMLImageElement | null = new Image();

    const cleanup = () => {
      if (img) {
        img.onload = null;
        img.onerror = null;
        img.src = '';
        img = null;
      }
    };

    const safeResolve = (res: CompressionResult) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      resolve(res);
    };

    // 5-Second safety timeout timer
    const timeoutTimer = setTimeout(() => {
      console.warn(`[ImageCompressor] 5s safety timeout reached. Using direct fallback payload.`);
      safeResolve(fallbackResult);
    }, COMPRESSION_TIMEOUT_MS);

    img.onload = () => {
      clearTimeout(timeoutTimer);
      if (!img) {
        safeResolve(fallbackResult);
        return;
      }

      try {
        let { width, height } = img;

        // Apply strict bounding cap (1200px max dimension cap)
        const effectiveMaxWidth = Math.min(maxWidth, MAX_MOBILE_DIMENSION);
        const effectiveMaxHeight = Math.min(maxHeight, MAX_MOBILE_DIMENSION);

        if (width > height) {
          if (width > effectiveMaxWidth) {
            height = Math.round((height * effectiveMaxWidth) / width);
            width = effectiveMaxWidth;
          }
        } else {
          if (height > effectiveMaxHeight) {
            width = Math.round((width * effectiveMaxHeight) / height);
            height = effectiveMaxHeight;
          }
        }

        // Secondary hard clamp to 1200px
        if (width > MAX_MOBILE_DIMENSION) {
          height = Math.round((height * MAX_MOBILE_DIMENSION) / width);
          width = MAX_MOBILE_DIMENSION;
        }
        if (height > MAX_MOBILE_DIMENSION) {
          width = Math.round((width * MAX_MOBILE_DIMENSION) / height);
          height = MAX_MOBILE_DIMENSION;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          canvas.width = 0;
          canvas.height = 0;
          safeResolve(fallbackResult);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const exportMime = 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(exportMime, quality);
        const compressedSizeKb = Math.round((compressedBase64.length * 0.75) / 1024);

        // Clear canvas dimensions for GPU memory release
        canvas.width = 0;
        canvas.height = 0;

        safeResolve({
          compressedBase64,
          mimeType: exportMime,
          originalSizeKb,
          compressedSizeKb,
          width,
          height
        });
      } catch (err) {
        console.warn('[ImageCompressor] Canvas processing exception, returning fallback payload:', err);
        safeResolve(fallbackResult);
      }
    };

    img.onerror = (e) => {
      clearTimeout(timeoutTimer);
      console.warn('[ImageCompressor] img.onerror triggered (unsupported or corrupted format):', e);
      safeResolve(fallbackResult);
    };

    img.src = rawDataUrl;
  });
}

export async function compressBase64Image(
  dataUrl: string,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    let isSettled = false;
    let img: HTMLImageElement | null = new Image();

    const cleanup = () => {
      if (img) {
        img.onload = null;
        img.onerror = null;
        img.src = '';
        img = null;
      }
    };

    const safeResolve = (res: string) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      resolve(res);
    };

    const timeoutTimer = setTimeout(() => {
      safeResolve(dataUrl);
    }, COMPRESSION_TIMEOUT_MS);

    img.onload = () => {
      clearTimeout(timeoutTimer);
      if (!img) {
        safeResolve(dataUrl);
        return;
      }

      try {
        let { width, height } = img;
        const effectiveMaxWidth = Math.min(maxWidth, MAX_MOBILE_DIMENSION);
        const effectiveMaxHeight = Math.min(maxHeight, MAX_MOBILE_DIMENSION);

        if (width > height) {
          if (width > effectiveMaxWidth) {
            height = Math.round((height * effectiveMaxWidth) / width);
            width = effectiveMaxWidth;
          }
        } else {
          if (height > effectiveMaxHeight) {
            width = Math.round((width * effectiveMaxHeight) / height);
            height = effectiveMaxHeight;
          }
        }

        if (width > MAX_MOBILE_DIMENSION) {
          height = Math.round((height * MAX_MOBILE_DIMENSION) / width);
          width = MAX_MOBILE_DIMENSION;
        }
        if (height > MAX_MOBILE_DIMENSION) {
          width = Math.round((width * MAX_MOBILE_DIMENSION) / height);
          height = MAX_MOBILE_DIMENSION;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          canvas.width = 0;
          canvas.height = 0;
          safeResolve(dataUrl);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        canvas.width = 0;
        canvas.height = 0;
        safeResolve(compressed);
      } catch (err) {
        safeResolve(dataUrl);
      }
    };

    img.onerror = () => {
      clearTimeout(timeoutTimer);
      safeResolve(dataUrl);
    };

    img.src = dataUrl;
  });
}

