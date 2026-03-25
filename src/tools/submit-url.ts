import { submitUrl } from '../echosaw-client.js';
import { buildResponse, buildErrorResponse, McpToolResponse, AnalyzeMediaData } from '../types.js';

export const submitUrlToolDefinition = {
  name: 'echosaw_analyze_media_url',
  description: 'Submit a publicly accessible or authorized media URL to Echosaw for asynchronous analysis without uploading the file directly. Returns a job ID used to track processing and retrieve results.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      url: {
        type: 'string',
        description: 'HTTP(S) URL of the media file',
      },
      mediaType: {
        type: 'string',
        description: 'One of: video, audio, image',
        enum: ['video', 'audio', 'image'],
      },
    },
    required: ['url', 'mediaType'],
  },
  annotations: {
    title: 'Submit Media URL',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
};

export async function handleSubmitUrl(args: { url: string; mediaType: string }): Promise<McpToolResponse<AnalyzeMediaData | null>> {
  const { url, mediaType } = args;

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return buildErrorResponse('echosaw_analyze_media_url', 'URL must start with http:// or https://');
  }

  // Derive filename from URL path
  const parsed = new URL(url);
  const pathSegments = parsed.pathname.split('/').filter(Boolean);
  const originalFilename = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : undefined;

  const result = await submitUrl(url, mediaType, originalFilename);

  return buildResponse('echosaw_analyze_media_url', { mediaId: result.mediaId, jobId: result.jobId }, {
    message: 'URL submitted. Echosaw is downloading and processing the file.',
    nextAction: { tool: 'echosaw_check_job_status', description: 'Check processing status' },
  });
}
