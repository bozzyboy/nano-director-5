export enum AppMode {
  DIRECTOR = 'DIRECTOR',
  EDITOR = 'EDITOR',
  FREE_EDITOR = 'FREE_EDITOR',
  VEO_FRAMES = 'VEO_FRAMES',
  VEO_REFS = 'VEO_REFS',
  VEO_TEXT = 'VEO_TEXT'
}

export enum AspectRatio {
  SQUARE = '1:1',
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
  STANDARD = '4:3',
  VERTICAL_STANDARD = '3:4',
  CINEMATIC = '21:9'
}

export enum ImageResolution {
  RES_1K = '1K',
  RES_2K = '2K',
  RES_4K = '4K'
}

export enum VeoModel {
  FAST = 'veo-3.1-fast-generate-preview',
  QUALITY = 'veo-3.1-generate-preview'
}

export interface ScriptShot {
  shotNumber: number;
  description: string;
  cameraAngle: string;
  lighting: string;
}

export interface ScriptResponse {
  title: string;
  logline: string;
  shots: ScriptShot[];
  gridPrompt: string;
}

export type VisualStyle = 
  | 'DEFAULT'       // Signature Blockbuster look
  | 'CINEMATIC'     // Alias/Variation
  | 'ANIME'         // Ghibli/Shinkai
  | '3D_ANIMATION'  // Pixar/Disney
  | 'OIL_PAINTING'  // Impasto
  | 'WATERCOLOR'    // Soft edges
  | 'INK_WASH'      // Sumi-e
  | 'CYBERPUNK'     // Neon/Tech
  | 'STEAMPUNK'     // Brass/Steam
  | 'NOIR'          // High contrast B&W
  | 'VINTAGE_FILM'  // 70s Kodak
  | 'CLAYMATION'    // Aardman/Laika
  | 'COMIC_BOOK'    // Halftones/Lines
  | 'FANTASY_ART'   // D&D Painted
  | 'CUSTOM';       // User defined

export type CameraShotType = 
  // --- DISTANCE & SCALE ---
  | 'EXTREME_CLOSE_UP'      // Macro details (Eye, Insect, Finger)
  | 'CLOSE_UP'              // Face, Reaction
  | 'MEDIUM_CLOSE_UP'       // Chest up
  | 'MEDIUM_SHOT'           // Waist up
  | 'COWBOY_SHOT'           // Mid-thigh up (Western style)
  | 'FULL_SHOT'             // Head to toe
  | 'WIDE_SHOT'             // Subject + Environment
  | 'EXTREME_WIDE_SHOT'     // Vast landscape, tiny subject
  | 'SATELLITE_VIEW'        // Orbital view, map-like, stratospheric
  | 'MACRO_TEXTURE'         // Microscopic surface detail
  | 'DRONE_ESTABLISHING'    // Slow, wide cinematic reveal
  | 'DRONE_FPV'             // Fast, acrobatic, diving, banking (Racing drone)
  | 'DRONE_TOP_DOWN'        // Vertical descent
  | 'HELICOPTER_SHOT'       // High altitude, stable, grand scale

  // --- VERTICAL ANGLES ---
  | 'EYE_LEVEL'             // Neutral human perspective
  | 'SHOULDER_LEVEL'        // Standard cinematic height
  | 'HIP_LEVEL'             // Gunfighter / Child perspective
  | 'KNEE_LEVEL'            // Low, grounded perspective
  | 'GROUND_LEVEL'          // Camera sitting on the floor
  | 'LOW_ANGLE'             // Looking up (Heroic/Power)
  | 'HIGH_ANGLE'            // Looking down (Vulnerability)
  | 'OVERHEAD_90'           // Top-down, God's Eye, strictly perpendicular to ground
  | 'BIRDS_EYE_VIEW'        // High aerial looking down (45-60 degrees)
  | 'WORMS_EYE_VIEW'        // From ground looking up
  | 'BOTTOM_UP_90'          // Directly facing the sky/ceiling (upshot)

  // --- HORIZONTAL & COMPOSITION ---
  | 'FRONTAL_ANGLE'         // Directly facing camera (Wes Anderson style)
  | 'THREE_QUARTER_ANGLE'   // 45-degree profile
  | 'PROFILE_SHOT'          // Side view (Silhouette potential)
  | 'REAR_ANGLE'            // From behind subject
  | 'OVER_THE_SHOULDER'     // OTS conversational
  | 'POINT_OF_VIEW'         // POV (Character's eyes)
  | 'DUTCH_ANGLE'           // Tilted horizon (Unease)
  | 'TWO_SHOT'              // Two subjects
  | 'GROUP_SHOT'            // Team/Crowd
  | 'ISOMETRIC_VIEW'        // Video game style (Diablo/Sims angle)

  // --- LENS & OPTICS ---
  | 'FISHEYE_LENS'          // Ultra-wide distortion (Skate/Music Video)
  | 'ANAMORPHIC_WIDESCREEN' // Oval bokeh, lens flares, cinematic 2.39:1
  | 'TELEPHOTO_COMPRESSED'  // Flat depth, background enormous
  | 'TILT_SHIFT'            // Miniature/Toy city effect
  | 'SPLIT_DIOPTER'         // Deep focus on two separate planes
  | 'NIGHT_VISION'          // Green phosphor grain
  | 'THERMAL_IMAGING'       // Heat signature style
  | 'VHS_GLITCH';           // 90s tape aesthetic

export const SHOT_CATEGORIES = {
    DISTANCE: [
        'EXTREME_CLOSE_UP', 'CLOSE_UP', 'MEDIUM_CLOSE_UP', 'MEDIUM_SHOT', 
        'COWBOY_SHOT', 'FULL_SHOT', 'WIDE_SHOT', 'EXTREME_WIDE_SHOT', 
        'SATELLITE_VIEW', 'MACRO_TEXTURE', 'DRONE_ESTABLISHING', 
        'DRONE_FPV', 'DRONE_TOP_DOWN', 'HELICOPTER_SHOT'
    ] as CameraShotType[],
    VERTICAL: [
        'EYE_LEVEL', 'SHOULDER_LEVEL', 'HIP_LEVEL', 'KNEE_LEVEL', 
        'GROUND_LEVEL', 'LOW_ANGLE', 'HIGH_ANGLE', 'OVERHEAD_90', 
        'BIRDS_EYE_VIEW', 'WORMS_EYE_VIEW', 'BOTTOM_UP_90'
    ] as CameraShotType[],
    HORIZONTAL: [
        'FRONTAL_ANGLE', 'THREE_QUARTER_ANGLE', 'PROFILE_SHOT', 'REAR_ANGLE', 
        'OVER_THE_SHOULDER', 'POINT_OF_VIEW', 'DUTCH_ANGLE', 'TWO_SHOT', 
        'GROUP_SHOT', 'ISOMETRIC_VIEW'
    ] as CameraShotType[],
    OPTICS: [
        'FISHEYE_LENS', 'ANAMORPHIC_WIDESCREEN', 'TELEPHOTO_COMPRESSED', 
        'TILT_SHIFT', 'SPLIT_DIOPTER', 'NIGHT_VISION', 'THERMAL_IMAGING', 
        'VHS_GLITCH'
    ] as CameraShotType[]
};

export interface StylePreferences {
  mode: VisualStyle;
  customPositive?: string;
  customNegative?: string;
}

export interface ProjectHistoryItem {
    id: string;
    timestamp: number;
    finalImages: string[];
    script: ScriptResponse | null;
    gridSize?: number;
    sourceGrid?: string; // Base64 of the composition grid used
    stylePrefs?: StylePreferences;
    cameraShots?: CameraShotType[];
}

export interface ProjectState {
  projectName?: string;
  storyIdea: string;
  resolution: ImageResolution; // This is now Panel Resolution
  gridResolution: ImageResolution; // New: Raw Grid Resolution
  aspectRatio?: string; 
  gridSize: number; // 2, 3, or 4
  candidateCount: number; // 1, 2, 3, or 4
  refImages: string[]; // Base64
  history: ProjectHistoryItem[];
  script: ScriptResponse | null;
  gridCandidates: string[]; // Store the generated options
  selectedGridIndex: number | null; // Which one was chosen
  finalImages: string[];
  
  // Pro Features
  stylePrefs: StylePreferences;
  isScriptDirty?: boolean; // Tracks if script has been edited since last prompt generation
  cameraShots?: CameraShotType[]; // Specific camera overrides (Array)
  
  // Deprecated
  cameraShot?: CameraShotType; 
}

export interface EditorTransferData {
    image: string; // Base64
    prompt: string;
    refImages: string[];
}

export interface GoogleDriveFile {
    id: string;
    name: string;
    mimeType: string;
}

export interface UserProfile {
    name: string;
    email: string;
    picture: string;
}