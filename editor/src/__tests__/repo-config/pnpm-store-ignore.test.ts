import { describe, expect, it } from 'vitest';
import biomeConfigText from '/@fs/home/node/vizora/biome.json?raw';
import gitignoreText from '/@fs/home/node/vizora/.gitignore?raw';

const gitignoreLines = gitignoreText
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const biomeConfig = JSON.parse(biomeConfigText) as {
  files?: { includes?: string[] };
};

describe('repo config ignores pnpm store artifacts', () => {
  it('should git-ignore a repo-root .pnpm-store directory', () => {
    expect(gitignoreLines).toContain('.pnpm-store');
  });

  it('should exclude .pnpm-store files from Biome scanning', () => {
    // CODER NOTE: This is the regression guard for the CI failure on main.
    // Biome must exclude the repo-local pnpm content-addressable store even if
    // the VCS ignore path is bypassed.
    expect(
      biomeConfig.files?.includes?.some(
        (pattern) => pattern.startsWith('!') && pattern.includes('.pnpm-store')
      )
    ).toBe(true);
  });

  it('should keep Biome source-file globs enabled for project files', () => {
    expect(biomeConfig.files?.includes).toEqual(
      expect.arrayContaining(['**/*.ts', '**/*.tsx', '**/*.json'])
    );
  });
});
