import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(import.meta.dirname, '..');
const biomeBin = path.join(repoRoot, 'node_modules', '.bin', 'biome');
const tempDirs: string[] = [];

async function makeFixture(): Promise<string> {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), 'vizora-biome-'));
  tempDirs.push(fixtureDir);

  await writeFile(
    path.join(fixtureDir, 'package.json'),
    `${JSON.stringify({ name: 'biome-fixture', private: true }, null, 2)}\n`
  );

  await writeFile(
    path.join(fixtureDir, 'biome.json'),
    await readFile(path.join(repoRoot, 'biome.json'), 'utf8')
  );

  await writeFile(
    path.join(fixtureDir, '.gitignore'),
    await readFile(path.join(repoRoot, '.gitignore'), 'utf8')
  );

  return fixtureDir;
}

async function runBiomeCheck(cwd: string) {
  try {
    const result = await execFileAsync(biomeBin, ['check', '.'], { cwd });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const failure = error as Error & {
      code?: number;
      stdout?: string;
      stderr?: string;
    };

    return {
      code: failure.code ?? 1,
      stdout: failure.stdout ?? '',
      stderr: failure.stderr ?? '',
    };
  }
}

async function runGitStatus(cwd: string) {
  await execFileAsync('git', ['init'], { cwd });
  const result = await execFileAsync(
    'git',
    ['status', '--short', '--ignored', '--', '.pnpm-store'],
    {
      cwd,
    }
  );
  return result.stdout;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

describe('Biome and git ignore pnpm store artifacts', () => {
  it('should let pnpm check pass when the only invalid files live under .pnpm-store', async () => {
    const fixtureDir = await makeFixture();

    await mkdir(path.join(fixtureDir, '.pnpm-store', 'metadata'), {
      recursive: true,
    });
    await writeFile(
      path.join(fixtureDir, '.pnpm-store', 'metadata', 'package.json'),
      '{ invalid json'
    );
    await mkdir(path.join(fixtureDir, 'src'), { recursive: true });
    await writeFile(
      path.join(fixtureDir, 'src', 'index.ts'),
      'export const ok = 1;\n'
    );

    const result = await runBiomeCheck(fixtureDir);

    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain('.pnpm-store');
    expect(result.stderr).not.toContain('.pnpm-store');
  });

  it('should keep .pnpm-store out of git status tracked files', async () => {
    const fixtureDir = await makeFixture();

    await mkdir(path.join(fixtureDir, '.pnpm-store'), { recursive: true });
    await writeFile(path.join(fixtureDir, '.pnpm-store', 'state.json'), '{}\n');

    const status = await runGitStatus(fixtureDir);

    expect(status).toContain('!! .pnpm-store/');
    expect(status).not.toContain('?? .pnpm-store/');
    expect(status).not.toContain('A  .pnpm-store/');
  });

  it('should continue reporting real source-file diagnostics outside .pnpm-store', async () => {
    const fixtureDir = await makeFixture();

    await mkdir(path.join(fixtureDir, '.pnpm-store'), { recursive: true });
    await writeFile(
      path.join(fixtureDir, '.pnpm-store', 'state.json'),
      '{ invalid json'
    );
    await mkdir(path.join(fixtureDir, 'src'), { recursive: true });
    await writeFile(
      path.join(fixtureDir, 'src', 'broken.ts'),
      'export const broken = ;\n'
    );

    const result = await runBiomeCheck(fixtureDir);

    expect(result.code).not.toBe(0);
    expect(result.stdout + result.stderr).toContain('src/broken.ts');
    expect(result.stdout + result.stderr).not.toContain('.pnpm-store');
  });
});
