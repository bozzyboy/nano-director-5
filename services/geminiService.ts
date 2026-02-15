import { GoogleGenAI, Type } from "@google/genai";
import { AspectRatio, ImageResolution, VeoModel, ScriptResponse, StylePreferences, VisualStyle, CameraShotType } from "../types";

// --- STYLE LIBRARY ---
const STYLE_MODIFIERS: Record<VisualStyle, string> = {
  DEFAULT: `Apply blockbuster–style cinematography:
– grounded realism
– soft, motivated lighting
– natural contrast
– restrained highlights
– deep but clean shadows
– subtle atmospheric depth
Enhance realism.
Textures should feel physically real: skin pores, fabric weave, dust, stone, metal, wood — all enhanced without plastic smoothing.`,

  CINEMATIC: `Apply blockbuster–style cinematography: grounded realism, anamorphic lens flares, soft motivated lighting, deep shadows. Texture pass: skin pores, fabric weave, realistic imperfections.`,

  ANIME: `Masterpiece anime art style, Studio Ghibli and Makoto Shinkai influence. High quality cel-shading, vibrant colors, clean lines, highly detailed backgrounds, dramatic lighting effects, 4k resolution.`,

  "3D_ANIMATION": `High-end 3D animation style, Pixar and Disney render quality. Subsurface scattering on skin, soft global illumination, expressive character features, perfect physically based rendering (PBR) materials, cute but detailed.`,

  OIL_PAINTING: `Oil painting style, thick impasto brushstrokes, visible texture, expressive color mixing, classical art aesthetic, dramatic lighting, painterly finish.`,

  WATERCOLOR: `Watercolor painting style, soft edges, bleeding colors, paper texture visibility, fluid artistic motion, dreamy atmosphere, wet-on-wet technique.`,

  INK_WASH: `Ink wash illustration, sumi-e style, stark black and white contrast, expressive brush lines, graphic novel aesthetic, negative space usage.`,

  CYBERPUNK: `Cyberpunk aesthetic, neon lighting (pink and blue), rain-slicked streets, high-tech low-life, futuristic cityscapes, chromatic aberration, holographic overlays, gritty realism.`,

  STEAMPUNK: `Steampunk aesthetic, victorian era technology, brass and copper textures, steam and fog, gears and clockwork mechanisms, warm sepia tones, retro-futurism.`,

  NOIR: `Film Noir aesthetic, high contrast black and white, chiaroscuro lighting, dramatic shadows, silhouetted figures, moody atmosphere, detective film grain.`,

  VINTAGE_FILM: `Vintage 1970s film stock, heavy film grain, warm color cast, light leaks, soft focus, nostalgic aesthetic, kodachrome simulation.`,

  CLAYMATION: `Stop-motion claymation style, Aardman and Laika aesthetic, tactile plasticine textures, fingerprints visible on clay, miniature scale depth of field, handcrafted look.`,

  COMIC_BOOK: `Modern comic book style, bold black outlines, halftone patterns, vibrant superhero colors, dynamic shading, graphic novel composition.`,

  FANTASY_ART: `High fantasy digital painting, Dungeons & Dragons rulebook art style, epic scale, magical lighting, detailed armor and cloth, painterly realism.`,

  CUSTOM: `` // Handled by appending user input
};

const SHOT_DESCRIPTIONS: Record<CameraShotType, string> = {
  // DISTANCE
  EXTREME_CLOSE_UP: "Extreme close-up (ECU), macro focus on specific details (eyes, fingers, texture), filling the frame.",
  CLOSE_UP: "Close-up (CU), intimate framing on the face, capturing emotional nuance and reaction.",
  MEDIUM_CLOSE_UP: "Medium close-up (MCU), chest-up framing, standard dialogue intensity.",
  MEDIUM_SHOT: "Medium shot (MS), waist-up framing, neutral distance.",
  COWBOY_SHOT: "Cowboy shot (American shot), mid-thigh up, highlighting tools/weapons at hip height.",
  FULL_SHOT: "Full shot (FS), subject visible head-to-toe, emphasizing body language and costume.",
  WIDE_SHOT: "Wide shot (WS), subject fully placed within their immediate environment.",
  EXTREME_WIDE_SHOT: "Extreme wide shot (EWS), massive scale, subject appears small against the landscape.",
  SATELLITE_VIEW: "Satellite view, stratospheric altitude, map-like layout of the terrain, Google Earth aesthetic.",
  MACRO_TEXTURE: "Macro photography, microscopic detail of surfaces/materials, abstract texture focus.",
  DRONE_ESTABLISHING: "Cinematic drone shot, slow, wide, and stable, revealing the location.",
  DRONE_FPV: "FPV Drone shot, aggressive banking, high speed, diving, racing drone perspective.",
  DRONE_TOP_DOWN: "Drone top-down, vertical descent or ascent directly above the target.",
  HELICOPTER_SHOT: "Helicopter shot, high-altitude stabilization, blockbuster scale.",

  // VERTICAL
  EYE_LEVEL: "Eye-level angle, neutral perspective, connecting directly with the subject.",
  SHOULDER_LEVEL: "Shoulder-level height, grounding the viewer in the scene.",
  HIP_LEVEL: "Hip-level angle, heroic or threatening stance, emphasizing movement.",
  KNEE_LEVEL: "Knee-level angle, looking slightly up, dynamic grounded movement.",
  GROUND_LEVEL: "Ground-level (Low hat), camera placed directly on the floor/surface.",
  LOW_ANGLE: "Low angle, looking up at subject, conveying power, dominance, or heroism.",
  HIGH_ANGLE: "High angle, looking down at subject, conveying vulnerability or weakness.",
  OVERHEAD_90: "Top-down 90-degree angle (God's Eye), strictly perpendicular to the ground, graphic composition.",
  BIRDS_EYE_VIEW: "Bird's eye view, high aerial angle (45-60 degrees), revealing scene geography.",
  WORMS_EYE_VIEW: "Worm's eye view, extreme upward angle from the dirt/floor.",
  BOTTOM_UP_90: "Direct bottom-up angle, facing straight up at the sky/ceiling/subject's chin.",

  // HORIZONTAL
  FRONTAL_ANGLE: "Frontal angle, subject facing camera directly, symmetrical composition.",
  THREE_QUARTER_ANGLE: "3/4 angle, standard cinematic depth perspective.",
  PROFILE_SHOT: "Profile shot, exact side view, emphasizing silhouette or direction.",
  REAR_ANGLE: "Rear angle, viewing the scene from behind the subject.",
  OVER_THE_SHOULDER: "Over-the-shoulder (OTS), looking past a foreground subject to the focus.",
  POINT_OF_VIEW: "Point-of-View (POV), handheld aesthetic, seeing exactly what the character sees.",
  DUTCH_ANGLE: "Dutch angle, tilted horizon line, creating tension, disorientation, or chaos.",
  TWO_SHOT: "Two-shot, framing two characters to show their dynamic.",
  GROUP_SHOT: "Group shot, ensemble framing.",
  ISOMETRIC_VIEW: "Isometric view, orthographic projection, simulated 3D video game perspective.",

   // OPTICS
  FISHEYE_LENS: "Fisheye lens, extreme barrel distortion, ultra-wide field of view.",
  ANAMORPHIC_WIDESCREEN: "Anamorphic lens, cinematic 2.39:1 aspect ratio, oval bokeh, horizontal lens flares.",
  TELEPHOTO_COMPRESSED: "Telephoto compression, long lens, background appears massive and close to subject.",
  TILT_SHIFT: "Tilt-shift effect, selective focus plane, making the scene look like a miniature toy set.",
  SPLIT_DIOPTER: "Split diopter, sharp focus on both extreme foreground and extreme background simultaneously.",
  NIGHT_VISION: "Night vision, grainy green phosphor or white-hot thermal aesthetic.",
  THERMAL_IMAGING: "Thermal imaging, predator-vision heat map colors.",
  VHS_GLITCH: "VHS aesthetic, tracking lines, chromatic aberration, magnetic tape noise."
};

// Updated default negative prompt with explicit "no" prefix and divider exclusions
const DEFAULT_NEGATIVE_PROMPT = "no text, no watermark, no grid lines, no grid outlines, no dividing lines, no white borders, no black borders, no frames, no gutters, no blur, no distortion, no bad anatomy";

// Mutable store for runtime key updates
let RUNTIME_API_KEY = process.env.API_KEY || '';

export const setGeminiApiKey = (key: string) => {
    RUNTIME_API_KEY = key;
    // Also try to update process.env if possible, though not reliable in all envs
    process.env.API_KEY = key;
};

// Helper to get client with latest key
const getClient = async () => {
  // Check runtime key first
  if (RUNTIME_API_KEY) {
      return new GoogleGenAI({ apiKey: RUNTIME_API_KEY });
  }

  // Fallback to AI Studio check
  // @ts-ignore
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if(hasKey) {
           return new GoogleGenAI({ apiKey: process.env.API_KEY });
      }
  }
  
  // Last resort
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

const resolveAspectRatio = (ratio: string): string => {
    if (ratio === AspectRatio.CINEMATIC) return '16:9';
    return ratio;
}

const resolveStyleString = (prefs: StylePreferences): string => {
    // 1. Check Override First
    if (prefs.customOverride && prefs.customOverride.trim().length > 0) {
        return `VISUAL STYLE OVERRIDE: ${prefs.customOverride}`;
    }

    // 2. Determine Base Style
    let base = '';
    if (prefs.mode === 'CUSTOM') {
        base = prefs.customPositive || '';
    } else {
        base = STYLE_MODIFIERS[prefs.mode] || STYLE_MODIFIERS.DEFAULT;
    }

    // 3. Append Custom Aesthetic
    if (prefs.customAppend && prefs.customAppend.trim().length > 0) {
        base = `${base}\n\nADDITIONAL STYLE DETAILS: ${prefs.customAppend}`;
    }

    return base;
};

const resolveNegativePrompt = (prefs: StylePreferences): string => {
    // Use the custom negative prompt if set, otherwise fallback to the default
    if (prefs.customNegative !== undefined && prefs.customNegative !== null && prefs.customNegative.trim().length > 0) {
        return prefs.customNegative;
    }
    return DEFAULT_NEGATIVE_PROMPT;
}

export const generateScriptAndPrompt = async (
  storyIdea: string,
  refImages: string[] = [], // Default to empty array
  gridSize: number
): Promise<ScriptResponse> => {
  const ai = await getClient();
  // Reverted to Flash 3.0 for better JSON consistency and speed, as per user request ("Pro Flash" interpreted as Flash)
  const model = "gemini-3-flash-preview";
  
  const totalShots = gridSize * gridSize;

  // Safe mapping with default empty array just in case
  const safeRefImages = refImages || [];
  const refInstructions = safeRefImages.map((_, i) => `Image ${i+1} = @img${i+1}`).join(', ');

  const prompt = `
    You are an expert Director and Cinematographer.
    The user has uploaded ${safeRefImages.length} reference images.
    ${refInstructions ? `Reference Mapping: ${refInstructions}.` : ''}
    
    Analyze the images visually (if provided). Determine which are characters, environments, or style references.
    
    Based on the User's Story Idea: "${storyIdea}", create a ${totalShots}-shot storyboard script.

    Then, generate ONE image generation prompt following the EXACT template below. 
    Fill in the placeholders (in brackets) based on the Story Idea.
    
    CRITICAL: You must define a SINGLE COHESIVE VISUAL IDENTITY for the protagonist. 
    Describe them once in the CHARACTERS section and state they appear in every shot.

    TEMPLATE TO FILL:
    "Generate a precise ${gridSize}x${gridSize} storyboard sheet (contact sheet) containing exactly ${totalShots} distinct panels from a [INSERT GENRE/STYLE] film.
    The layout must be a perfect grid of ${gridSize} rows and ${gridSize} columns.
    The imagery must feel grounded, authentic, and physically real. No animation style, no painterly rendering, no exaggerated fantasy glow. Real weight, dramatic tension, narrative depth.
    Use specific references: [Insert dynamic reference tags like @img1 for characters/style if applicable].
    
    ⸻
    SCENE & ENVIRONMENT
    [Insert details: Lighting, time of day, weather, location specifics]
    ⸻
    CHARACTERS (CONSISTENCY ENFORCEMENT)
    [Define the Main Character: Name, specific Face, Hair, Outfit. State: 'The character (Name) appears in every panel with identical features and clothing.']
    [Map @img tags here if they are character references]
    ⸻
    ACTION & CONTINUITY
    [Insert details: What happens in the ${totalShots} shots physically, describing each panel sequentially]
    ⸻
    CAMERA & COMPOSITION
    [Insert details: ${totalShots} distinct angles, lens type, distance (Close-up, Wide, Over-shoulder)]
    ⸻
    LIGHTING & ATMOSPHERE
    [Insert details: Mood, contrast, shadows]
    ⸻
    TONE & FINISH
    [Insert details: Film stock, color grade, realism level]"

    RETURN JSON ONLY.
    Structure:
    {
      "title": "string",
      "logline": "string",
      "gridPrompt": "string",
      "shots": [
        { "shotNumber": 1, "description": "string", "cameraAngle": "string", "lighting": "string" }
      ]
    }
  `;

  const parts: any[] = [{ text: prompt }];
  
  safeRefImages.filter(img => img && img.length > 0).forEach(img => {
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: img 
      }
    });
  });

  try {
    const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts }], 
        config: {
            responseMimeType: "application/json",
        }
    });

    if (!response.text) {
        throw new Error("Safety filter triggered. Please soften the story idea.");
    }

    const cleanText = response.text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
    
    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}');
    
    const finalJsonString = (jsonStart !== -1 && jsonEnd !== -1) 
        ? cleanText.substring(jsonStart, jsonEnd + 1)
        : cleanText;

    let parsed: ScriptResponse;
    try {
        parsed = JSON.parse(finalJsonString) as ScriptResponse;
    } catch (parseError) {
        console.error("JSON Parse Error", parseError, finalJsonString);
        throw new Error("Failed to parse script JSON. The model output was malformed.");
    }
    
    if (!parsed.shots) {
        parsed.shots = [];
    }
    
    return parsed;
  } catch (e: any) {
      console.error("Script Generation Error", e);
      let msg = e.message || "Unknown error";
      if (msg.includes("400")) msg = "API Error 400: Bad Request (Check inputs or JSON Schema)";
      if (msg.includes("429")) msg = "API Error 429: Rate Limit Exceeded";
      if (msg.includes("403")) msg = "API Error 403: Permission Denied. Check API Key permissions.";
      if (msg.includes("500")) msg = "API Error 500: Server Error";
      
      throw new Error(`Script Error: ${msg}`);
  }
};

export const regenerateGridPromptOnly = async (
    currentScript: ScriptResponse,
    gridSize: number
): Promise<string> => {
    const ai = await getClient();
    const model = "gemini-3-flash-preview"; // Reverted to Flash 3.0
    
    const totalShots = gridSize * gridSize;

    const prompt = `
      You are a technical prompt engineer.
      
      INPUT SCRIPT:
      Title: ${currentScript.title}
      Logline: ${currentScript.logline}
      Shots:
      ${currentScript.shots.map(s => `${s.shotNumber}. ${s.description} (Angle: ${s.cameraAngle})`).join('\n')}

      TASK:
      Convert this updated script into a SINGLE image generation prompt for a ${gridSize}x${gridSize} grid.
      
      Follow this EXACT TEMPLATE structure (do not add introductory text):
      "Generate a precise ${gridSize}x${gridSize} storyboard sheet (contact sheet) containing exactly ${totalShots} distinct panels... [Synthesize the Action]
      ⸻
      SCENE & ENVIRONMENT
      [Synthesize from script]
      ⸻
      CHARACTERS
      [Synthesize from script - ENFORCE CONSISTENCY]
      ⸻
      ACTION & CONTINUITY
      [Synthesize from script]
      ⸻
      CAMERA & COMPOSITION
      [Synthesize from script]
      ⸻
      LIGHTING & ATMOSPHERE
      [Synthesize from script]
      ⸻
      TONE & FINISH
      [Synthesize from script]"
    `;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }] }
    });

    return response.text || currentScript.gridPrompt;
};

// Returns N candidate images based on count
export const generateBaseGridOptions = async (
  prompt: string,
  aspectRatio: string = '1:1',
  count: number = 2,
  resolution: ImageResolution = ImageResolution.RES_2K,
  stylePrefs: StylePreferences = { mode: 'DEFAULT' },
  cameraShots: CameraShotType[] = [],
  gridSize?: number
): Promise<string[]> => {
  const ai = await getClient();
  // MANDATORY: Nano Banana Pro (gemini-3-pro-image-preview)
  // NOTE: This model often requires a specific API key permission or Paid Tier.
  const model = "gemini-3-pro-image-preview";
  
  const styleModifier = resolveStyleString(stylePrefs);
  const negativePrompt = resolveNegativePrompt(stylePrefs);
  
  const shotModifier = cameraShots.length > 0
    ? cameraShots.map(shot => SHOT_DESCRIPTIONS[shot]).join(' + ')
    : '';

  const layoutInstruction = gridSize 
    ? `LAYOUT MANDATE: Generate a seamless ${gridSize}x${gridSize} contact sheet containing exactly ${gridSize * gridSize} panels.
The panels must be touching directly. 
NO DIVIDING LINES, NO GUTTERS, NO WHITE BORDERS, NO BLACK FRAMES.
The result should look like a single image split perfectly into ${gridSize} rows and ${gridSize} columns.` 
    : '';

  // Restructured prompt to ensure style overrides and layout instructions are prioritized
  let fullPrompt = `
  STORY & CONTENT:
  ${prompt} 

  AESTHETIC & STYLE:
  ${styleModifier}
  
  LAYOUT & COMPOSITION:
  ${layoutInstruction}

  ${shotModifier ? `CAMERA TECHNIQUE OVERRIDE: ${shotModifier}` : ''}

  NEGATIVE PROMPT / EXCLUDED ELEMENTS:
  ${negativePrompt}`;
  
  if (aspectRatio === AspectRatio.CINEMATIC) {
      fullPrompt += "\nNote: Generate in cinematic ultrawide 21:9 aspect ratio";
  }

  const validRatio = resolveAspectRatio(aspectRatio);

  const generateOne = async () => {
      try {
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [{ text: fullPrompt }] },
            config: {
            imageConfig: {
                aspectRatio: validRatio as any,
                imageSize: resolution
            }
            }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
            return part.inlineData.data;
            }
        }
        return null;
      } catch (e: any) {
          console.error("Single grid gen failed", e);
          if (e.message?.includes('403') || e.message?.includes('permission denied')) {
              throw new Error(`Permission Denied for model '${model}'. Ensure your API Key supports gemini-3-pro-image-preview.`);
          }
          if (e.message?.includes('400')) {
               console.warn("Bad Request (400) on image gen. Prompt might be too long or ratio invalid.", e);
          }
          return null;
      }
  };

  const successfulImages: string[] = [];
  
  for (let i = 0; i < count; i++) {
      const result = await generateOne();
      if (result) {
          successfulImages.push(result);
      }
      if (i < count - 1) await new Promise(r => setTimeout(r, 1000));
  }

  if (successfulImages.length === 0) throw new Error(`Failed to generate options using ${model}. Check API permissions and quota.`);
  
  return successfulImages;
};

export const remasterQuadrant = async (
  quadrantBase64: string,
  originalContext: string,
  resolution: ImageResolution,
  aspectRatio: string = '16:9',
  stylePrefs: StylePreferences = { mode: 'DEFAULT' }
): Promise<string> => {
  const ai = await getClient();
  const model = "gemini-3-pro-image-preview"; // Mandatory Pro Model
  
  const styleModifier = resolveStyleString(stylePrefs);
  const negativePrompt = resolveNegativePrompt(stylePrefs);

  let prompt = `Context: ${originalContext}.

  Preserve the exact composition, framing, camera angle, color grade and subject placement — do not alter or add new elements.
  Increase resolution to true high-end cinematic clarity, with natural film-grade sharpness (no AI oversharpening).

  STYLE INSTRUCTIONS:
  ${styleModifier}

  Keep the same color temperature and color tone.
  Texture pass should feel physically real: skin pores, fabric weave, dust, stone, metal, wood — all enhanced without plastic smoothing.
  Maintain cinematic depth of field consistent with the original image (natural lens falloff, no artificial blur).
  
  EXCLUDED:
  ${negativePrompt}

  Do not redraw. Do not stylize. Do not beautify. Only enhance realism and resolution.`;
  
  if (aspectRatio === AspectRatio.CINEMATIC) {
      prompt += ", cinematic ultrawide 21:9 aspect ratio";
  }

  const validRatio = resolveAspectRatio(aspectRatio);

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: quadrantBase64 } },
        { text: prompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: validRatio as any,
        imageSize: resolution
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }
  throw new Error("No remastered image generated");
};

export const generateImageFromReference = async (
  prompt: string,
  resolution: ImageResolution = ImageResolution.RES_2K,
  refImages: string[] = [],
  aspectRatio: string = '16:9',
  cameraShots: CameraShotType[] = []
): Promise<string> => {
    const ai = await getClient();
    const model = "gemini-3-pro-image-preview"; // Mandatory Pro Model

    const parts: any[] = [];
    const safeRefImages = refImages || [];
    safeRefImages.forEach(ref => {
        parts.push({ inlineData: { mimeType: 'image/png', data: ref } });
    });

    const shotModifier = cameraShots.length > 0 
        ? cameraShots.map(shot => SHOT_DESCRIPTIONS[shot]).join(' + ')
        : '';

    let finalPrompt = prompt;
    if (shotModifier) {
        finalPrompt += `\n\nCAMERA TECHNIQUE: ${shotModifier}`;
    }

    if (aspectRatio === AspectRatio.CINEMATIC) {
        finalPrompt += ", cinematic ultrawide 21:9 aspect ratio";
    }
    parts.push({ text: finalPrompt });

    const validRatio = resolveAspectRatio(aspectRatio);

    const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
            imageConfig: {
                imageSize: resolution,
                aspectRatio: validRatio as any
            }
        }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error("No image generated.");
}

export const generateVideoVeo = async (
  prompt: string,
  model: VeoModel,
  aspectRatio: string,
  imageInput?: string, 
  endImageInput?: string,
  refImages?: string[]
): Promise<string> => {
  const ai = await getClient();

  let validRatio = aspectRatio;
  let finalPrompt = prompt;
  
  if (aspectRatio === AspectRatio.CINEMATIC) {
      validRatio = '16:9';
      finalPrompt += ", cinematic ultrawide 21:9 aspect ratio";
  }

  const config: any = {
      numberOfVideos: 1,
      aspectRatio: validRatio as any,
      resolution: '720p', 
  };

  if (model === VeoModel.QUALITY && refImages && refImages.length > 0) {
      config.referenceImages = refImages.map(img => ({
          image: { imageBytes: img, mimeType: 'image/png' },
          referenceType: 'ASSET'
      }));
  }

  const params: any = {
      model,
      prompt: finalPrompt,
      config
  };

  if (imageInput) {
      params.image = { imageBytes: imageInput, mimeType: 'image/png' };
  }
  
  if (endImageInput) {
      config.lastFrame = { imageBytes: endImageInput, mimeType: 'image/png' };
  }

  let operation = await ai.models.generateVideos(params);

  while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("Video generation failed");

  // Use the runtime key to fetch the video
  const vidResponse = await fetch(`${videoUri}&key=${RUNTIME_API_KEY}`);
  const vidBlob = await vidResponse.blob();
  return URL.createObjectURL(vidBlob);
};

export const extractSpecificShotPrompt = async (
  imageBase64: string,
  globalContext: string,
  shotDesc: string
): Promise<string> => {
  const ai = await getClient();
  const model = "gemini-3-flash-preview"; // Reverted to Flash 3.0

  const prompt = `
    You are an expert film director assistant. 
    Analyze the attached image (a specific remastered panel).
    
    SOURCE MATERIAL:
    1. Global Context (Lighting, Tone, Style, Overall Action): "${globalContext}"
    2. Specific Shot Description: "${shotDesc}"
    
    TASK:
    Write a "REMASTERED SOURCE PROMPT" for this specific image.
    - Visually analyze the image to identify which elements of the Global Context are actually present (e.g., specific lighting, specific character details, background elements).
    - Combine the Specific Shot Description with these relevant Global elements.
    - STRIP OUT any details from the Global Context that are NOT present in this specific image.
    - Ensure technical specs (Camera, Film Stock, Lighting style) matches the visual evidence.
    - IMPORTANT: Do NOT include references to specific image IDs (like @img1, @img2). The output should be pure, standalone descriptive text.
    
    Output ONLY the final prompt text.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: imageBase64 } },
        { text: prompt }
      ]
    }
  });

  const rawText = response.text || shotDesc;
  // Final cleaning to remove any lingering @img tags or parentheses containing them
  const cleanedText = rawText
    .replace(/[\(\[]\s*@img\d+\s*[\)\]]/gi, '') // Remove (@img1) or [@img1]
    .replace(/@img\d+/gi, '') // Remove naked @img1
    .replace(/\s{2,}/g, ' ') // Remove double spaces
    .trim();

  return cleanedText;
};