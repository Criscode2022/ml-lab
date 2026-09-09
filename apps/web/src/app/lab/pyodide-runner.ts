type Pyodide = {
  loadPackage: (name: string) => Promise<void>;
  runPythonAsync: (code: string) => Promise<unknown>;
  FS: { writeFile: (path: string, data: string) => void };
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
};

let loader: Promise<Pyodide> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

async function getPyodide(): Promise<Pyodide> {
  if (!loader) {
    const indexURL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
    loader = loadScript(`${indexURL}pyodide.js`).then(async () => {
      const load = (globalThis as unknown as { loadPyodide: (opts: { indexURL: string }) => Promise<Pyodide> })
        .loadPyodide;
      const py = await load({ indexURL });
      await py.loadPackage('numpy');
      return py;
    });
  }
  return loader;
}

export async function runPythonBrowser(
  code: string,
  files: Record<string, string>,
): Promise<{ stdout: string; stderr: string; status: 'succeeded' | 'failed'; isolated: true; backend: 'pyodide' }> {
  const py = await getPyodide();
  let stdout = '';
  let stderr = '';
  py.setStdout({ batched: (s) => { stdout += s + '\n'; } });
  py.setStderr({ batched: (s) => { stderr += s + '\n'; } });
  for (const [name, contents] of Object.entries(files)) {
    py.FS.writeFile(name, contents);
  }
  try {
    await py.runPythonAsync(code);
    return { stdout, stderr, status: 'succeeded', isolated: true, backend: 'pyodide' };
  } catch (err) {
    stderr += err instanceof Error ? err.message : String(err);
    return { stdout, stderr, status: 'failed', isolated: true, backend: 'pyodide' };
  }
}
