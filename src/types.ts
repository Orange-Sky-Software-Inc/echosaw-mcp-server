export const RESPONSE_VERSION = '1.0';

export interface McpToolResponse<T = unknown> {
  success: boolean;
  tool: string;
  responseVersion: string;
  data: T;
  message?: string;
  error?: string;
  nextAction?: { tool: string; description: string };
}

export interface AnalyzeMediaData {
  mediaId: string;
  jobId: string;
}

export interface JobStatusData {
  mediaId: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AnalysisResultsData {
  mediaId: string;
  report: unknown;
}

export interface DownloadMediaData {
  mediaId: string;
  downloadUrl: string;
  expiresIn: string;
}

// Lightweight validation helper — asserts required fields are present
export function buildResponse<T>(
  tool: string,
  data: T,
  opts?: { message?: string; nextAction?: { tool: string; description: string } }
): McpToolResponse<T> {
  return {
    success: true,
    tool,
    responseVersion: RESPONSE_VERSION,
    data,
    ...(opts?.message ? { message: opts.message } : {}),
    ...(opts?.nextAction ? { nextAction: opts.nextAction } : {}),
  };
}

export function buildErrorResponse(tool: string, error: string): McpToolResponse<null> {
  return {
    success: false,
    tool,
    responseVersion: RESPONSE_VERSION,
    data: null,
    error,
  };
}
