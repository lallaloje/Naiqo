/**
 * Image compression and validation utilities for nail analysis
 */

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

export interface ImageValidation {
  isValid: boolean;
  error?: string;
  warning?: string;
}

const MAX_DIMENSION = 1024;
const QUALITY = 0.8;
const MAX_SIZE_MB = 2;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

/**
 * Validates an image file before processing
 */
export const validateImage = (file: File): ImageValidation => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'Formato no válido. Usa JPG, PNG o WebP'
    };
  }

  if (file.size > 20 * 1024 * 1024) {
    return {
      isValid: false,
      error: 'Imagen muy grande. Máximo 20MB'
    };
  }

  return { isValid: true };
};

/**
 * Compresses and resizes an image to max 1024x1024 at 80% quality
 */
export const compressImage = (file: File): Promise<CompressionResult> => {
  return new Promise((resolve, reject) => {
    const originalSize = file.size;
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('No se pudo crear contexto de canvas'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw with smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Error al comprimir imagen'));
            return;
          }

          const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now()
          });

          resolve({
            file: compressedFile,
            originalSize,
            compressedSize: blob.size,
            width,
            height
          });
        },
        'image/jpeg',
        QUALITY
      );
    };

    img.onerror = () => {
      reject(new Error('Error al cargar la imagen'));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Analyzes image quality (brightness, blur detection)
 */
export const analyzeImageQuality = (file: File): Promise<{ isBright: boolean; warning?: string }> => {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve({ isBright: true });
      return;
    }

    img.onload = () => {
      // Sample at smaller size for performance
      const sampleSize = 100;
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
      const data = imageData.data;

      // Calculate average brightness
      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Perceived brightness formula
        totalBrightness += (0.299 * r + 0.587 * g + 0.114 * b);
      }

      const avgBrightness = totalBrightness / (data.length / 4);
      const isBright = avgBrightness > 50;

      if (!isBright) {
        resolve({
          isBright: false,
          warning: 'La imagen parece oscura. Para mejores resultados, usa buena iluminación.'
        });
      } else {
        resolve({ isBright: true });
      }

      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      resolve({ isBright: true });
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Generates a hash for cache key based on image content
 */
export const generateImageHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
};

/**
 * Cache management for analysis results
 */
const CACHE_KEY = 'naiqo_analysis_cache';
const CACHE_EXPIRY_HOURS = 1;

interface CachedResult {
  hash: string;
  result: unknown;
  timestamp: number;
}

export const getCachedResult = (hash: string): unknown | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const cacheData: CachedResult[] = JSON.parse(cached);
    const now = Date.now();
    const expiryMs = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

    const entry = cacheData.find(c => c.hash === hash && (now - c.timestamp) < expiryMs);
    return entry?.result || null;
  } catch {
    return null;
  }
};

export const setCachedResult = (hash: string, result: unknown): void => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    let cacheData: CachedResult[] = cached ? JSON.parse(cached) : [];
    
    const now = Date.now();
    const expiryMs = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

    // Remove expired and current hash entries
    cacheData = cacheData.filter(c => c.hash !== hash && (now - c.timestamp) < expiryMs);

    // Add new entry
    cacheData.push({ hash, result, timestamp: now });

    // Keep only last 10 entries
    if (cacheData.length > 10) {
      cacheData = cacheData.slice(-10);
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Offline queue management
 */
const OFFLINE_QUEUE_KEY = 'naiqo_offline_queue';

interface QueuedImage {
  id: string;
  dataUrl: string;
  timestamp: number;
  sessionId: string;
}

export const isOnline = (): boolean => navigator.onLine;

export const queueImageForLater = async (file: File, sessionId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const id = `offline_${Date.now()}`;
        const queued: QueuedImage = {
          id,
          dataUrl: reader.result as string,
          timestamp: Date.now(),
          sessionId
        };

        const cached = localStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue: QueuedImage[] = cached ? JSON.parse(cached) : [];
        queue.push(queued);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

        resolve(id);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Error al guardar imagen'));
    reader.readAsDataURL(file);
  });
};

export const getOfflineQueue = (): QueuedImage[] => {
  try {
    const cached = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

export const clearOfflineQueueItem = (id: string): void => {
  try {
    const cached = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!cached) return;

    const queue: QueuedImage[] = JSON.parse(cached);
    const filtered = queue.filter(q => q.id !== id);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  } catch {
    // Ignore
  }
};
