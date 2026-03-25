import * as fs from 'node:fs';
import * as path from 'node:path';
import { submitAnalysis, uploadFile } from '../echosaw-client.js';
import { buildResponse, buildErrorResponse, McpToolResponse, AnalyzeMediaData } from '../types.js';

const EXTENSION_CONTENT_TYPE_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
};

export const submitFileToolDefinition = {
  name: 'echosaw_analyze_media',
  description: 'Upload an audio, video, or image file to Echosaw for asynchronous media analysis. Returns a job ID used to track processing and retrieve results.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      filePath: {
        type: 'string',
        description: 'Absolute path to the media file on disk',
      },
      mediaType: {
        type: 'string',
        description: 'One of: video, audio, image',
        enum: ['video', 'audio', 'image'],
      },
    },
    required: ['filePath', 'mediaType'],
  },
  annotations: {
    title: 'Upload Media File',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
};

export async function handleSubmitFile(args: { filePath: string; mediaType: string }): Promise<McpToolResponse<AnalyzeMediaData | null>> {
  const { filePath, mediaType } = args;

  if (!fs.existsSync(filePath)) {
    return buildErrorResponse('echosaw_analyze_media', `File not found at path: ${filePath}`);
  }

  const originalFilename = path.basename(filePath);
  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  const ext = path.extname(filePath).toLowerCase();
  const contentType = EXTENSION_CONTENT_TYPE_MAP[ext] || 'application/octet-stream';

  const result = await submitAnalysis(mediaType, originalFilename, fileSize, contentType);
  await uploadFile(result.uploadUrl, filePath, contentType);

  return buildResponse('echosaw_analyze_media', { mediaId: result.mediaId, jobId: result.jobId }, {
    message: 'File submitted for analysis.',
    nextAction: { tool: 'echosaw_check_job_status', description: 'Check processing status' },
  });
}
