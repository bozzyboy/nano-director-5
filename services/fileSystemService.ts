import { ProjectState } from "../types";

let projectHandle: FileSystemDirectoryHandle | null = null;

export const initProjectFolder = async (): Promise<{ success: boolean; name?: string; error?: string }> => {
    try {
        // @ts-ignore
        if (typeof window.showDirectoryPicker === 'undefined') {
             return { success: false, error: "Your browser does not support the File System Access API. Please use Chrome, Edge, or Opera on Desktop." };
        }

        // @ts-ignore - Window type augmentation is tricky for experimental APIs
        const handle = await window.showDirectoryPicker({
            mode: 'readwrite',
            id: 'nano_director_project', // Helps browser remember the last used location
            startIn: 'documents' // Suggests starting in Documents to encourage subfolder creation
        });
        projectHandle = handle;
        
        // Ensure structure exists
        await handle.getDirectoryHandle('videos', { create: true });
        await handle.getDirectoryHandle('user_generated', { create: true });
        await handle.getDirectoryHandle('director_assets', { create: true });
        
        return { success: true, name: handle.name };
    } catch (e: any) {
        console.error("FS Init failed", e);
        
        // Handle User Cancellation
        if (e.name === 'AbortError') {
             return { success: false, error: "Folder selection cancelled." };
        }
        
        // Handle Iframe/Security Restrictions (Common in StackBlitz/CodeSandbox)
        if (e.message && (e.message.includes('Cross origin') || e.message.includes('SecurityError'))) {
             return { success: false, error: "Security Restriction: The File System API is blocked in this preview window. \n\nPlease open the app in a new tab (Full View) to use the Auto-Save Project Folder feature." };
        }
        
        return { success: false, error: e.message || "Failed to initialize project folder." };
    }
};

export const getProjectFolderName = (): string | null => {
    return projectHandle ? projectHandle.name : null;
};

export const saveDirectorAssetBatch = async (
    sourceGridBlob: Blob,
    panelBlobs: Blob[]
) => {
    if (!projectHandle) return;
    
    // Create specific timestamped folder
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folderName = `Batch_${timestamp}`;
    
    const assetsDir = await projectHandle.getDirectoryHandle('director_assets', { create: true });
    const batchDir = await assetsDir.getDirectoryHandle(folderName, { create: true });

    // Save Source
    const gridFile = await batchDir.getFileHandle('Source_Grid.png', { create: true });
    const gridWritable = await gridFile.createWritable();
    await gridWritable.write(sourceGridBlob);
    await gridWritable.close();

    // Save Panels
    for (let i = 0; i < panelBlobs.length; i++) {
        const file = await batchDir.getFileHandle(`Shot_${i + 1}_Remastered.png`, { create: true });
        const writable = await file.createWritable();
        await writable.write(panelBlobs[i]);
        await writable.close();
    }
    
    return folderName;
};

export const saveUserImage = async (blob: Blob): Promise<string | null> => {
    if (!projectHandle) return null;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `UserGen_${timestamp}.png`;
    
    const dir = await projectHandle.getDirectoryHandle('user_generated', { create: true });
    const file = await dir.getFileHandle(filename, { create: true });
    
    const w = await file.createWritable();
    await w.write(blob);
    await w.close();
    
    return filename;
};

export const saveVideo = async (blob: Blob, prefix: string = 'VeoVideo'): Promise<string | null> => {
    if (!projectHandle) return null;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${prefix}_${timestamp}.mp4`;
    
    const dir = await projectHandle.getDirectoryHandle('videos', { create: true });
    const file = await dir.getFileHandle(filename, { create: true });
    
    const w = await file.createWritable();
    await w.write(blob);
    await w.close();
    
    return filename;
};

export const saveProjectManifest = async (state: ProjectState) => {
    if (!projectHandle) return;
    
    const json = JSON.stringify(state, null, 2);
    // Use project name for filename if available, otherwise default
    const filename = state.projectName ? `${state.projectName}.json` : 'project.json';
    
    const file = await projectHandle.getFileHandle(filename, { create: true });
    const w = await file.createWritable();
    await w.write(json);
    await w.close();
};

export const loadProjectManifest = async (): Promise<ProjectState | null> => {
    if (!projectHandle) return null;

    try {
        // Try to find any .json file if multiple exist? 
        // For simplicity, we stick to iteration or default, but the request implies we load "the" project file.
        // We will look for *.json files and load the most recent or the first one we find.
        
        let targetFile: FileSystemFileHandle | null = null;
        
        // @ts-ignore - values() iterator
        for await (const entry of projectHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                targetFile = entry as FileSystemFileHandle;
                break; // Just load the first found JSON for now
            }
        }
        
        if (!targetFile) return null;

        const file = await targetFile.getFile();
        const text = await file.text();
        return JSON.parse(text) as ProjectState;
    } catch (e) {
        console.warn("No project json found in current folder", e);
        return null;
    }
};