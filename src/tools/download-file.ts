import { downloadFile } from '../echosaw-client.js';
import { buildResponse, McpToolResponse, DownloadMediaData } from '../types.js';

export const downloadFileToolDefinition = {
  name: 'echosaw_download_media',
  description: 'Generate a presigned download URL for the source media file associated with a completed analysis job. The URL is valid for 1 hour.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      mediaId: {
        type: 'string',
        description: 'The mediaId of the media to download',
      },
    },
    required: ['mediaId'],
  },
  annotations: {
    title: 'Download Source Media',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

export async function handleDownloadFile(args: { mediaId: string }): Promise<McpToolResponse<DownloadMediaData>> {
  const { mediaId } = args;
  const result = await downloadFile(mediaId);
  return buildResponse('echosaw_download_media', { mediaId, downloadUrl: result.downloadUrl, expiresIn: '1 hour' }, {
    message: 'Download URL generated.',
  });
}
