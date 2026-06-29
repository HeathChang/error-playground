import { describe, expect, it } from 'vitest';
import { hasBuiltin, isExperience, resolveExperience } from './loader';
import type { Experience } from './types';

const fakeExperience: Experience = {
  mount() {},
  unmount() {},
};

describe('loader — resolveExperience', () => {
  it('should return an injected experience object as-is', async () => {
    await expect(resolveExperience(fakeExperience)).resolves.toBe(fakeExperience);
  });

  it('should reject an object that violates the Experience contract', async () => {
    await expect(resolveExperience({} as unknown as Experience)).rejects.toThrow(/계약/);
  });

  it('should reject an unknown built-in name', async () => {
    await expect(resolveExperience('does-not-exist')).rejects.toThrow(/알 수 없는/);
  });

  it('should dynamically import the built-in "noop" experience', async () => {
    const exp = await resolveExperience('noop');
    expect(isExperience(exp)).toBe(true);
  });
});

describe('loader — helpers', () => {
  it('hasBuiltin reflects the registry', () => {
    expect(hasBuiltin('noop')).toBe(true);
    expect(hasBuiltin('runner')).toBe(false); // M2
  });

  it('isExperience type guard', () => {
    expect(isExperience(fakeExperience)).toBe(true);
    expect(isExperience({ mount() {} })).toBe(false);
    expect(isExperience(null)).toBe(false);
  });
});
