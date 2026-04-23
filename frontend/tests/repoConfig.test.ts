import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../..');
const removedBackendDir = ['backend', 'no' + 'de'].join('-');

describe('repository runtime configuration', () => {
  it('keeps npm workspace startup scoped to the frontend package', () => {
    const rootPackage = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

    expect(rootPackage.workspaces).toEqual(['frontend']);
    expect(rootPackage.scripts.dev).toBe('npm -w frontend run dev');
    expect(Object.values(rootPackage.scripts).join('\n')).not.toContain(removedBackendDir);
    expect(existsSync(path.join(repoRoot, removedBackendDir))).toBe(false);
  });

  it('runs database migrations from the Python backend image in compose', () => {
    const compose = readFileSync(path.join(repoRoot, 'docker-compose.yml'), 'utf8');

    expect(compose).toContain('build: ./backend');
    expect(compose).toContain('"alembic", "upgrade", "head"');
    expect(compose).not.toContain(removedBackendDir);
  });

  it('ships installable PWA metadata and an offline app shell worker', () => {
    const manifestPath = path.join(repoRoot, 'frontend', 'public', 'manifest.webmanifest');
    const workerPath = path.join(repoRoot, 'frontend', 'public', 'service-worker.js');
    const indexHtml = readFileSync(path.join(repoRoot, 'frontend', 'index.html'), 'utf8');

    expect(existsSync(manifestPath)).toBe(true);
    expect(existsSync(workerPath)).toBe(true);
    expect(indexHtml).toContain('rel="manifest"');

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const worker = readFileSync(workerPath, 'utf8');
    expect(manifest.name).toBe('Task Management AI');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    expect(worker).toContain('task-ai-shell');
    expect(worker).toContain('fetch');
  });
});
