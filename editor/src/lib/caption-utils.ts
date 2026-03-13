import { type Studio, type IClip, jsonToClip } from 'openvideo';
import { generateCaptionClips } from './caption-generator';

export type WordsPerLineMode = 'single' | 'multiple';

/** Word entry as used by caption clips */
interface CaptionWord {
  text: string;
  from: number;
  to: number;
  isKeyWord: boolean;
  paragraphIndex?: number;
}

/**
 * Minimal track shape matching Studio.getTracks() return.
 * StudioTrack is not exported from the openvideo package.
 */
interface TrackLike {
  id: string;
  clipIds: string[];
}

/**
 * Shape of caption clip properties accessed in this module.
 * The Caption class keeps `opts` and `originalOpts` private,
 * so we describe only the public surface we actually touch.
 */
interface CaptionClipLike extends IClip {
  mediaId?: string;
  words?: CaptionWord[];
  wordsPerLine?: WordsPerLineMode;
  originalOpts?: Record<string, unknown>;
}

/** Style update payload accepted by regenerateCaptionClips */
interface CaptionStyleUpdate {
  fill?: string;
  align?: string;
  fontFamily?: string;
  fontUrl?: string;
  strokeWidth?: number;
  stroke?: string;
  dropShadow?: {
    color: number | string;
    alpha: number;
    blur: number;
    angle: number;
    distance: number;
  };
  textCase?: string;
  caption?: {
    colors?: Record<string, string>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface RegenerateCaptionClipsOptions {
  studio: Studio;
  captionClip: CaptionClipLike;
  mode: WordsPerLineMode;
  fontSize?: number;
  fontFamily?: string;
  fontUrl?: string;
  styleUpdate?: CaptionStyleUpdate;
}

export async function regenerateCaptionClips({
  studio,
  captionClip,
  mode,
  fontSize,
  fontFamily,
  fontUrl,
  styleUpdate,
}: RegenerateCaptionClipsOptions) {
  if (!studio || !captionClip?.mediaId) return;

  const mediaId = captionClip.mediaId;
  const tracks = studio.getTracks() as TrackLike[];
  const siblingClips: CaptionClipLike[] = [];

  tracks.forEach((track) => {
    track.clipIds.forEach((id: string) => {
      const c = studio.getClipById(id);
      if (
        c &&
        c.type === 'Caption' &&
        (c as CaptionClipLike).mediaId === mediaId
      ) {
        siblingClips.push(c as CaptionClipLike);
      }
    });
  });

  siblingClips.sort((a, b) => a.display.from - b.display.from);

  if (siblingClips.length === 0) return;

  const uniformTop = captionClip.top ?? 0;

  const mediaClip = studio.getClipById(mediaId);
  if (!mediaClip) return;

  const mediaStartUs = mediaClip.display.from;
  const allWords: Array<CaptionWord & { start: number; end: number }> = [];

  siblingClips.forEach((c) => {
    const clipStartUs = c.display.from;
    const words = c.words || [];
    words.forEach((w) => {
      allWords.push({
        ...w,
        start: (clipStartUs + w.from * 1000 - mediaStartUs) / 1000000,
        end: (clipStartUs + w.to * 1000 - mediaStartUs) / 1000000,
      });
    });
  });

  if (allWords.length === 0) return;

  // Merge style updates if provided
  const combinedStyle = {
    ...captionClip.style,
    ...(styleUpdate || {}),
  };

  const currentOpts = captionClip.originalOpts || {};
  const newClipsJSON = await generateCaptionClips({
    videoWidth: studio.opts.width,
    videoHeight: studio.opts.height,
    words: allWords,
    mode: mode,
    fontSize:
      fontSize ||
      (currentOpts.fontSize as number | undefined) ||
      80,
    fontFamily:
      fontFamily ||
      (currentOpts.fontFamily as string | undefined) ||
      'Bangers-Regular',
    fontUrl: fontUrl || (currentOpts.fontUrl as string | undefined),
    style: combinedStyle,
  });

  const trackId = studio.findTrackIdByClipId(captionClip.id);
  if (!trackId) return;

  // Optimistically update siblings (though they will be replaced)
  siblingClips.forEach((c) => {
    try {
      c.wordsPerLine = mode;
      if (c.originalOpts) c.originalOpts.wordsPerLine = mode;
      c.emit?.('propsChange', {});
    } catch (_e) {
      // ignore
    }
  });

  const clipsToAdd: IClip[] = [];

  for (const json of newClipsJSON) {
    const enrichedJson = {
      ...json,
      mediaId,
      wordsPerLine: mode,
      top: uniformTop,
      originalOpts: {
        ...(json.originalOpts || {}),
        wordsPerLine: mode,
        ...(styleUpdate?.caption ? { caption: styleUpdate.caption } : {}),
      },
      opts: {
        ...(json.opts || {}),
        wordsPerLine: mode,
        ...(styleUpdate?.caption ? { caption: styleUpdate.caption } : {}),
      },
      display: {
        from: json.display.from + mediaStartUs,
        to: json.display.to + mediaStartUs,
      },
    };

    // If styleUpdate contains other caption fields, ensure they are applied
    if (styleUpdate) {
      if (styleUpdate.fill) enrichedJson.style.color = styleUpdate.fill;
      if (styleUpdate.align) enrichedJson.style.align = styleUpdate.align;
      if (styleUpdate.fontFamily)
        enrichedJson.style.fontFamily = styleUpdate.fontFamily;
      if (styleUpdate.fontUrl) enrichedJson.style.fontUrl = styleUpdate.fontUrl;

      if (styleUpdate.strokeWidth !== undefined || styleUpdate.stroke) {
        if (
          typeof enrichedJson.style.stroke !== 'object' ||
          enrichedJson.style.stroke === null
        ) {
          enrichedJson.style.stroke = {
            color:
              typeof enrichedJson.style.stroke === 'string'
                ? enrichedJson.style.stroke
                : '#000000',
            width: 0,
          };
        }
        if (styleUpdate.strokeWidth !== undefined)
          enrichedJson.style.stroke.width = styleUpdate.strokeWidth;
        if (styleUpdate.stroke)
          enrichedJson.style.stroke.color = styleUpdate.stroke;
      }

      if (styleUpdate.dropShadow) {
        enrichedJson.style.shadow = {
          color: styleUpdate.dropShadow.color,
          alpha: styleUpdate.dropShadow.alpha,
          blur: styleUpdate.dropShadow.blur,
          offsetX:
            styleUpdate.dropShadow.distance *
            Math.cos(styleUpdate.dropShadow.angle),
          offsetY:
            styleUpdate.dropShadow.distance *
            Math.sin(styleUpdate.dropShadow.angle),
        };
      }

      if (styleUpdate.textCase)
        enrichedJson.style.textCase = styleUpdate.textCase;

      if (styleUpdate.caption) {
        if (!enrichedJson.caption) enrichedJson.caption = {};
        enrichedJson.caption = {
          ...enrichedJson.caption,
          ...styleUpdate.caption,
          colors: {
            ...(enrichedJson.caption.colors || {}),
            ...(styleUpdate.caption.colors || {}),
          },
        };
      }
    }

    const clip = await jsonToClip(enrichedJson);
    clipsToAdd.push(clip);
  }

  siblingClips.forEach((c) => studio.removeClipById(c.id));
  await studio.addClip(clipsToAdd, { trackId });

  return clipsToAdd;
}
