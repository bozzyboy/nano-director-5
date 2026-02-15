import React, { useState, useEffect, useRef } from 'react';
import { Play, Loader2, Film, Download, Save, History, FolderOpen, Upload, Cloud, Grid2X2, Grid3X3, CheckCircle, LayoutGrid, Layers, Maximize2, X, Send, MousePointerClick, RefreshCw, HardDrive, FileJson, ChevronDown, Sliders, Palette, FileEdit, Plus, Replace } from 'lucide-react';
import { ImageResolution, AspectRatio, ScriptResponse, ProjectHistoryItem, ProjectState, EditorTransferData, StylePreferences, CameraShotType, SHOT_CATEGORIES } from '../types';
import { generateScriptAndPrompt, generateBaseGridOptions, remasterQuadrant, extractSpecificShotPrompt, regenerateGridPromptOnly } from '../services/geminiService';
import { splitImageIntoGrid, resizeImage, base64ToBlob, resolveSrc, blobUrlToBase64 } from '../services/imageUtils';
import { saveDirectorAssetBatch, getProjectFolderName } from '../services/fileSystemService';
import { ImageUploader } from './ImageUploader';

interface DirectorDeckProps {
    onSaveProject?: (data: ProjectState, method: 'cloud' | 'local' | 'download') => void;
    onLoadProject?: (method: 'cloud' | 'local' | 'upload') => void;
    loadedProject?: ProjectState | null;
    onSendToEditor?: (data: EditorTransferData) => void;
    onProjectUpdate?: (data: ProjectState) => void;
    
    // Status props
    activeFolderName: string | null;
    isCloudActive: boolean;
}

export const DirectorDeck: React.FC<DirectorDeckProps> = ({ 
    onSaveProject, 
    onLoadProject, 
    loadedProject, 
    onSendToEditor,
    onProjectUpdate,
    activeFolderName,
    isCloudActive
}) => {
  const [projectName, setProjectName] = useState('');
  const [storyIdea, setStoryIdea] = useState('');
  
  // Resolution Settings
  const [gridResolution, setGridResolution] = useState<ImageResolution>(ImageResolution.RES_2K);
  const [panelResolution, setPanelResolution] = useState<ImageResolution>(ImageResolution.RES_2K);
  const [aspectRatio, setAspectRatio] = useState<string>(AspectRatio.LANDSCAPE);
  
  // Pro Settings
  const [gridSize, setGridSize] = useState<number>(2); 
  const [candidateCount, setCandidateCount] = useState<number>(2);
  const [refImages, setRefImages] = useState<string[]>([]);
  
  // New: Style & Script Editing
  const [stylePrefs, setStylePrefs] = useState<StylePreferences>({ 
      mode: 'DEFAULT',
      // Default negative prompt as requested
      customNegative: "no text, no watermark, no grid lines, no grid outlines, no dividing lines, no white borders, no black borders, no frames, no gutters, no blur, no distortion, no bad anatomy"
  });
  
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [isScriptDirty, setIsScriptDirty] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  
  // Outputs
  const [script, setScript] = useState<ScriptResponse | null>(null);
  
  // Phase 1: Candidates
  const [gridCandidates, setGridCandidates] = useState<string[]>([]);
  
  // Selection & Direction State
  const [focusedGridIndex, setFocusedGridIndex] = useState<number | null>(null);
  const [directedGridIndex, setDirectedGridIndex] = useState<number | null>(null);
  
  const [extractingIndex, setExtractingIndex] = useState<number | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Phase 2: Final
  const [finalImages, setFinalImages] = useState<string[]>([]);

  // Optimization: Background Prompt Extraction
  const [promptCache, setPromptCache] = useState<Record<number, string>>({});
  const promptPromisesRef = useRef<Record<number, Promise<string>>>({});

  // History
  const [history, setHistory] = useState<ProjectHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Sync state to parent
  useEffect(() => {
    if (onProjectUpdate) {
        const currentState: ProjectState = {
            projectName,
            storyIdea,
            resolution: panelResolution,
            gridResolution,
            aspectRatio,
            gridSize,
            candidateCount,
            refImages,
            script,
            gridCandidates,
            selectedGridIndex: directedGridIndex,
            finalImages,
            history,
            stylePrefs,
            isScriptDirty,
            cameraShots: [] // Director mode doesn't use manual shot overrides
        };
        onProjectUpdate(currentState);
    }
  }, [
      finalImages, history, gridCandidates, script, 
      projectName, storyIdea, panelResolution, gridResolution, 
      aspectRatio, gridSize, candidateCount, refImages, directedGridIndex, 
      stylePrefs, isScriptDirty
  ]);

  useEffect(() => {
    if (loadedProject) {
        setProjectName(loadedProject.projectName || '');
        setStoryIdea(loadedProject.storyIdea || '');
        setPanelResolution(loadedProject.resolution || ImageResolution.RES_2K);
        setGridResolution(loadedProject.gridResolution || ImageResolution.RES_2K);
        setAspectRatio(loadedProject.aspectRatio || AspectRatio.LANDSCAPE);
        setGridSize(loadedProject.gridSize || 2);
        setCandidateCount(loadedProject.candidateCount || 2);
        setRefImages(loadedProject.refImages || []);
        
        setScript(loadedProject.script || null);
        setGridCandidates(loadedProject.gridCandidates || []);
        
        const selIndex = loadedProject.selectedGridIndex ?? null;
        setFocusedGridIndex(selIndex);
        setDirectedGridIndex(selIndex);
        
        setFinalImages(loadedProject.finalImages || []);
        setHistory(loadedProject.history || []);
        
        setStylePrefs(loadedProject.stylePrefs || { 
            mode: 'DEFAULT', 
            customNegative: "no text, no watermark, no grid lines, no grid outlines, no dividing lines, no white borders, no black borders, no frames, no gutters, no blur, no distortion, no bad anatomy"
        });
        
        setIsScriptDirty(loadedProject.isScriptDirty || false);

        // Clear caches on project load
        setPromptCache({});
        promptPromisesRef.current = {};
    }
  }, [loadedProject]);

  // Handle manual script editing
  const handleShotEdit = (index: number, newDesc: string) => {
      if (!script) return;
      const newShots = [...script.shots];
      newShots[index] = { ...newShots[index], description: newDesc };
      setScript({ ...script, shots: newShots });
      setIsScriptDirty(true);
  };

  const handleAppendChange = (val: string) => {
      // Disable override if append is being used
      if (val && stylePrefs.customOverride) {
           alert("You cannot use Append and Override at the same time. Please clear one field.");
           return;
      }
      setStylePrefs({ ...stylePrefs, customAppend: val });
  }
  
  const handleOverrideChange = (val: string) => {
      // Disable append if override is being used
      if (val && stylePrefs.customAppend) {
           alert("You cannot use Append and Override at the same time. Please clear one field.");
           return;
      }
      setStylePrefs({ ...stylePrefs, customOverride: val });
  }

  // Phase 1: Script + Candidates (Enhanced for Regenerate logic)
  const handleInitialGenerate = async () => {
    if (!storyIdea) return;
    setIsGenerating(true);
    // Only reset state if we are starting fresh (no script)
    if (!script) {
        setGridCandidates([]);
        setFocusedGridIndex(null);
        setDirectedGridIndex(null);
        setFinalImages([]);
        setScript(null);
        setPromptCache({});
        promptPromisesRef.current = {};
    } else {
        // If re-rolling with existing script, just clear candidates
        setGridCandidates([]);
        setFocusedGridIndex(null);
        setDirectedGridIndex(null);
        setFinalImages([]);
    }

    try {
      let currentScript = script;

      // Step 1: Develop Script (Only if not exists)
      if (!currentScript) {
          setStatus(`Developing ${gridSize * gridSize}-Shot Script & Cinematic Prompt...`);
          currentScript = await generateScriptAndPrompt(storyIdea, refImages, gridSize);
          setScript(currentScript);
          setIsScriptDirty(false); // Fresh script is clean
      } 
      // Step 1.5: Re-Compile Prompt (If script edited manually)
      else if (isScriptDirty) {
          setStatus("Compiling Manual Edits into New Prompt...");
          const newGridPrompt = await regenerateGridPromptOnly(currentScript, gridSize);
          currentScript = { ...currentScript, gridPrompt: newGridPrompt };
          setScript(currentScript);
          setIsScriptDirty(false); // Edits are now compiled
      }

      // Step 2: Generate N Candidate Grids
      setStatus(`Shooting ${candidateCount} Options (${stylePrefs.mode})...`);
      
      const candidates = await generateBaseGridOptions(
          currentScript!.gridPrompt, 
          aspectRatio, 
          candidateCount, 
          gridResolution,
          stylePrefs,
          [], // No manual camera shots in Director mode
          gridSize // PASS GRID SIZE TO FORCE LAYOUT
      );
      setGridCandidates(candidates);
      
    } catch (err) {
      console.error(err);
      alert('Director error: ' + (err as Error).message);
    } finally {
      setIsGenerating(false);
      setStatus('');
    }
  };

  const triggerPromptExtraction = async (
      imageIndex: number, 
      panelImage: string, 
      globalContext: string, 
      shotDesc: string
  ): Promise<string> => {
      if (promptCache[imageIndex]) return promptCache[imageIndex];
      if (promptPromisesRef.current[imageIndex]) return promptPromisesRef.current[imageIndex];

      const task = (async () => {
          try {
              let sourceForAnalysis = panelImage;
              if (panelImage.startsWith('blob:')) {
                  sourceForAnalysis = await blobUrlToBase64(panelImage);
              }
              const resizedImage = await resizeImage(sourceForAnalysis, 512);
              const result = await extractSpecificShotPrompt(resizedImage, globalContext, shotDesc);
              setPromptCache(prev => ({ ...prev, [imageIndex]: result }));
              return result;
          } catch (e) {
              console.error(`Prompt extraction failed for panel ${imageIndex}`, e);
              return shotDesc;
          } finally {
              delete promptPromisesRef.current[imageIndex];
          }
      })();

      promptPromisesRef.current[imageIndex] = task;
      return task;
  };

  // Phase 2: Select + Remaster (The "Direct This Shot" Action)
  const handleDirectShot = async () => {
      if (!script || focusedGridIndex === null || !gridCandidates[focusedGridIndex]) return;
      
      const index = focusedGridIndex;
      setDirectedGridIndex(index); 
      setIsGenerating(true);
      setFinalImages([]); 
      setPromptCache({});
      promptPromisesRef.current = {};

      try {
        const selectedGrid = gridCandidates[index];

        // Step 3: Dynamic Split
        setStatus(`Cutting ${gridSize}x${gridSize} Grid into Individual Shots...`);
        const cells = await splitImageIntoGrid(selectedGrid, gridSize);

        // Step 4: Remaster Loop (SEQUENTIAL)
        const total = cells.length;
        const processedImages: string[] = [];

        for (let i = 0; i < total; i++) {
            setStatus(`Remastering Shot ${i + 1} of ${total} (${stylePrefs.mode})...`);
            const quad = cells[i];
            const shotDesc = script.shots?.[i]?.description || `Cinematic shot ${i+1}`;
            
            try {
                // Pass stylePrefs to remaster logic
                const resultBase64 = await remasterQuadrant(quad, shotDesc, panelResolution, aspectRatio, stylePrefs);
                processedImages.push(resultBase64);
            } catch (err) {
                console.warn(`Failed to remaster quadrant ${i+1}, falling back to original crop`, err);
                processedImages.push(quad);
            }
            
            if (i < total - 1) await new Promise(r => setTimeout(r, 800));
        }

        let finalDisplayImages: string[] = processedImages; 
        
        if (getProjectFolderName()) {
            setStatus("Auto-saving assets to disk...");
            const gridBlob = base64ToBlob(selectedGrid);
            const panelBlobs = processedImages.map(b64 => base64ToBlob(b64));
            
            await saveDirectorAssetBatch(gridBlob, panelBlobs);
            finalDisplayImages = panelBlobs.map(blob => URL.createObjectURL(blob));
        }

        setFinalImages(finalDisplayImages);

        const historyItem: ProjectHistoryItem = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            finalImages: finalDisplayImages,
            script: script,
            gridSize: gridSize,
            sourceGrid: selectedGrid,
            stylePrefs: { ...stylePrefs },
            cameraShots: []
        };
        setHistory(prev => [historyItem, ...prev]);

        // Background Pre-fetching
        const globalContext = script.gridPrompt || storyIdea;
        finalDisplayImages.forEach((img, idx) => {
            const shotDesc = script.shots?.[idx]?.description || '';
            triggerPromptExtraction(idx, img, globalContext, shotDesc);
        });

      } catch (err) {
        console.error(err);
        alert('Remaster error: ' + (err as Error).message);
        setDirectedGridIndex(null); 
      } finally {
          setIsGenerating(false);
          setStatus('');
      }
  };

  const handleSendToEditor = async (imageIndex: number) => {
      if (!onSendToEditor || !script || !finalImages[imageIndex]) return;
      
      setExtractingIndex(imageIndex);
      try {
        const shotDesc = script.shots?.[imageIndex]?.description || '';
        const globalContext = script.gridPrompt || storyIdea;
        const panelImage = finalImages[imageIndex];

        let imageForAnalysis = panelImage;
        if (panelImage.startsWith('blob:')) {
            imageForAnalysis = await blobUrlToBase64(panelImage);
        }

        const extractedPrompt = await triggerPromptExtraction(imageIndex, panelImage, globalContext, shotDesc);

        const newRefImages = [imageForAnalysis, ...refImages].slice(0, 14);

        onSendToEditor({
            image: '', 
            prompt: extractedPrompt,
            refImages: newRefImages
        });
      } catch (e) {
          console.error("Failed to extract prompt", e);
           const shotDesc = script.shots?.[imageIndex]?.description || '';
            let fallbackImage = finalImages[imageIndex];
            if (fallbackImage.startsWith('blob:')) {
                fallbackImage = await blobUrlToBase64(fallbackImage);
            }
            const newRefImages = [fallbackImage, ...refImages].slice(0, 14);
            onSendToEditor({
                image: '',
                prompt: shotDesc,
                refImages: newRefImages
            });
      } finally {
          setExtractingIndex(null);
      }
  };

  const restoreVersion = (item: ProjectHistoryItem) => {
      setFinalImages(item.finalImages);
      setScript(item.script);
      if(item.gridSize) setGridSize(item.gridSize);
      if(item.stylePrefs) setStylePrefs(item.stylePrefs);
      
      setShowHistory(false);
      setFocusedGridIndex(null); 
      setDirectedGridIndex(null);
      setPromptCache({});
      promptPromisesRef.current = {};
      setIsScriptDirty(false);
  };

  const shouldShowPanels = focusedGridIndex !== null && focusedGridIndex === directedGridIndex && finalImages.length > 0;
  const isSelectedButEmpty = focusedGridIndex !== null && (focusedGridIndex !== directedGridIndex || finalImages.length === 0);

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

      {/* History Sidebar */}
      {showHistory && (
          <div className="absolute top-0 right-0 z-20 w-80 h-full bg-slate-900 border-l border-slate-700 shadow-2xl overflow-y-auto p-4 transition-transform custom-scrollbar">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-bold">Version History</h3>
                  <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-white"><History className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                  {history.map((item) => (
                      <div key={item.id} onClick={() => restoreVersion(item)} className="p-3 bg-slate-800 rounded hover:bg-slate-700 cursor-pointer border border-slate-700 hover:border-amber-500/50">
                          <p className="text-xs text-slate-400 mb-2">{new Date(item.timestamp).toLocaleTimeString()} - {item.gridSize ? `${item.gridSize}x${item.gridSize}` : '2x2'} - {item.stylePrefs?.mode || 'DEFAULT'}</p>
                          <div className="grid grid-cols-2 gap-1">
                              {item.finalImages.slice(0, 2).map((img, i) => (
                                  <img key={i} src={resolveSrc(img)} className="w-full h-auto rounded" />
                              ))}
                          </div>
                      </div>
                  ))}
                  {history.length === 0 && <p className="text-xs text-slate-500">No history yet.</p>}
              </div>
          </div>
      )}

      {/* Inputs */}
      <div className="lg:col-span-3 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        <div className="space-y-2">
            <label className="text-sm font-semibold text-amber-500 uppercase tracking-wider">Project Name</label>
            <input 
                type="text" 
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                placeholder="Untitled Project"
            />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-amber-500 uppercase tracking-wider">Story Idea</label>
          <textarea
            value={storyIdea}
            onChange={(e) => setStoryIdea(e.target.value)}
            className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-y text-slate-200 placeholder-slate-600 min-h-[100px]"
            placeholder="A cyberpunk detective standing in rain..."
          />
        </div>
        
        {/* References Moved Here */}
        <ImageUploader 
            images={refImages} 
            setImages={setRefImages} 
            label="REFERENCES" 
            subLabel="(place characters, styles, scenes, props here)"
        />

        <div className="space-y-4 border-t border-slate-800 pt-4">
          {/* Grid Size Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">Grid Layout</label>
             <div className="flex gap-1 bg-slate-900 border border-slate-700 rounded p-1">
                <button 
                    onClick={() => setGridSize(2)}
                    className={`flex-1 flex items-center justify-center py-2 rounded text-xs gap-1 transition-all ${gridSize === 2 ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    <Grid2X2 className="w-3 h-3" /> 2x2
                </button>
                <button 
                    onClick={() => setGridSize(3)}
                    className={`flex-1 flex items-center justify-center py-2 rounded text-xs gap-1 transition-all ${gridSize === 3 ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    <Grid3X3 className="w-3 h-3" /> 3x3
                </button>
                <button 
                    onClick={() => setGridSize(4)}
                    className={`flex-1 flex items-center justify-center py-2 rounded text-xs gap-1 transition-all ${gridSize === 4 ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    <LayoutGrid className="w-3 h-3" /> 4x4
                </button>
             </div>
          </div>
          
           <div>
             <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block"># Variations to Generate</label>
             <div className="flex gap-1 bg-slate-900 border border-slate-700 rounded p-1">
                {[1, 2, 3, 4].map(num => (
                    <button 
                        key={num}
                        onClick={() => setCandidateCount(num)}
                        className={`flex-1 flex items-center justify-center py-2 rounded text-xs gap-1 transition-all ${candidateCount === num ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Layers className="w-3 h-3" /> {num}
                    </button>
                ))}
             </div>
          </div>

          {/* Resolutions */}
          <div className="space-y-3">
             <div className="flex gap-2">
                <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">Raw Grid</label>
                    <select 
                        value={gridResolution}
                        onChange={(e) => setGridResolution(e.target.value as ImageResolution)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-300 outline-none"
                    >
                        <option value={ImageResolution.RES_2K}>2K (Fast)</option>
                        <option value={ImageResolution.RES_4K}>4K (HQ)</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">Panel Output</label>
                    <select 
                        value={panelResolution}
                        onChange={(e) => setPanelResolution(e.target.value as ImageResolution)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-300 outline-none"
                    >
                        <option value={ImageResolution.RES_1K}>1K</option>
                        <option value={ImageResolution.RES_2K}>2K</option>
                        <option value={ImageResolution.RES_4K}>4K</option>
                    </select>
                </div>
             </div>

             <div>
                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">Aspect Ratio</label>
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
             </div>
          </div>
        </div>
        
        {/* Style & Tone (New Pro Feature) */}
        <div className="border-t border-slate-800 pt-4">
            <button 
                onClick={() => setShowStylePanel(!showStylePanel)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-white mb-2"
            >
                <span className="flex items-center gap-1"><Sliders className="w-3 h-3" /> STYLE & TONE (PRO)</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showStylePanel ? 'rotate-180' : ''}`} />
            </button>
            
            {showStylePanel && (
                <div className="bg-slate-900/50 rounded p-3 space-y-3 animate-in fade-in slide-in-from-top-1">
                     <div>
                        <label className="text-xs text-slate-500 block mb-1">Aesthetic Preset</label>
                        <select 
                            value={stylePrefs.mode}
                            onChange={(e) => setStylePrefs({ ...stylePrefs, mode: e.target.value as any })}
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white outline-none"
                        >
                            <optgroup label="Cinematic & Realistic">
                                <option value="DEFAULT">Default (Blockbuster Realism)</option>
                                <option value="CINEMATIC">Cinematic (Anamorphic)</option>
                                <option value="NOIR">Film Noir (B&W)</option>
                                <option value="VINTAGE_FILM">Vintage 70s Film</option>
                            </optgroup>
                            <optgroup label="Animation & Stylized">
                                <option value="ANIME">Anime (Ghibli/Shinkai)</option>
                                <option value="3D_ANIMATION">3D Animation (Pixar/Disney)</option>
                                <option value="CLAYMATION">Claymation (Aardman)</option>
                                <option value="COMIC_BOOK">Comic Book / Graphic Novel</option>
                            </optgroup>
                            <optgroup label="Artistic">
                                <option value="OIL_PAINTING">Oil Painting (Impasto)</option>
                                <option value="WATERCOLOR">Watercolor</option>
                                <option value="INK_WASH">Ink Wash (Sumi-e)</option>
                                <option value="FANTASY_ART">High Fantasy Art</option>
                            </optgroup>
                            <optgroup label="Thematic">
                                <option value="CYBERPUNK">Cyberpunk</option>
                                <option value="STEAMPUNK">Steampunk</option>
                            </optgroup>
                            <option value="CUSTOM">Custom Prompt...</option>
                        </select>
                     </div>

                     {/* Custom Aesthetic Fields */}
                     <div className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                                <Plus className="w-3 h-3" /> Custom Aesthetic to Append
                            </label>
                            <textarea
                                value={stylePrefs.customAppend || ''}
                                onChange={(e) => handleAppendChange(e.target.value)}
                                disabled={!!stylePrefs.customOverride}
                                className={`w-full bg-slate-800 border ${stylePrefs.customOverride ? 'border-slate-800 opacity-50 cursor-not-allowed' : 'border-slate-700 focus:border-amber-500'} rounded p-2 text-xs text-white outline-none h-12 resize-none transition-all`}
                                placeholder="E.g. neon lights, volumetric fog..."
                            />
                        </div>

                        <div>
                            <label className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                                <Replace className="w-3 h-3" /> Custom Aesthetic to Override
                            </label>
                            <textarea
                                value={stylePrefs.customOverride || ''}
                                onChange={(e) => handleOverrideChange(e.target.value)}
                                disabled={!!stylePrefs.customAppend}
                                className={`w-full bg-slate-800 border ${stylePrefs.customAppend ? 'border-slate-800 opacity-50 cursor-not-allowed' : 'border-slate-700 focus:border-red-500'} rounded p-2 text-xs text-white outline-none h-12 resize-none transition-all`}
                                placeholder="Overrides preset completely..."
                            />
                        </div>
                     </div>

                     <div className="pt-2 border-t border-slate-800/50">
                        <label className="text-xs text-slate-500 block mb-1">Negative Prompt (Exclude)</label>
                         <input 
                            type="text"
                            value={stylePrefs.customNegative || ''}
                            onChange={(e) => setStylePrefs({ ...stylePrefs, customNegative: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white outline-none"
                            placeholder="blur, distortion, bad anatomy..."
                        />
                     </div>
                </div>
            )}
        </div>

        <button
          onClick={handleInitialGenerate}
          disabled={isGenerating || (!storyIdea && !script)}
          className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            isGenerating 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black shadow-lg shadow-amber-900/50'
          }`}
        >
          {isGenerating ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
          {isGenerating 
            ? (script && isScriptDirty ? 'COMPILING & DIRECTING...' : 'DIRECTING...') 
            : (script ? (isScriptDirty ? 'REGENERATE (EDITS DETECTED)' : 'RE-ROLL SHOTS') : 'ACTION')
          }
        </button>

        {status && (
            <div className="text-xs text-center text-amber-400 animate-pulse font-mono mt-2">
                [{status}]
            </div>
        )}
      </div>

      {/* Main Display Area */}
      <div className="lg:col-span-9 flex flex-col gap-8 overflow-y-auto custom-scrollbar pb-10">
        
        {/* Script Section */}
        {script && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative group">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-2xl font-serif text-white">{script.title}</h2>
                    <p className="text-slate-400 italic text-sm">{script.logline}</p>
                </div>
                <div className="flex gap-2">
                     <div className="flex flex-col items-end">
                         {isScriptDirty && (
                             <span className="text-[10px] text-amber-500 font-bold bg-amber-900/30 px-2 py-1 rounded mb-1 flex items-center gap-1">
                                 <FileEdit className="w-3 h-3" /> Unsaved Edits
                             </span>
                         )}
                         <button onClick={() => setShowHistory(!showHistory)} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors" title="Versions">
                            <History className="w-5 h-5" />
                        </button>
                     </div>
                </div>
            </div>
            <div className={`grid gap-4 ${gridSize === 4 ? 'grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
              {script.shots?.map((shot, idx) => (
                <div key={shot.shotNumber} className={`bg-black/40 p-3 rounded border-l-2 ${isScriptDirty ? 'border-amber-500' : 'border-slate-700'} transition-colors`}>
                  <div className="flex justify-between text-xs text-slate-500 mb-1 font-mono">
                    <span className="text-amber-500/80">SHOT {shot.shotNumber}</span>
                    <span>{shot.cameraAngle}</span>
                  </div>
                  {/* Editable Text Area for Pro Features */}
                  <textarea 
                    value={shot.description}
                    onChange={(e) => handleShotEdit(idx, e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-sm text-slate-300 resize-none h-24 focus:bg-slate-800/50 focus:text-white rounded p-1 transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase 1: Candidate Selection */}
        {gridCandidates.length > 0 && (
             <div className="space-y-4">
                 <h3 className="text-amber-500 text-sm font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Select Composition to Remaster
                 </h3>
                 <div className={`grid gap-4 ${candidateCount > 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                     {gridCandidates.map((cand, idx) => (
                         <div 
                            key={idx} 
                            onClick={() => setFocusedGridIndex(idx)}
                            className={`relative group rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isGenerating ? 'opacity-50 cursor-wait' : 'hover:scale-[1.01]'} ${focusedGridIndex === idx ? 'border-amber-500 shadow-xl shadow-amber-900/40' : 'border-slate-800 hover:border-slate-600'}`}
                         >
                             <img src={resolveSrc(cand)} className="w-full h-auto" />
                             
                             {/* Top Right Controls */}
                             <div className="absolute top-2 right-2 flex gap-2 z-20">
                                <a 
                                    href={resolveSrc(cand)} 
                                    download={`raw-grid-${idx+1}.png`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2 bg-black/60 rounded-full text-slate-300 hover:text-white hover:bg-black/90 transition-all opacity-0 group-hover:opacity-100"
                                    title="Download Raw Grid"
                                >
                                    <Download className="w-4 h-4" />
                                </a>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFullscreenImage(cand);
                                    }}
                                    className="p-2 bg-black/60 rounded-full text-slate-300 hover:text-white hover:bg-black/90 transition-all opacity-0 group-hover:opacity-100"
                                    title="Fullscreen Preview"
                                >
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                             </div>

                             <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-slate-300 font-mono z-20">
                                 OPTION {idx + 1}
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
        )}

        {/* Phase 2: Final Gallery (Title + Content) */}
        {(gridCandidates.length > 0 || finalImages.length > 0) && (
            <div className="space-y-6 pt-4 border-t border-slate-800">
                <h3 className="text-amber-500 text-sm font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2">
                    <LayoutGrid className="w-4 h-4" /> PANELS FROM SELECTED COMPOSITION
                </h3>

                {/* SCENARIO 1: No Grid Selected */}
                {focusedGridIndex === null && (
                    <div className="flex-1 min-h-[200px] border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-600 bg-slate-900/20">
                        <MousePointerClick className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm">Please select a composition above to view or generate panels.</p>
                    </div>
                )}

                {/* SCENARIO 2: Grid Selected, But No Panels Generated (or different grid generated) */}
                {isSelectedButEmpty && (
                    <div className="flex-1 min-h-[300px] border border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-900/20 p-8 text-center">
                        <Film className="w-16 h-16 mb-4 text-slate-700" />
                        <p className="mb-6 max-w-md">No panels generated from this composition yet.</p>
                        <button 
                            onClick={handleDirectShot}
                            disabled={isGenerating}
                            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-lg shadow-amber-900/40 flex items-center gap-2 transition-all"
                        >
                            {isGenerating ? <Loader2 className="animate-spin w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                            DIRECT THIS SHOT
                        </button>
                    </div>
                )}

                {/* SCENARIO 3: Panels Exist for Selected Grid */}
                {shouldShowPanels && (
                    <div className="space-y-6">
                        <div className={`grid gap-4 ${gridSize === 4 ? 'grid-cols-4' : 'grid-cols-2'}`}>
                            {finalImages.map((img, idx) => (
                            <div key={idx} className="group relative rounded-lg overflow-hidden border border-slate-800 hover:border-amber-500/50 transition-all">
                                <img src={resolveSrc(img)} alt={`Final Shot ${idx+1}`} className="w-full h-auto" />
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between">
                                    <span className="text-amber-500 font-mono text-sm">FINAL SHOT {idx + 1}</span>
                                </div>
                                
                                {/* Panel Actions */}
                                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button 
                                        onClick={() => handleSendToEditor(idx)}
                                        className="p-2 bg-black/60 rounded-full text-white hover:bg-amber-600 transition-colors flex items-center justify-center"
                                        title="Send to Editor"
                                        disabled={extractingIndex !== null}
                                    >
                                        {extractingIndex === idx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </button>
                                    <button 
                                        onClick={() => setFullscreenImage(img)}
                                        className="p-2 bg-black/60 rounded-full text-white hover:bg-amber-600 transition-colors"
                                        title="Fullscreen"
                                    >
                                        <Maximize2 className="w-4 h-4" />
                                    </button>
                                    <a 
                                        href={resolveSrc(img)} 
                                        download={`shot-${idx+1}.png`}
                                        className="p-2 bg-black/60 rounded-full text-white hover:bg-amber-600 transition-colors"
                                        title="Download"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                            ))}
                        </div>

                        {/* Regenerate Option */}
                        <div className="flex justify-center pt-4">
                             <div className="text-center">
                                <p className="text-xs text-slate-500 mb-2">Want to re-roll these specific panels?</p>
                                <button 
                                    onClick={handleDirectShot}
                                    disabled={isGenerating}
                                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-full flex items-center gap-2 transition-colors border border-slate-700 hover:border-amber-500/30"
                                >
                                    <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                                    Regenerate All Panels
                                </button>
                             </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Empty State if absolutely nothing */}
        {gridCandidates.length === 0 && (
            <div className="flex-1 min-h-[400px] border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-600">
                <Film className="w-16 h-16 mb-4 opacity-20" />
                <p>Ready to direct. Enter a story idea to begin.</p>
            </div>
        )}
      </div>
    </div>
  );
};