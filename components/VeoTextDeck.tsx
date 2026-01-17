import React, { useState } from 'react';
import { Video, Loader2, Type } from 'lucide-react';
import { VeoModel, AspectRatio } from '../types';
import { generateVideoVeo } from '../services/geminiService';
import { saveVideo, getProjectFolderName } from '../services/fileSystemService';

export const VeoTextDeck: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<VeoModel>(VeoModel.FAST);
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setVideoUrl(null);

    try {
      const url = await generateVideoVeo(
          prompt, 
          model, 
          aspectRatio
      );

      // Autosave
      if (getProjectFolderName()) {
          const resp = await fetch(url);
          const blob = await resp.blob();
          await saveVideo(blob, 'VeoText');
      }

      setVideoUrl(url);
    } catch (err) {
      alert("Video Generation Error: " + (err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      
      {/* Configuration Column */}
      <div className="lg:col-span-3 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Type className="w-5 h-5 text-amber-500" /> Text-to-Video</h2>
        
        <div className="space-y-2">
            <label className="text-sm font-semibold text-amber-500 uppercase">Prompt</label>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-amber-500 outline-none resize-none text-slate-200"
                placeholder="A cinematic drone shot of a futuristic city..."
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

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt}
          className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            isGenerating 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white'
          }`}
        >
          {isGenerating ? <Loader2 className="animate-spin" /> : <Video />}
          {isGenerating ? 'GENERATING...' : 'GENERATE'}
        </button>
      </div>

      {/* Main Preview Area */}
      <div className="lg:col-span-9 flex items-center justify-center bg-black rounded-xl border border-slate-800 overflow-hidden relative min-h-[400px]">
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
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                  <p className="text-blue-500 font-mono animate-pulse">Rendering on Veo 3.1...</p>
              </div>
          )}
      </div>
    </div>
  );
};