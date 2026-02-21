/**
 * Text-to-video assembly service
 * Uses AI to generate search keywords from scene descriptions,
 * matches stock footage from multiple providers,
 * and assembles scenes into editable project structure
 */

import { ai } from '@/genkit/chat-flow';
import type { VideoStylePreset } from '../presets/video-style-presets';
import { searchAllStockProviders } from '../providers/stock/factory';
import type { StockClip } from '../providers/stock/types';

export interface Scene {
  description: string;
  duration: number;
  mood?: string;
  textOverlay?: string;
}

export interface ProjectComposition {
  elements: ProjectElement[];
  transitions: ProjectTransition[];
  duration: number;
  settings: {
    width: number;
    height: number;
    fps: number;
  };
}

interface ProjectElement {
  type: 'Video' | 'Text';
  id: string;
  display: {
    from: number;
    to: number;
  };
  [key: string]: unknown;
}

interface ProjectTransition {
  type: string;
  duration: number;
  from: number;
  to: number;
}

export class TextToVideoService {
  /**
   * Generate video composition from storyboard scenes
   */
  async generateFromStoryboard(
    scenes: Scene[],
    style: VideoStylePreset
  ): Promise<{
    composition: ProjectComposition;
    scenesWithClips: Array<{ scene: Scene; clip: StockClip | null }>;
  }> {
    // Step 1: Generate search queries for each scene using AI
    const searchQueries = await this.generateSearchQueries(scenes);

    // Step 2: Search for stock footage in parallel
    const clipSearchPromises = searchQueries.map(async (query, index) => {
      const scene = scenes[index];
      const clips = await searchAllStockProviders({
        query,
        perPage: 10,
        orientation: 'landscape',
        minDuration: scene.duration,
      });

      // Pick best clip (first result that meets duration requirement)
      // If no clips meet duration, pick the longest one
      const suitableClip = clips.find(
        (clip) => clip.duration >= scene.duration
      );
      const bestClip = suitableClip || clips[0] || null;

      return { scene, clip: bestClip };
    });

    const scenesWithClips = await Promise.all(clipSearchPromises);

    // Step 3: Assemble composition
    const composition = this.assembleComposition(scenesWithClips, style);

    return { composition, scenesWithClips };
  }

  /**
   * Generate search keywords for scenes using Claude
   */
  private async generateSearchQueries(scenes: Scene[]): Promise<string[]> {
    try {
      const prompt = `For each scene description below, generate 2-3 optimized search keywords for finding stock footage on Pexels or Pixabay.

Requirements:
- Keep keywords simple and specific (e.g., "business meeting", "sunset beach", "typing laptop")
- Focus on visual elements that are filmable
- Avoid abstract concepts
- Return a JSON array of strings, one query per scene

Scenes:
${scenes.map((s, i) => `${i + 1}. ${s.description}${s.mood ? ` (mood: ${s.mood})` : ''}`).join('\n')}

Return ONLY a JSON array, no other text.`;

      const { text } = await ai.generate({
        prompt,
        config: { maxOutputTokens: 1024 },
      });

      // Parse JSON response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const queries: string[] = JSON.parse(jsonMatch[0]);

      // Validate response
      if (!Array.isArray(queries) || queries.length !== scenes.length) {
        throw new Error(
          `Expected ${scenes.length} queries, got ${queries?.length || 0}`
        );
      }

      return queries;
    } catch (error) {
      console.error('Error generating search queries with AI:', error);

      // Fallback: extract keywords from scene descriptions
      return scenes.map((scene) => {
        // Simple keyword extraction: take first 3-4 words, remove common words
        const words = scene.description.toLowerCase().split(/\s+/);
        const stopWords = new Set([
          'a',
          'an',
          'the',
          'is',
          'are',
          'was',
          'were',
          'in',
          'on',
          'at',
          'to',
          'for',
        ]);
        const keywords = words
          .filter((w) => !stopWords.has(w))
          .slice(0, 3)
          .join(' ');
        return keywords || scene.description.slice(0, 30);
      });
    }
  }

  /**
   * Assemble scenes and clips into a project composition
   */
  private assembleComposition(
    scenesWithClips: Array<{ scene: Scene; clip: StockClip | null }>,
    style: VideoStylePreset
  ): ProjectComposition {
    const elements: ProjectElement[] = [];
    const transitions: ProjectTransition[] = [];
    let currentTimeUs = 0;

    for (let i = 0; i < scenesWithClips.length; i++) {
      const { scene, clip } = scenesWithClips[i];

      if (!clip) {
        // Skip scenes without clips
        continue;
      }

      // Calculate timing in microseconds
      const sceneDurationUs = Math.floor(scene.duration * 1_000_000);
      const startTimeUs = currentTimeUs;
      const endTimeUs = currentTimeUs + sceneDurationUs;

      // Add video element
      const videoElement: ProjectElement = {
        type: 'Video',
        id: `video-${i}`,
        src: clip.url,
        display: {
          from: startTimeUs,
          to: endTimeUs,
        },
        width: 1920,
        height: 1080,
        x: 0,
        y: 0,
        clipDuration: clip.duration,
        clipStart: 0,
        provider: clip.provider,
        attribution: clip.attribution,
      };

      elements.push(videoElement);

      // Add text overlay if specified
      if (scene.textOverlay) {
        const textElement: ProjectElement = {
          type: 'Text',
          id: `text-${i}`,
          text: scene.textOverlay,
          display: {
            from: startTimeUs,
            to: endTimeUs,
          },
          x: 960, // Center horizontally
          y: 540, // Center vertically
          width: 1600,
          height: 200,
          fontSize: style.textStyle.fontSize,
          fontFamily: style.textStyle.fontFamily,
          fontWeight: style.textStyle.fontWeight,
          color: style.textStyle.color,
          textAlign: 'center',
          verticalAlign: 'middle',
          background: style.textStyle.background,
          stroke: style.textStyle.stroke,
        };

        elements.push(textElement);
      }

      // Add transition between consecutive clips
      if (i < scenesWithClips.length - 1 && scenesWithClips[i + 1].clip) {
        const transitionDurationUs = Math.floor(
          style.transitionDuration * 1_000_000
        );
        const transitionStartUs = endTimeUs - transitionDurationUs;

        transitions.push({
          type: style.transitionType,
          duration: transitionDurationUs,
          from: transitionStartUs,
          to: endTimeUs,
        });
      }

      currentTimeUs = endTimeUs;
    }

    const totalDurationSeconds = currentTimeUs / 1_000_000;

    return {
      elements,
      transitions,
      duration: totalDurationSeconds,
      settings: {
        width: 1920,
        height: 1080,
        fps: 30,
      },
    };
  }
}
