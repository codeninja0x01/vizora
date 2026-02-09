import { BaseTimelineClip, type BaseClipProps } from './base';
import type { Control } from 'fabric';
import { createTrimControls } from '../controls';
import { editorFont } from '@/components/editor/constants';
import {
  CLIP_COLORS,
  SELECTION_COLOR,
  SELECTION_BORDER_WIDTH,
} from '@/components/editor/timeline/timeline-constants';
import { useStudioStore } from '@/stores/studio-store';
import type { Audio as AudioClip } from 'openvideo';

export class Audio extends BaseTimelineClip {
  isSelected: boolean;
  public studioClipId?: string;
  private _waveformPeaks: Float32Array | null = null;
  private _isGeneratingPeaks: boolean = false;

  static createControls(): { controls: Record<string, Control> } {
    return { controls: createTrimControls() };
  }

  static ownDefaults = {
    rx: 4,
    ry: 4,
    objectCaching: false,
    borderColor: 'transparent',
    stroke: 'transparent',
    strokeWidth: 0,
    fill: CLIP_COLORS.audio,
    borderOpacityWhenMoving: 1,
    hoverCursor: 'default',
  };

  constructor(options: BaseClipProps) {
    super(options);
    Object.assign(this, Audio.ownDefaults);
    this.text = options.text;
    this.set({
      fill: CLIP_COLORS.audio,
    });
    // Trigger peak generation on initialization
    this.generateWaveformPeaks();
  }

  public _render(ctx: CanvasRenderingContext2D) {
    // Save context and set up clipping
    ctx.save();

    // Apply rounded rectangle clipping
    const radius = this.rx || 4;
    ctx.beginPath();
    ctx.roundRect(
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height,
      radius
    );
    ctx.clip();

    // Draw background fill
    ctx.fillStyle = (this.fill as string) || CLIP_COLORS.audio;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

    // Translate for waveform and identity drawing
    ctx.translate(-this.width / 2, -this.height / 2);

    // Draw waveform if available
    this.drawWaveform(ctx);

    // Draw identity (clip name)
    this.drawIdentity(ctx);

    ctx.restore();

    // Draw selection border (outside the clipping region)
    this.updateSelected(ctx);
  }

  private async generateWaveformPeaks() {
    if (this._isGeneratingPeaks || this._waveformPeaks) return;

    const studio = useStudioStore.getState().studio;
    if (!studio || !this.studioClipId) return;

    const clip = studio.getClipById(this.studioClipId);
    if (!clip || clip.type !== 'Audio') return;

    this._isGeneratingPeaks = true;

    try {
      const audioClip = clip as AudioClip;
      await audioClip.ready;

      const pcmData = audioClip.getPCMData();
      if (!pcmData || pcmData.length === 0) {
        this._isGeneratingPeaks = false;
        return;
      }

      // Use first channel (mono or left channel)
      const channelData = pcmData[0];
      const sampleCount = channelData.length;

      // Target peak count: ~200 peaks per clip for smooth visualization at any zoom
      const targetPeakCount = 200;
      const samplesPerPeak = Math.max(
        1,
        Math.floor(sampleCount / targetPeakCount)
      );

      const peaks = new Float32Array(targetPeakCount);

      // Extract peaks by finding max absolute value in each segment
      for (let i = 0; i < targetPeakCount; i++) {
        const startIdx = i * samplesPerPeak;
        const endIdx = Math.min(startIdx + samplesPerPeak, sampleCount);
        let maxAmplitude = 0;

        for (let j = startIdx; j < endIdx; j++) {
          maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[j]));
        }

        peaks[i] = maxAmplitude;
      }

      this._waveformPeaks = peaks;
      this._isGeneratingPeaks = false;

      // Trigger re-render
      this.canvas?.requestRenderAll();
    } catch (error) {
      console.warn('Failed to generate waveform peaks:', error);
      this._isGeneratingPeaks = false;
    }
  }

  private drawWaveform(ctx: CanvasRenderingContext2D) {
    if (!this._waveformPeaks || this._waveformPeaks.length === 0) {
      // Fallback: solid background already drawn
      return;
    }

    const peaks = this._waveformPeaks;
    const peakCount = peaks.length;
    const clipWidth = this.width;
    const clipHeight = this.height;

    // Waveform rendering: mirrored shape (top + bottom)
    // Color: lighter green with slight alpha for visual layering
    ctx.fillStyle = 'rgba(0, 200, 100, 0.4)'; // Lighter green overlay

    ctx.beginPath();

    // Draw top half of waveform
    for (let i = 0; i < peakCount; i++) {
      const x = (i / peakCount) * clipWidth;
      const amplitude = peaks[i];
      const barHeight = amplitude * clipHeight * 0.4; // 40% max height for top half
      const y = clipHeight / 2 - barHeight;

      if (i === 0) {
        ctx.moveTo(x, clipHeight / 2);
      }
      ctx.lineTo(x, y);
    }

    // Draw bottom half of waveform (mirrored)
    for (let i = peakCount - 1; i >= 0; i--) {
      const x = (i / peakCount) * clipWidth;
      const amplitude = peaks[i];
      const barHeight = amplitude * clipHeight * 0.4; // 40% max height for bottom half
      const y = clipHeight / 2 + barHeight;

      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
  }

  public drawIdentity(ctx: CanvasRenderingContext2D) {
    const text = this.text || '';

    ctx.save();

    // Draw text with background pill for readability over waveform
    ctx.font = `600 11px ${editorFont.fontFamily}`;
    const paddingX = 6;
    const paddingY = 2;
    const bgHeight = 14 + paddingY * 2;
    const margin = 4;

    const metrics = ctx.measureText(text);
    const bgWidth = metrics.width + paddingX * 2;

    // Draw background pill
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(margin, margin, bgWidth, bgHeight, 4);
    ctx.fill();

    // Draw text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, margin + paddingX, margin + paddingY + 1);

    ctx.restore();
  }
  public updateSelected(ctx: CanvasRenderingContext2D) {
    const borderColor = this.isSelected
      ? SELECTION_COLOR
      : 'rgba(255, 255, 255, 0.1)';
    const borderWidth = SELECTION_BORDER_WIDTH;
    const radius = 4;

    ctx.save();
    ctx.fillStyle = borderColor;

    // Create a path for the outer rectangle
    ctx.beginPath();
    ctx.roundRect(
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height,
      radius
    );

    // Create a path for the inner rectangle (the hole)
    ctx.roundRect(
      -this.width / 2 + borderWidth,
      -this.height / 2 + borderWidth,
      this.width - borderWidth * 2,
      this.height - borderWidth * 2,
      radius - borderWidth
    );

    // Use even-odd fill rule to create the border effect
    ctx.fill('evenodd');
    ctx.restore();
  }
  public setSelected(selected: boolean) {
    this.isSelected = selected;
    this.set({ dirty: true });
  }
}
