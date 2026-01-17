import { UserProfile, GoogleDriveFile } from "../types";

declare global {
    interface Window {
        google: any;
    }
}

// Default placeholder - effectively disabled until user provides one
let CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || ''; 

let tokenClient: any;
let accessToken: string | null = null;

export const setClientId = (id: string) => {
    CLIENT_ID = id;
};

export const initGoogleAuth = (callback: (token: string) => void) => {
    if (typeof window === 'undefined' || !window.google) return;
    
    if (!CLIENT_ID || CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
        console.warn("Google Auth skipped: No valid Client ID provided.");
        return;
    }

    try {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (response: any) => {
                if (response.error !== undefined) {
                    throw (response);
                }
                accessToken = response.access_token;
                callback(response.access_token);
            },
        });
    } catch (e) {
        console.error("Failed to init token client", e);
    }
};

export const requestAccessToken = () => {
    if(!tokenClient) {
        // Try to re-init if client ID was just added
        if (CLIENT_ID) {
             // We can't easily re-wire the callback here without a refactor, 
             // but usually init happens on mount.
             alert("Google Auth not initialized. Please refresh the page after setting the Client ID.");
        } else {
             alert("Google Cloud Client ID is missing. Please add it in the API Key settings.");
        }
        return;
    }
    tokenClient.requestAccessToken({ prompt: 'consent' });
};

export const signOut = () => {
    if (accessToken && window.google) {
        window.google.accounts.oauth2.revoke(accessToken, () => {console.log('Token revoked')});
    }
    accessToken = null;
    // We don't nullify tokenClient so they can sign in again
};

export const getUserProfile = async (token: string): Promise<UserProfile> => {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
    });
    return await res.json();
};

const FOLDER_NAME = 'Nano Director Projects';

export const getOrCreateProjectFolder = async (): Promise<string> => {
    if (!accessToken) throw new Error("No access token");

    // Search for folder
    const query = `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`;
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json();

    if (data.files && data.files.length > 0) {
        return data.files[0].id;
    }

    // Create folder
    const metadata = {
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
    };
    
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
    });
    const createData = await createRes.json();
    return createData.id;
};

export const saveProjectToDrive = async (projectData: any, filename: string): Promise<void> => {
    if (!accessToken) throw new Error("No access token");

    const folderId = await getOrCreateProjectFolder();
    
    const fileContent = JSON.stringify(projectData);
    const file = new Blob([fileContent], { type: 'application/json' });
    
    const metadata = {
        name: filename,
        parents: [folderId],
        mimeType: 'application/json'
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form
    });
};

export const listProjects = async (): Promise<GoogleDriveFile[]> => {
    if (!accessToken) throw new Error("No access token");
    
    // Find folder first to narrow search
    try {
        const folderId = await getOrCreateProjectFolder();
        const query = `'${folderId}' in parents and mimeType='application/json' and trashed=false`;
        
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, mimeType)`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await res.json();
        return data.files || [];
    } catch (e) {
        console.warn("Could not list projects", e);
        return [];
    }
};

export const loadProjectFile = async (fileId: string): Promise<any> => {
    if (!accessToken) throw new Error("No access token");

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    return await res.json();
};