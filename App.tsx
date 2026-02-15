import React, { useState, useEffect, useRef } from 'react';
import { Clapperboard, Edit, Video, Key, LogIn, User as UserIcon, Image as ImageIcon, Film, FolderInput, HardDrive, LogOut, ChevronDown, CheckCircle, Save, FolderOpen, AlertCircle, Cloud, Laptop, Settings, FileJson } from 'lucide-react';
import { AppMode, UserProfile, GoogleDriveFile, ProjectState, EditorTransferData } from './types';
import { DirectorDeck } from './components/DirectorDeck';
import { EditorDeck } from './components/EditorDeck';
import { FreeEditorDeck } from './components/FreeEditorDeck';
import { VeoFramesDeck } from './components/VeoFramesDeck';
import { VeoRefsDeck } from './components/VeoRefsDeck';
import { VeoTextDeck } from './components/VeoTextDeck';
import { ApiKeyModal } from './components/ApiKeyModal';
import { initGoogleAuth, requestAccessToken, getUserProfile, listProjects, saveProjectToDrive, loadProjectFile, setClientId, signOut } from './services/driveService';
import { initProjectFolder, getProjectFolderName, saveProjectManifest, loadProjectManifest } from './services/fileSystemService';
import { setGeminiApiKey } from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.DIRECTOR);
  
  // Auth State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthInit, setIsAuthInit] = useState(false);
  const [projects, setProjects] = useState<GoogleDriveFile[]>([]);
  
  // UI States
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [showSaveMethodModal, setShowSaveMethodModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // File System State
  const [projectFolderName, setProjectFolderName] = useState<string | null>(null);
  const [saveMethod, setSaveMethod] = useState<'local' | 'cloud' | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // Loaded Data State
  const [loadedProject, setLoadedProject] = useState<ProjectState | null>(null);
  // Live Data State (Synced from DirectorDeck)
  const [currentProjectState, setCurrentProjectState] = useState<ProjectState | null>(null);

  // Editor Data Transfer State
  const [editorIncomingData, setEditorIncomingData] = useState<EditorTransferData | null>(null);

  // Free Editor Gallery State
  const [userGeneratedImages, setUserGeneratedImages] = useState<string[]>([]);

  // Hidden file input for "Upload" logic
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Operation Lock to prevent auto-save interruptions
  const isOperationInProgress = useRef(false);

  // Initialize
  useEffect(() => {
     if(process.env.API_KEY) {
         setGeminiApiKey(process.env.API_KEY);
     } else {
         // Automatically open settings if no key is found on init
         setShowSettingsModal(true);
     }
     
     // Check for stored client ID
     const storedId = localStorage.getItem('nano_gcp_client_id');
     if (storedId) {
        setClientId(storedId);
     }

     // Initialize Google Auth with delay to ensure client ID is set
     try {
        setTimeout(() => {
            // ONLY init auth if we actually have a stored client ID
            if (storedId) {
                initGoogleAuth(async (token) => {
                    const profile = await getUserProfile(token);
                    setUser(profile);
                });
                setIsAuthInit(true);
            }
        }, 500);
     } catch (e) {
         console.warn("Google Auth failed to init", e);
     }
  }, []);

  // Auto-Save Logic
  useEffect(() => {
      if (!autoSaveEnabled || !currentProjectState) return;

      const timer = setTimeout(() => {
          // If operation is in progress (loading/saving manually), skip auto-save check
          if (isOperationInProgress.current) return;

          // If no method selected yet, prompt user
          if (!saveMethod) {
              if (currentProjectState.storyIdea || currentProjectState.script) {
                   setShowSaveMethodModal(true);
              }
              return;
          }
          
          // Perform Auto-Save
          handleSaveAction(currentProjectState, saveMethod, true);
      }, 5000); // 5s debounce

      return () => clearTimeout(timer);
  }, [currentProjectState, autoSaveEnabled, saveMethod]);

  const handleLogin = () => {
      requestAccessToken();
  };

  const handleLogout = () => {
      signOut();
      setUser(null);
  }

  const handleSetLocalFolder = async () => {
      const result = await initProjectFolder();
      if (result.success && result.name) {
          setProjectFolderName(result.name);
          setSaveMethod('local');
          return true;
      } else if (result.error && result.error !== "Folder selection cancelled.") {
          alert(result.error);
      }
      return false;
  };

  // --- SAVE LOGIC ROUTER ---
  const handleSaveAction = async (data: ProjectState, method: 'cloud' | 'local' | 'download', isAutoSave = false) => {
      if (!isAutoSave) isOperationInProgress.current = true;
      
      try {
        // 1. Local Folder Save
        if (method === 'local') {
            if (!projectFolderName) {
                if (isAutoSave) return; 
                const success = await handleSetLocalFolder();
                if (!success) return;
            }
            
            if (getProjectFolderName()) {
                await saveProjectManifest(data);
                if (!isAutoSave) alert(`Project saved locally as ${data.projectName || 'project'}.json`);
            }
            return;
        }

        // 2. Cloud Save
        if (method === 'cloud') {
            if (user) {
                const name = data.projectName 
                ? `${data.projectName}.json` 
                : `NanoProject - ${new Date().toISOString()}.json`;
                
                try {
                    await saveProjectToDrive(data, name);
                    if (!isAutoSave) alert("Project Saved to Drive!");
                } catch(e) {
                    console.warn("Cloud save failed", e);
                    if (!isAutoSave) alert("Save failed: " + (e as Error).message);
                }
            } else {
                if (!isAutoSave) handleLogin(); 
            }
        }
      } finally {
         if (!isAutoSave) isOperationInProgress.current = false;
      }
  };

  // --- LOAD LOGIC ROUTER ---
  const handleLoadAction = async (method: 'cloud' | 'local' | 'upload') => {
      setShowLoadMenu(false);
      isOperationInProgress.current = true;

      try {
        if (method === 'upload') {
            fileInputRef.current?.click();
            return; 
        }

        if (method === 'local') {
            const success = await handleSetLocalFolder();
            if (success) {
                const data = await loadProjectManifest();
                if (data) {
                    setLoadedProject(data);
                    alert(`Loaded project from ${getProjectFolderName()}`);
                } else {
                    alert(`No project file found in ${getProjectFolderName()}. Starting fresh.`);
                }
            }
            isOperationInProgress.current = false;
            return;
        }

        if (method === 'cloud') {
            if (user) {
                try {
                    const files = await listProjects();
                    setProjects(files);
                    setShowLoadModal(true);
                } catch(e) {
                    alert("Failed to list projects");
                }
            } else {
                handleLogin();
            }
            isOperationInProgress.current = false;
        }
      } catch (e) {
          isOperationInProgress.current = false;
          console.error("Load action failed", e);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
        isOperationInProgress.current = false;
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = event.target?.result as string;
            const data = JSON.parse(json) as ProjectState;
            setLoadedProject(data);
            alert("Project imported successfully.");
        } catch (error) {
            console.error(error);
            alert('Invalid project file');
        } finally {
            isOperationInProgress.current = false;
        }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const loadCloudFile = async (id: string) => {
      isOperationInProgress.current = true;
      try {
          const data = await loadProjectFile(id);
          setLoadedProject(data);
          setMode(AppMode.DIRECTOR);
          setShowLoadModal(false);
          setSaveMethod('cloud'); 
          alert(`Loaded project: ${data.projectName || 'Untitled'}`);
      } catch (e) {
          console.error(e);
          alert("Load failed");
      } finally {
          isOperationInProgress.current = false;
      }
  };

  const handleSendToEditor = (data: EditorTransferData) => {
      setEditorIncomingData(data);
      setMode(AppMode.EDITOR);
  };

  const handleProjectUpdate = (data: ProjectState) => {
      setCurrentProjectState(data);
  };

  const handleNewUserImage = (image: string) => {
      setUserGeneratedImages(prev => [image, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
      <ApiKeyModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />

      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileUpload} />

      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur flex items-center justify-between px-6 fixed top-0 w-full z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-black font-bold">
            N
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white hidden md:block">
            NANO <span className="text-amber-500">DIRECTOR</span>
          </h1>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg">
          <button
            onClick={() => setMode(AppMode.DIRECTOR)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              mode === AppMode.DIRECTOR ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clapperboard className="w-3 h-3" /> Director
          </button>
          <button
            onClick={() => setMode(AppMode.EDITOR)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              mode === AppMode.EDITOR ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Edit className="w-3 h-3" /> Editor
          </button>
           <button
            onClick={() => setMode(AppMode.FREE_EDITOR)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              mode === AppMode.FREE_EDITOR ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3 h-3" /> Custom Image Gen
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1"></div>
          <button
            onClick={() => setMode(AppMode.VEO_FRAMES)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              mode === AppMode.VEO_FRAMES ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-3 h-3" /> Frames
          </button>
          <button
            onClick={() => setMode(AppMode.VEO_REFS)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              mode === AppMode.VEO_REFS ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3 h-3" /> Refs
          </button>
          <button
            onClick={() => setMode(AppMode.VEO_TEXT)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              mode === AppMode.VEO_TEXT ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3 h-3" /> Txt
          </button>
        </nav>
        
        {/* Right Actions */}
        <div className="flex items-center gap-4">
            
            {/* Auto Save Toggle */}
            <div className="flex items-center gap-2 border-r border-slate-800 pr-4">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        Auto-Save 
                        {autoSaveEnabled ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> : <AlertCircle className="w-3 h-3 text-red-500" />}
                    </span>
                    <span className="text-[9px] text-slate-600 italic">
                        {autoSaveEnabled ? "On (Recommended)" : "Off - Risk of data loss"}
                    </span>
                </div>
                <button 
                    onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${autoSaveEnabled ? 'bg-emerald-900/50 border border-emerald-500/50' : 'bg-slate-800 border border-slate-600'}`}
                >
                    <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all ${autoSaveEnabled ? 'left-5 bg-emerald-400' : 'left-0.5 bg-slate-400'}`} />
                </button>
            </div>

            {/* Save Menu */}
            <div className="relative">
                <button 
                    onClick={() => { setShowSaveMenu(!showSaveMenu); setShowLoadMenu(false); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium shadow-lg shadow-indigo-900/20 transition-all"
                >
                    <Save className="w-3 h-3" /> Save <ChevronDown className="w-3 h-3" />
                </button>
                
                {showSaveMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <button 
                            onClick={() => { handleSaveAction(currentProjectState!, 'local'); setShowSaveMenu(false); setSaveMethod('local'); }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-800 flex items-center gap-2 text-sm text-slate-300 hover:text-white"
                        >
                            <Laptop className="w-4 h-4" /> Save to Device (Local)
                        </button>
                        <button 
                            onClick={() => { handleSaveAction(currentProjectState!, 'cloud'); setShowSaveMenu(false); setSaveMethod('cloud'); }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-800 flex items-center gap-2 text-sm text-slate-300 hover:text-white border-t border-slate-800"
                        >
                            <Cloud className="w-4 h-4" /> Save to Google Drive
                        </button>
                    </div>
                )}
            </div>

             {/* Load Menu */}
             <div className="relative">
                <button 
                    onClick={() => { setShowLoadMenu(!showLoadMenu); setShowSaveMenu(false); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium border border-slate-700 transition-all"
                >
                    <FolderOpen className="w-3 h-3" /> Load <ChevronDown className="w-3 h-3" />
                </button>
                
                {showLoadMenu && (
                    <div className="absolute top-full right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                         <button 
                            onClick={() => handleLoadAction('upload')}
                            className="w-full text-left px-4 py-3 hover:bg-slate-800 flex items-center gap-2 text-sm text-slate-300 hover:text-white"
                        >
                            <FileJson className="w-4 h-4" /> Import JSON File
                        </button>
                        <button 
                            onClick={() => handleLoadAction('local')}
                            className="w-full text-left px-4 py-3 hover:bg-slate-800 flex items-center gap-2 text-sm text-slate-300 hover:text-white border-t border-slate-800"
                        >
                            <FolderInput className="w-4 h-4" /> Open Project Folder
                        </button>
                        <button 
                            onClick={() => handleLoadAction('cloud')}
                            className="w-full text-left px-4 py-3 hover:bg-slate-800 flex items-center gap-2 text-sm text-slate-300 hover:text-white border-t border-slate-800"
                        >
                            <Cloud className="w-4 h-4" /> Load from Google Drive
                        </button>
                    </div>
                )}
            </div>

            {/* Auth / User */}
            <div className="border-l border-slate-800 pl-4 flex items-center gap-3">
                 {user ? (
                    <div className="flex items-center gap-2 bg-slate-900 rounded-full pr-1 pl-1 py-1 border border-slate-800">
                        <img src={user.picture} className="w-6 h-6 rounded-full" />
                        <button onClick={handleLogout} className="p-1 hover:text-white text-slate-400 transition-colors" title="Sign Out">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button onClick={handleLogin} className="flex items-center gap-2 text-xs hover:text-white text-slate-400">
                        <LogIn className="w-4 h-4" /> <span className="hidden lg:inline">Sign In</span>
                    </button>
                )}
                
                <button 
                    onClick={() => setShowSettingsModal(true)} 
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-xs text-slate-400 hover:text-white transition-colors"
                    title="Settings & API Keys"
                >
                    <Settings className="w-4 h-4" />
                    <span className="hidden md:inline">Settings</span>
                </button>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-20 pb-6 px-6 overflow-hidden h-screen box-border">
        <div className="h-full relative">
            <div style={{ display: mode === AppMode.DIRECTOR ? 'block' : 'none', height: '100%' }}>
                <DirectorDeck 
                    onSaveProject={(d, m) => handleSaveAction(d, m)}
                    onLoadProject={(m) => handleLoadAction(m)}
                    loadedProject={loadedProject || currentProjectState}
                    onSendToEditor={handleSendToEditor}
                    onProjectUpdate={handleProjectUpdate}
                    activeFolderName={projectFolderName}
                    isCloudActive={!!user}
                />
            </div>
            
            <div style={{ display: mode === AppMode.EDITOR ? 'block' : 'none', height: '100%' }}>
                <EditorDeck 
                    initialData={editorIncomingData} 
                    projectState={currentProjectState}
                    userGallery={userGeneratedImages}
                />
            </div>

            <div style={{ display: mode === AppMode.FREE_EDITOR ? 'block' : 'none', height: '100%' }}>
                <FreeEditorDeck 
                    onImageGenerated={handleNewUserImage} 
                    userGallery={userGeneratedImages}
                    projectState={currentProjectState}
                />
            </div>

            <div style={{ display: mode === AppMode.VEO_FRAMES ? 'block' : 'none', height: '100%' }}>
                <VeoFramesDeck projectState={currentProjectState} userGallery={userGeneratedImages} />
            </div>

            <div style={{ display: mode === AppMode.VEO_REFS ? 'block' : 'none', height: '100%' }}>
                <VeoRefsDeck projectState={currentProjectState} userGallery={userGeneratedImages} />
            </div>

            <div style={{ display: mode === AppMode.VEO_TEXT ? 'block' : 'none', height: '100%' }}>
                <VeoTextDeck />
            </div>
        </div>
      </main>

      {/* Load Project Modal */}
      {showLoadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl w-96 max-h-[80vh] overflow-hidden flex flex-col">
                  <h3 className="text-lg font-bold text-white mb-4">Open Project from Drive</h3>
                  <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                      {projects.length === 0 ? (
                          <p className="text-slate-500 text-sm">No projects found in Nano Director Projects folder.</p>
                      ) : (
                          projects.map(p => (
                              <button key={p.id} onClick={() => loadCloudFile(p.id)} className="w-full text-left p-3 hover:bg-slate-800 rounded border border-slate-800 hover:border-amber-500/50 text-sm truncate">
                                  {p.name.replace('.json', '')}
                              </button>
                          ))
                      )}
                  </div>
                  <button onClick={() => setShowLoadModal(false)} className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">Cancel</button>
              </div>
          </div>
      )}

      {/* First Time Auto-Save Prompt Modal */}
      {showSaveMethodModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm">
              <div className="bg-slate-900 border border-amber-500 rounded-xl p-6 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-center mb-4">
                      <div className="p-3 bg-amber-500/20 rounded-full text-amber-500">
                          <Save className="w-8 h-8" />
                      </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Enable Auto-Save?</h3>
                  <p className="text-slate-400 text-sm mb-6">
                      Your work is currently unsaved. Select a destination to enable automatic saving.
                  </p>
                  
                  <div className="space-y-3">
                      <button 
                        onClick={() => { setShowSaveMethodModal(false); setSaveMethod('local'); handleSaveAction(currentProjectState!, 'local'); }}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-white rounded-lg flex items-center justify-center gap-2 transition-all"
                      >
                          <Laptop className="w-4 h-4" /> Save to Device Folder
                      </button>
                      
                      <button 
                        onClick={() => { setShowSaveMethodModal(false); setSaveMethod('cloud'); handleSaveAction(currentProjectState!, 'cloud'); }}
                        className="w-full py-3 bg-indigo-900/50 hover:bg-indigo-800 border border-indigo-700/50 rounded-lg flex items-center justify-center gap-2 transition-all text-indigo-200"
                      >
                          <Cloud className="w-4 h-4" /> Save to Google Drive
                      </button>
                      
                      <button 
                        onClick={() => { setShowSaveMethodModal(false); setAutoSaveEnabled(false); }}
                        className="w-full py-2 text-xs text-slate-500 hover:text-white mt-2"
                      >
                          Disable Auto-Save (Not Recommended)
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
