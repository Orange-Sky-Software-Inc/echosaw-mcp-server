import { checkStatus } from '../echosaw-client.js';
import { buildResponse, McpToolResponse, JobStatusData } from '../types.js';

export const checkStatusToolDefinition = {
  name: 'echosaw_check_job_status',
  description: 'Retrieve the current processing state of an Echosaw analysis job, including whether the job is queued, processing, completed, or failed.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      mediaId: {
        type: 'string',
        description: 'The mediaId returned by echosaw_analyze_media or echosaw_analyze_media_url',
      },
    },
    required: ['mediaId'],
  },
  annotations: {
    title: 'Check Job Status',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

export async function handleCheckStatus(args: { mediaId: string }): Promise<McpToolResponse<JobStatusData>> {
  const { mediaId } = args;
  const result = await checkStatus(mediaId);

  let guidance = '';
  let nextAction: { tool: string; description: string } | undefined;
  const status = (result.status || '').toUpperCase();

  if (status.includes('PROCESSING') || status.includes('PENDING') || status === 'UPLOADED_PENDING_SCAN') {
    guidance = 'The analysis is still in progress. Wait a minute or two and check again.';
    nextAction = { tool: 'echosaw_check_job_status', description: 'Retry after a short delay' };
  } else if (status.includes('COMPLETE') || status.includes('SUCCESS')) {
    guidance = 'The analysis is complete. Retrieve the full intelligence report.';
    nextAction = { tool: 'echosaw_get_analysis_results', description: 'Retrieve analysis results' };
  } else if (status.includes('FAIL') || status.includes('ERROR')) {
    guidance = 'The analysis has failed. Check the error details.';
  }

  return buildResponse('echosaw_check_job_status', {
    mediaId,
    status: result.status,
    createdAt: result.createdAt ? new Date(result.createdAt * 1000).toISOString() : null,
    updatedAt: result.updatedAt ? new Date(result.updatedAt * 1000).toISOString() : null,
  }, {
    message: guidance || undefined,
    nextAction,
  });
}
