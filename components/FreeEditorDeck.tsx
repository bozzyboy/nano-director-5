import React, { useState } from 'react';
import { Wand2, Loader2, ImageIcon, Maximize2, Download, X, Camera, Plus } from 'lucide-react';
import { ImageResolution, AspectRatio, CameraShotType, SHOT_CATEGORIES, ProjectState } from '../types';
import { generateImageFromReference } from '../services/geminiService';
import { base64ToBlob, resolveSrc } from '../services/imageUtils';
import { saveUserImage, getProjectFolderName } from '../services/fileSystemService';
import { ImageUploader } from './ImageUploader';

interface FreeEditorDeckProps {
    onImageGenerated: (image: string) => void;
    userGallery: string[];
    projectState?: ProjectState | null;
}

export const FreeEditorDeck: React.FC<FreeEditorDeckProps> = ({ onImageGenerated, userGallery, projectState }) => {
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    
    const [resolution, setResolution] = useState<ImageResolution>(ImageResolution.RES_2K);
    const [aspectRatio, setAspectRatio] = useState<string>(AspectRatio.LANDSCAPE);
    
    // Granular Camera Controls
    const [shotDistance, setShotDistance] = useState<string>('');
    const [shotVertical, setShotVertical] = useState<string>('');
    const [shotHorizontal, setShotHorizontal] = useState<string>('');
    const [shotOptics, setShotOptics] = useState<string>('');

    const [isProcessing, setIsProcessing] = useState(false);
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
    
    const [refImages, setRefImages] = useState<string[]>([]);

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
            const resultBase64 = await generateImageFromReference(
                prompt, 
                resolution, 
                refImages, 
                aspectRatio,
                getActiveShotArray()
            );
            
            let displayImage = resultBase64;
            
            // Auto-Save if FS active
            if (getProjectFolderName()) {
                const blob = base64ToBlob(resultBase64);
                await saveUserImage(blob);
                displayImage = URL.createObjectURL(blob);
            }

            setResultImage(displayImage);
            onImageGenerated(displayImage);
        } catch (err) {
            console.error(err);
            alert("Generation failed: " + (err as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    const addReference = (img: string) => {
        if (refImages.includes(img)) return;
        setRefImages(prev => [...prev, img].slice(0, 14));
    };

    const renderAsset = (img: string, i: number) => (
        <div key={i} className="group relative rounded overflow-hidden border border-slate-800 hover:border-amber-500 transition-all cursor-pointer" onClick={() => addReference(img)}>
            <img src={resolveSrc(img)} className="w-full h-auto" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Plus className="w-5 h-5 text-white" />
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full relative">
            {fullscreenImage && (
                <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
                    <button 
                        className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                        onClick={() => setFullscreenImage(null)}
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img src={resolveSrc(fullscreenImage)} className="max-w-full max-h-full object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
                </div>
            )}

            <div className="lg:col-span-3 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                 <div className="space-y-2">
                    <label className="text-sm font-semibold text-amber-500 uppercase">Free Text Prompt</label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-amber-500 outline-none resize-none text-slate-200"
                        placeholder="Describe the image you want to generate..."
                    />
                </div>

                <ImageUploader 
                    images={refImages} 
                    setImages={setRefImages} 
                    label="REFERENCES (OPTIONAL)" 
                    maxImages={14} 
                    allowReplace={true}
                    subLabel="(styles, characters, props)"
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
                            <option value={AspectRatio.SQUARE}>1:1 Square</option>
                        </select>
                        
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
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isProcessing || !prompt}
                    className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                        isProcessing 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                    }`}
                >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Wand2 />}
                    {isProcessing ? 'GENERATING...' : 'GENERATE'}
                </button>
            </div>

            <div className="lg:col-span-6 flex flex-col gap-4 h-full overflow-hidden">
                <div className="flex-1 bg-black/50 rounded-xl border border-slate-800 relative overflow-hidden group min-h-[400px] flex items-center justify-center">
                    {resultImage ? (
                        <>
                            <img src={resolveSrc(resultImage)} className="max-w-full max-h-full object-contain shadow-2xl" alt="Result" />
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button 
                                    onClick={() => setFullscreenImage(resultImage)}
                                    className="p-2 bg-black/60 rounded-full text-slate-300 hover:text-white hover:bg-black/90 transition-all"
                                 >
                                     <Maximize2 className="w-5 h-5" />
                                 </button>
                                 <a 
                                    href={resolveSrc(resultImage)}
                                    download="free-edit-result.png"
                                    className="p-2 bg-black/60 rounded-full text-slate-300 hover:text-white hover:bg-black/90 transition-all"
                                 >
                                     <Download className="w-5 h-5" />
                                 </a>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-slate-700">
                            <ImageIcon className="w-24 h-24 mb-4 opacity-20" />
                            <p className="text-sm font-mono uppercase tracking-widest">Generate an Image</p>
                        </div>
                    )}
                    {isProcessing && (
                         <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                            <p className="text-emerald-400 font-mono animate-pulse">Generating...</p>
                        </div>
                    )}
                </div>

                <div className="h-40 bg-slate-900/50 border-t border-slate-800 p-4 overflow-x-auto custom-scrollbar">
                    <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase">Your Generations</h4>
                    <div className="flex gap-2">
                        {userGallery.length === 0 && <span className="text-xs text-slate-600 italic">No images yet.</span>}
                        {userGallery.map((img, i) => (
                            <div key={i} className="h-28 aspect-square flex-shrink-0 rounded border border-slate-700 overflow-hidden cursor-pointer hover:border-emerald-500 transition-all" onClick={() => setResultImage(img)}>
                                <img src={resolveSrc(img)} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-3 border-l border-slate-800 pl-4 flex flex-col h-full overflow-hidden">
                <div className="mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-amber-500" />
                        SESSION ASSETS
                    </h3>
                    <p className="text-[10px] text-slate-500 italic mt-1">Click to add as reference</p>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                    {projectState && (
                        <>
                            {projectState.finalImages.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Director Panels</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {projectState.finalImages.map((img, i) => renderAsset(img, i))}
                                    </div>
                                </div>
                            )}
                            {projectState.history.map((h, hIdx) => (
                                <div key={hIdx} className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">History #{projectState.history.length - hIdx}</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {h.finalImages.map((img, i) => renderAsset(img, i))}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                    {!projectState && <p className="text-slate-500 text-xs italic">No director panels yet.</p>}
                </div>
            </div>
        </div>
    );
}
