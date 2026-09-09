declare module '@vercel/sandbox' {
  export class Sandbox {
    static create(opts: Record<string, unknown>): Promise<Sandbox>;
    writeFiles(files: Array<{ path: string; content: Buffer }>): Promise<void>;
    runCommand(
      cmd: string,
      args: string[],
    ): Promise<{ stdout(): Promise<string>; stderr(): Promise<string>; exitCode?: number }>;
    stop(): Promise<void>;
  }
}
