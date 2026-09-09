export type SandboxStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'timeout'
  | 'stopped'
  | 'reset';

export type SandboxRequest = {
  runId?: string;
  code: string;
  timeoutMs?: number;
  files?: Record<string, string>;
  pythonBin?: string;
};

export type SandboxResult = {
  runId: string;
  status: SandboxStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  interpreterPid: number | null;
  hostPid: number;
  timedOut: boolean;
  durationMs: number;
  isolated: boolean;
  backend: 'local' | 'vercel';
};

export type SandboxRunner = {
  run(req: SandboxRequest, onChunk?: (stream: 'stdout' | 'stderr', chunk: string) => void): Promise<SandboxResult>;
  stop(runId: string): boolean;
  reset(runId: string): boolean;
};
