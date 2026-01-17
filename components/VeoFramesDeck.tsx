import React, { useState } from 'react';
import { Video, Loader2, Upload, Image as ImageIcon, Trash2, Camera } from 'lucide-react';
import { VeoModel, AspectRatio, ProjectState } from '../types';
import { generateVideoVeo } from '../services/geminiService';
import { fileToBase64, stripMime, resolveSrc } from '../services/imageUtils';
import { saveVideo, getProjectFolderName } from '../services/fileSystemService';

interface VeoFramesDeckProps {
    projectState?: ProjectState | null;
    userGallery?: string[];
}

export const VeoFramesDeck: React.FC<VeoFramesDeckProps> = ({ projectState, userGallery = [] }) => {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<VeoModel>(VeoModel.FAST);
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  // Inputs
  const [startImage, setStartImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string | null) => void) => {
      if(e.target.files?.[0]) {
          const b64 = await fileToBase64(e.target.files[0]);
          setter(stripMime(b64));
      }
  }

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setVideoUrl(null);

    try {
      const url = await generateVideoVeo(
          prompt, 
          model, 
          aspectRatio, 
          startImage || undefined, 
          endImage || undefined
      );

      // Autosave if active
      if (getProjectFolderName()) {
          const resp = await fetch(url);
          const blob = await resp.blob();
          await saveVideo(blob, 'VeoFrames');
      }

      setVideoUrl(url);
    } catch (err) {
      alert("Video Generation Error: " + (err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderUploadBox = (label: string, value: string | null, setter: (v: string | null) => void) => (
      <div className="space-y-1">
          <label className="text-xs text-slate-400">{label}</label>
          <div className="relative aspect-video bg-slate-900 border border-dashed border-slate-700 rounded flex items-center justify-center overflow-hidden hover:border-amber-500/50 transition-colors cursor-pointer group">
              {value ? (
                  <>
                    <img src={resolveSrc(value)} className="w-full h-full object-cover" alt={label} />
                    <button 
                        onClick={(e) => { e.stopPropagation(); setter(null); }}
                        className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 text-white rounded p-1.5 transition-all opacity-0 group-hover:opacity-100 z-10"
                        title="Remove Image"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                  </>
              ) : (
                  <Upload className="w-4 h-4 text-slate-600" />
              )}
              <input type="file" onChange={(e) => handleUpload(e, setter)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
          </div>
      </div>
  );

  const renderGalleryAsset = (img: string, i: number) => (
    <div key={i} className="group relative rounded overflow-hidden border border-slate-800 hover:border-amber-500 transition-all">
        <img src={resolveSrc(img)} className="w-full h-auto" />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity p-2">
            <button 
                onClick={() => setStartImage(img)}
                className="text-[10px] bg-amber-600 hover:bg-amber-500 text-white px-2 py-1 rounded w-full"
            >
                Set Start
            </button>
            <button 
                onClick={() => setEndImage(img)}
                className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded w-full"
            >
                Set End
            </button>
        </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      
      {/* Configuration Column */}
      <div className="lg:col-span-3 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Camera className="w-5 h-5 text-amber-500" /> Frames-to-Video</h2>
        <div className="space-y-2">
            <label className="text-sm font-semibold text-amber-500 uppercase">Prompt</label>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-amber-500 outline-none resize-none text-slate-200"
                placeholder="Describe the motion..."
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-xs text-slate-400 block mb-1">Model</label>
                <select 
                    value={model} 
                    onChange={(e) => setModel(e.target.value as VeoModel)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white outline-none"
                >
                    <option value={VeoModel.FAST}>Veo 3.1 Fast</option>
                    <option value={VeoModel.QUALITY}>Veo 3.1 Quality</option>
                </select>
            </div>
            <div>
                <label className="text-xs text-slate-400 block mb-1">Aspect Ratio</label>
                <select 
                    value={aspectRatio} 
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white outline-none"
                >
                    <option value="16:9">16:9 Landscape</option>
                    <option value="9:16">9:16 Portrait</option>
                    <option value={AspectRatio.CINEMATIC}>21:9 Cinematic</option>
                </select>
            </div>
        </div>

        {/* Start/End Frames */}
        <div className="grid grid-cols-2 gap-4">
             {renderUploadBox("Start Frame", startImage, setStartImage)}
             {renderUploadBox("End Frame", endImage, setEndImage)}
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt}
          className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            isGenerating 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white'
          }`}
        >
          {isGenerating ? <Loader2 className="animate-spin" /> : <Video />}
          {isGenerating ? 'GENERATING...' : 'GENERATE'}
        </button>
      </div>

      {/* Main Preview Area */}
      <div className="lg:col-span-6 flex items-center justify-center bg-black rounded-xl border border-slate-800 overflow-hidden relative min-h-[400px]">
          {videoUrl ? (
              <video controls autoPlay loop className="max-w-full max-h-full">
                  <source src={videoUrl} type="video/mp4" />
              </video>
          ) : (
              <div className="text-slate-600 flex flex-col items-center">
                  <Video className="w-20 h-20 mb-4 opacity-20" />
                  <p>Video Output Preview</p>
              </div>
          )}
          
          {isGenerating && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
                  <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
                  <p className="text-green-500 font-mono animate-pulse">Rendering on Veo 3.1...</p>
              </div>
          )}
      </div>

      {/* Assets Sidebar */}
      <div className="lg:col-span-3 border-l border-slate-800 pl-4 flex flex-col h-full overflow-hidden">
          <div className="mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-500" />
                  AVAILABLE ASSETS
              </h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
              
              {/* User Gallery */}
              {userGallery.length > 0 && (
                  <div className="space-y-2">
                      <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider">User Gallery</h4>
                      <div className="grid grid-cols-2 gap-2">
                          {userGallery.map((img, i) => renderGalleryAsset(img, i))}
                      </div>
                  </div>
              )}

              {/* Director Assets */}
              {projectState && (
                <>
                  {projectState.finalImages.length > 0 && (
                     <div className="space-y-2">
                         <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Current Session</h4>
                         <div className="grid grid-cols-2 gap-2">
                             {projectState.finalImages.map((img, i) => renderGalleryAsset(img, i))}
                         </div>
                     </div>
                  )}
                  {projectState.history.map((h, hIdx) => (
                      <div key={hIdx} className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">History #{projectState.history.length - hIdx}</h4>
                           <div className="grid grid-cols-2 gap-2">
                             {h.finalImages.map((img, i) => renderGalleryAsset(img, i))}
                         </div>
                      </div>
                  ))}
                </>
              )}
              
              {(!projectState && userGallery.length === 0) && <p className="text-slate-500 text-xs italic">No assets available.</p>}
          </div>
      </div>
    </div>
  );
};