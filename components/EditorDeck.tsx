import React, { useState, useEffect } from 'react';
import { Wand2, Loader2, ImageIcon, Info, Maximize2, Download, X, Eye, EyeOff, Camera } from 'lucide-react';
import { ImageResolution, AspectRatio, EditorTransferData, CameraShotType, SHOT_CATEGORIES } from '../types';
import { generateImageFromReference } from '../services/geminiService';
import { resolveSrc } from '../services/imageUtils';
import { ImageUploader } from './ImageUploader';

interface EditorDeckProps {
    initialData?: EditorTransferData | null;
}

export const EditorDeck: React.FC<EditorDeckProps> = ({ initialData }) => {
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    
    // Provenance Data
    const [usedPrompt, setUsedPrompt] = useState('');
    const [isPromptVisible, setIsPromptVisible] = useState(false);
    
    const [resolution, setResolution] = useState<ImageResolution>(ImageResolution.RES_2K);
    const [aspectRatio, setAspectRatio] = useState<string>(AspectRatio.LANDSCAPE);
    
    // Granular Camera Controls
    const [shotDistance, setShotDistance] = useState<string>('');
    const [shotVertical, setShotVertical] = useState<string>('');
    const [shotHorizontal, setShotHorizontal] = useState<string>('');
    const [shotOptics, setShotOptics] = useState<string>('');

    const [isProcessing, setIsProcessing] = useState(false);
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
    
    // Style refs for editor
    const [refImages, setRefImages] = useState<string[]>([]);

    useEffect(() => {
        if (initialData) {
            // Do NOT set resultImage from initialData, keep it empty for new generation
            setResultImage(null); 
            setUsedPrompt(initialData.prompt);
            setRefImages(initialData.refImages || []);
            // We don't overwrite the active prompt, user might want to edit it
            setPrompt(""); 
            // Reset visibility on new import
            setIsPromptVisible(false);
        }
    }, [initialData]);

    const getActiveShotArray = (): CameraShotType[] => {
        const shots: CameraShotType[] = [];
        if (shotDistance) shots.push(shotDistance as CameraShotType);
        if (shotVertical) shots.push(shotVertical as CameraShotType);
        if (shotHorizontal) shots.push(shotHorizontal as CameraShotType);
        if (shotOptics) shots.push(shotOptics as CameraShotType);
        return shots;
    };

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsProcessing(true);
        setResultImage(null);
        try {
            // New logic: Text + Refs -> Generation (No source image)
            const result = await generateImageFromReference(
                prompt, 
                resolution, 
                refImages, 
                aspectRatio,
                getActiveShotArray()
            );
            setResultImage(result); 
        } catch (err) {
            console.error(err);
            alert("Generation failed: " + (err as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full relative">
            
            {/* Fullscreen Preview Modal */}
            {fullscreenImage && (
                <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
                    <button 
                        className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                        onClick={() => setFullscreenImage(null)}
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img 
                        src={resolveSrc(fullscreenImage)}
                        className="max-w-full max-h-full object-contain shadow-2xl shadow-black" 
                        onClick={(e) => e.stopPropagation()} 
                        alt="Fullscreen Preview"
                    />
                </div>
            )}

            <div className="lg:col-span-3 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                 
                 {/* Optional Prompt Field */}
                 {usedPrompt && (
                    <div className="space-y-2">
                        <button 
                            onClick={() => setIsPromptVisible(!isPromptVisible)}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded flex items-center justify-center gap-2 border border-slate-700 transition-all"
                        >
                            {isPromptVisible ? (
                                <> <EyeOff className="w-3 h-3" /> HIDE REMASTERED SOURCE PROMPT </>
                            ) : (
                                <> <Eye className="w-3 h-3" /> SHOW REMASTERED SOURCE PROMPT </>
                            )}
                        </button>
                        
                        {isPromptVisible && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2 mb-2">
                                    <Info className="w-3 h-3" /> SOURCE PROMPT
                                </label>
                                <textarea 
                                    readOnly
                                    value={usedPrompt}
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded p-3 text-sm text-slate-400 italic min-h-[120px] max-h-[400px] overflow-y-auto custom-scrollbar resize-y outline-none focus:border-amber-500/50"
                                />
                            </div>
                        )}
                    </div>
                 )}

                 <div className="space-y-2">
                    <div className="flex flex-col">
                        <label className="text-sm font-semibold text-amber-500 uppercase">Text Prompt</label>
                        <span className="text-[10px] text-slate-400">(Refer to image 1 as the image you are editing. E.g. "Change the background of image 1 to a snowy forest")</span>
                    </div>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-amber-500 outline-none resize-none text-slate-200"
                        placeholder="Describe the image you want to generate using the reference styles..."
                    />
                </div>

                <ImageUploader 
                    images={refImages} 
                    setImages={setRefImages} 
                    label="REFERENCES" 
                    maxImages={14} 
                    allowReplace={true}
                    subLabel="(place characters, styles, scenes, props here)"
                />
                
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-amber-500 uppercase">Settings</label>
                    <div className="grid grid-cols-1 gap-2">
                        <select 
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value as ImageResolution)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-300 outline-none"
                        >
                            <option value={ImageResolution.RES_1K}>1K (Fast)</option>
                            <option value={ImageResolution.RES_2K}>2K (Standard)</option>
                            <option value={ImageResolution.RES_4K}>4K (High Quality)</option>
                        </select>
                        <select 
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-300 outline-none"
                        >
                            <option value={AspectRatio.PORTRAIT}>9:16 Portrait</option>
                            <option value={AspectRatio.LANDSCAPE}>16:9 Landscape</option>
                            <option value={AspectRatio.CINEMATIC}>21:9 Cinematic</option>
                        </select>
                    </div>

                    {/* New Shot Type Grid */}
                    <div className="relative pt-2 mt-2 border-t border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                             <Camera className="w-4 h-4 text-amber-500" />
                             <label className="text-sm font-bold text-slate-400 uppercase">Shot Type</label>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                 <label className="text-[10px] text-slate-500 block mb-1">Distance & Scale</label>
                                 <select
                                    value={shotDistance}
                                    onChange={(e) => setShotDistance(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px] text-slate-300 outline-none"
                                >
                                    <option value="">Default (Auto)</option>
                                    {SHOT_CATEGORIES.DISTANCE.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                                </select>
                             </div>
                             <div>
                                 <label className="text-[10px] text-slate-500 block mb-1">Vertical Angle</label>
                                 <select
                                    value={shotVertical}
                                    onChange={(e) => setShotVertical(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px] text-slate-300 outline-none"
                                >
                                    <option value="">Default (Auto)</option>
                                    {SHOT_CATEGORIES.VERTICAL.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                                </select>
                             </div>
                             <div>
                                 <label className="text-[10px] text-slate-500 block mb-1">Horizontal</label>
                                 <select
                                    value={shotHorizontal}
                                    onChange={(e) => setShotHorizontal(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px] text-slate-300 outline-none"
                                >
                                    <option value="">Default (Auto)</option>
                                    {SHOT_CATEGORIES.HORIZONTAL.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                                </select>
                             </div>
                             <div>
                                 <label className="text-[10px] text-slate-500 block mb-1">Lens & Optics</label>
                                 <select
                                    value={shotOptics}
                                    onChange={(e) => setShotOptics(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px] text-slate-300 outline-none"
                                >
                                    <option value="">Default (Auto)</option>
                                    {SHOT_CATEGORIES.OPTICS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                                </select>
                             </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isProcessing || !prompt}
                    className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                        isProcessing 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                    }`}
                >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Wand2 />}
                    {isProcessing ? 'GENERATE' : 'GENERATE'}
                </button>
            </div>

            <div className="lg:col-span-9 flex items-center justify-center bg-black/50 rounded-xl border border-slate-800 p-0 relative h-full min-h-[500px] overflow-hidden group">
                {resultImage ? (
                    <>
                        <img src={resolveSrc(resultImage)} className="max-w-full max-h-full object-contain shadow-2xl" alt="Result" />
                        
                        {/* Overlay Controls */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => setFullscreenImage(resultImage)}
                                className="p-2 bg-black/60 rounded-full text-slate-300 hover:text-white hover:bg-black/90 transition-all"
                                title="Fullscreen Preview"
                             >
                                 <Maximize2 className="w-5 h-5" />
                             </button>
                             <a 
                                href={resolveSrc(resultImage)}
                                download="nano-edit-result.png"
                                className="p-2 bg-black/60 rounded-full text-slate-300 hover:text-white hover:bg-black/90 transition-all"
                                title="Download"
                             >
                                 <Download className="w-5 h-5" />
                             </a>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center text-slate-700">
                        <ImageIcon className="w-24 h-24 mb-4 opacity-20" />
                        <p className="text-sm font-mono uppercase tracking-widest">No Image Generated</p>
                    </div>
                )}

                {isProcessing && (
                     <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                        <p className="text-purple-400 font-mono animate-pulse">Nano Banana Pro Processing...</p>
                    </div>
                )}
            </div>
        </div>
    );
}