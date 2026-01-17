import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { fileToBase64, stripMime, resolveSrc } from '../services/imageUtils';

interface ImageUploaderProps {
  images: string[];
  setImages: (images: string[]) => void;
  maxImages?: number;
  label?: string;
  subLabel?: string;
  allowReplace?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
    images, 
    setImages, 
    maxImages = 14, 
    label = "Reference Images",
    subLabel = "",
    allowReplace = true
}) => {
  const mainInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number>(-1);

  const handleMainFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        // Uploads always converted to base64 for API compatibility
        const base64 = await fileToBase64(e.target.files[i]);
        newImages.push(stripMime(base64));
      }
      setImages([...images, ...newImages].slice(0, maxImages));
    }
  };

  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && replaceIndexRef.current !== -1) {
          const base64 = await fileToBase64(e.target.files[0]);
          const newImages = [...images];
          newImages[replaceIndexRef.current] = stripMime(base64);
          setImages(newImages);
          replaceIndexRef.current = -1;
      }
  }

  const handleImageClick = (index: number) => {
      if (allowReplace) {
          replaceIndexRef.current = index;
          replaceInputRef.current?.click();
      }
  }

  const removeImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">{label}</label>
            {subLabel && <span className="text-[10px] text-slate-500">{subLabel}</span>}
        </div>
        <span className="text-xs text-slate-600">{images.length} / {maxImages}</span>
      </div>
      
      <div className="grid grid-cols-4 gap-x-2 gap-y-6">
        {images.map((img, idx) => (
          <div key={idx} className="relative">
             {/* Number Label */}
             <div className="absolute -top-5 left-0 w-full text-center text-[10px] text-slate-500 font-mono">
                 {idx + 1}
             </div>
             
             <div 
                onClick={() => handleImageClick(idx)}
                className="relative aspect-square group rounded-lg overflow-hidden border border-slate-700 cursor-pointer hover:border-amber-500 transition-colors"
                title="Click to replace"
             >
                <img 
                src={resolveSrc(img)}
                alt={`Ref ${idx+1}`} 
                className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all" />
                <button 
                onClick={(e) => removeImage(idx, e)}
                className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                <X className="w-3 h-3" />
                </button>
             </div>
          </div>
        ))}
        
        {images.length < maxImages && (
          <div className="relative mt-0">
             <div className="absolute -top-5 left-0 w-full text-center text-[10px] text-slate-600 font-mono">
                 {images.length + 1}
             </div>
             <div 
                onClick={() => mainInputRef.current?.click()}
                className="aspect-square border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-amber-500/50 hover:bg-slate-800/50 transition-colors"
             >
                <Upload className="w-6 h-6 text-slate-500 mb-1" />
                <span className="text-xs text-slate-500">Upload</span>
             </div>
          </div>
        )}
      </div>
      
      {/* Main Upload Input */}
      <input 
        type="file" 
        multiple 
        ref={mainInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleMainFileChange}
      />

      {/* Hidden Replace Input */}
      <input 
        type="file" 
        ref={replaceInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleReplaceFileChange}
      />
    </div>
  );
};