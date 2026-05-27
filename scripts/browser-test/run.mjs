/**
 * Browser test entry — bundles mp4box so WebCodecs tests run without Vite.
 */
import { processVideoFile } from '../../dist/browser.js';

window.runVideoTest = async (videoUrl, options = {}) => {
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to load fixture: ${videoUrl}`);
  }
  const blob = await response.blob();
  const file = new File([blob], videoUrl.split('/').pop(), { type: 'video/mp4' });
  const output = await processVideoFile(file, options);
  return {
    size: output.size,
    type: output.type,
    skipped: output.skipped ?? false,
    reason: output.reason ?? null,
    processedFrames: output.processedFrames ?? null,
    videoProfile: output.videoProfile ?? null,
  };
};
