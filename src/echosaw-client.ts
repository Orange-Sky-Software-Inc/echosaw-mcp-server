import * as https from 'node:https';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ECHOSAW_API_KEY = process.env.ECHOSAW_API_KEY;
const ECHOSAW_API_URL = process.env.ECHOSAW_API_URL || 'https://api.echosaw.com';

if (!ECHOSAW_API_KEY) {
  console.error('ECHOSAW_API_KEY environment variable is required');
  process.exit(1);
}

interface ApiResponse {
  statusCode: number;
  body: string;
}

function makeRequest(method: string, urlPath: string, body?: string): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const base = new URL(ECHOSAW_API_URL);
    const basePath = base.pathname.replace(/\/$/, '');
    const parsed = new URL(urlPath, ECHOSAW_API_URL);
    const isHttps = parsed.protocol === 'https:';
    const requestModule = isHttps ? https : http;

    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: basePath + parsed.pathname + parsed.search,
      method,
      headers: {
        'X-Api-Key': ECHOSAW_API_KEY!,
        'Content-Type': 'application/json',
      },
    };

    const req = requestModule.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 500,
          body: Buffer.concat(chunks).toString('utf-8'),
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

export interface SubmitAnalysisResult {
  jobId: string;
  mediaId: string;
  uploadUrl: string;
}

export interface SubmitUrlResult {
  jobId: string;
  mediaId: string;
}

export interface StatusResult {
  mediaId: string;
  status: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface DownloadResult {
  downloadUrl: string;
}

export async function submitAnalysis(
  mediaType: string,
  originalFilename?: string,
  fileSize?: number,
  contentType?: string,
): Promise<SubmitAnalysisResult> {
  const payload: Record<string, unknown> = { mediaType };
  if (originalFilename) payload.originalFilename = originalFilename;
  if (fileSize) payload.fileSize = fileSize;
  if (contentType) payload.contentType = contentType;

  const res = await makeRequest('POST', '/v1/analyze', JSON.stringify(payload));
  if (res.statusCode !== 200) {
    throw new Error(`POST /v1/analyze failed (${res.statusCode}): ${res.body}`);
  }
  return JSON.parse(res.body) as SubmitAnalysisResult;
}

export async function uploadFile(uploadUrl: string, filePath: string, contentType: string): Promise<void> {
  const fileBuffer = fs.readFileSync(filePath);
  const parsed = new URL(uploadUrl);
  const isHttps = parsed.protocol === 'https:';
  const requestModule = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length,
      },
    };

    const req = requestModule.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`PUT upload failed (${res.statusCode}): ${Buffer.concat(chunks).toString('utf-8')}`));
        }
      });
    });

    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });
}

export async function submitUrl(
  url: string,
  mediaType: string,
  originalFilename?: string,
): Promise<SubmitUrlResult> {
  const payload: Record<string, unknown> = { url, mediaType };
  if (originalFilename) payload.originalFilename = originalFilename;

  const res = await makeRequest('POST', '/v1/analyze/url', JSON.stringify(payload));
  if (res.statusCode !== 200) {
    throw new Error(`POST /v1/analyze/url failed (${res.statusCode}): ${res.body}`);
  }
  return JSON.parse(res.body) as SubmitUrlResult;
}

export async function checkStatus(mediaId: string): Promise<StatusResult> {
  const res = await makeRequest('GET', `/v1/analysis/status/${encodeURIComponent(mediaId)}`);
  if (res.statusCode !== 200) {
    throw new Error(`GET /v1/analysis/status failed (${res.statusCode}): ${res.body}`);
  }
  return JSON.parse(res.body) as StatusResult;
}

export async function getResults(mediaId: string): Promise<unknown> {
  const res = await makeRequest('GET', `/v1/analysis/results/${encodeURIComponent(mediaId)}`);
  if (res.statusCode !== 200) {
    throw new Error(`GET /v1/analysis/results failed (${res.statusCode}): ${res.body}`);
  }
  return JSON.parse(res.body);
}

export async function downloadFile(mediaId: string): Promise<DownloadResult> {
  const res = await makeRequest('GET', `/v1/media/locker/download?mediaId=${encodeURIComponent(mediaId)}`);
  if (res.statusCode !== 200) {
    throw new Error(`GET /v1/media/locker/download failed (${res.statusCode}): ${res.body}`);
  }
  return JSON.parse(res.body) as DownloadResult;
}
