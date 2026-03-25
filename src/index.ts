import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { submitFileToolDefinition, handleSubmitFile } from './tools/submit-file.js';
import { submitUrlToolDefinition, handleSubmitUrl } from './tools/submit-url.js';
import { checkStatusToolDefinition, handleCheckStatus } from './tools/check-status.js';
import { getResultsToolDefinition, handleGetResults } from './tools/get-results.js';
import { downloadFileToolDefinition, handleDownloadFile } from './tools/download-file.js';
import { buildErrorResponse } from './types.js';

const server = new Server(
  {
    name: 'echosaw',
    version: '1.2.3',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      submitFileToolDefinition,
      submitUrlToolDefinition,
      checkStatusToolDefinition,
      getResultsToolDefinition,
      downloadFileToolDefinition,
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case 'echosaw_analyze_media':
        result = await handleSubmitFile(args as { filePath: string; mediaType: string });
        break;
      case 'echosaw_analyze_media_url':
        result = await handleSubmitUrl(args as { url: string; mediaType: string });
        break;
      case 'echosaw_check_job_status':
        result = await handleCheckStatus(args as { mediaId: string });
        break;
      case 'echosaw_get_analysis_results':
        result = await handleGetResults(args as { mediaId: string; section?: string });
        break;
      case 'echosaw_download_media':
        result = await handleDownloadFile(args as { mediaId: string });
        break;
      default:
        result = buildErrorResponse(name, `Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(name, message), null, 2) }],
      isError: true,
    };
  }
});

export async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
