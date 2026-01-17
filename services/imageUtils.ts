/**
 * Splits a base64 image into an NxN grid.
 * Returns an array of N*N base64 strings (without data prefix).
 */
export const splitImageIntoGrid = async (base64Data: string, gridSize: number): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Handle CORS if using blob URLs
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      
      // Calculate cell dimensions based on dynamic gridSize (2, 3, or 4)
      const cellW = Math.floor(w / gridSize);
      const cellH = Math.floor(h / gridSize);

      const cells: string[] = [];

      try {
        // Loop rows then columns
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const canvas = document.createElement('canvas');
                canvas.width = cellW;
                canvas.height = cellH;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error("Could not get canvas context");

                const x = col * cellW;
                const y = row * cellH;

                ctx.drawImage(img, x, y, cellW, cellH, 0, 0, cellW, cellH);
                
                // Get data URL and strip prefix
                const dataUrl = canvas.toDataURL('image/png');
                cells.push(dataUrl.split(',')[1]);
            }
        }
        resolve(cells);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (err) => reject(err);
    // Handle both raw base64 and data URIs
    img.src = base64Data.startsWith('data:') || base64Data.startsWith('blob:') 
        ? base64Data 
        : `data:image/png;base64,${base64Data}`;
  });
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Return raw base64 without mime prefix if needed, but usually we keep it for preview
      resolve(result); 
    };
    reader.onerror = error => reject(error);
  });
};

export const stripMime = (dataUrl: string): string => {
  if (!dataUrl.includes(',')) return dataUrl;
  return dataUrl.split(',')[1];
};

/**
 * Resizes a base64 image to a target width while maintaining aspect ratio.
 * Used for optimizing LLM analysis payloads.
 */
export const resizeImage = (source: string, targetWidth: number = 512): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const scale = targetWidth / img.width;
            const targetHeight = img.height * scale;

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Canvas context failed"));
                return;
            }

            // High quality scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // Use JPEG 80% for smaller payload
            resolve(dataUrl.split(',')[1]);
        };
        img.onerror = (e) => reject(e);
        img.src = source.startsWith('data:') || source.startsWith('blob:') 
            ? source 
            : `data:image/png;base64,${source}`;
    });
};

export const base64ToBlob = (base64: string, mimeType: string = 'image/png'): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

// Helper to handle mixed sources (Blob URL, Data URI, Raw Base64) in components
export const resolveSrc = (src: string): string => {
    if (!src) return '';
    if (src.startsWith('blob:') || src.startsWith('data:')) return src;
    return `data:image/png;base64,${src}`;
};

// Converts a Blob URL back to Base64 (needed for API calls)
export const blobUrlToBase64 = async (blobUrl: string): Promise<string> => {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    const base64WithMime = await fileToBase64(blob as File);
    return stripMime(base64WithMime);
};