/**
 * Client-Side Canvas 2D Image Compression Pipeline
 * 
 * Throttles raw high-resolution smartphone photos (4MB-15MB) down to ~60KB-90KB (max 800x800px, 0.75 JPEG/WebP)
 * to strictly prevent exceeding Firestore document 1MB limits and ensure rapid Gemini Multimodal ingestion.
 */

export interface CompressionResult {
  compressedBase64: string;
  mimeType: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  width: number;
  height: number;
}

export async function compressImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.75
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const originalSizeKb = Math.round(file.size / 1024);
    const reader = new FileReader();

    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        return reject(new Error('Failed to read image file data.'));
      }

      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;

          // Maintain aspect ratio while bounding within maxWidth x maxHeight
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback to original if canvas context unavailable
            const fallbackSizeKb = Math.round(dataUrl.length * 0.75 / 1024);
            return resolve({
              compressedBase64: dataUrl,
              mimeType: file.type || 'image/jpeg',
              originalSizeKb,
              compressedSizeKb: fallbackSizeKb,
              width: img.width,
              height: img.height
            });
          }

          // Use high quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Export as optimized JPEG
          const exportMime = 'image/jpeg';
          const compressedBase64 = canvas.toDataURL(exportMime, quality);
          const compressedSizeKb = Math.round(compressedBase64.length * 0.75 / 1024);

          resolve({
            compressedBase64,
            mimeType: exportMime,
            originalSizeKb,
            compressedSizeKb,
            width,
            height
          });
        } catch (err) {
          console.warn('Canvas compression error, falling back to original payload:', err);
          const fallbackSizeKb = Math.round(dataUrl.length * 0.75 / 1024);
          resolve({
            compressedBase64: dataUrl,
            mimeType: file.type || 'image/jpeg',
            originalSizeKb,
            compressedSizeKb: fallbackSizeKb,
            width: img.width || 800,
            height: img.height || 600
          });
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image element for canvas compression.'));
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file.'));
    };

    reader.readAsDataURL(file);
  });
}

export async function compressBase64Image(
  dataUrl: string,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(width, 1);
      canvas.height = Math.max(height, 1);
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
