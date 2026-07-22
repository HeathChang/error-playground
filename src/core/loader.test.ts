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

  it('should dynamically import the built-in "runner" experience (M2)', async () => {
    const exp = await resolveExperience('runner');
    expect(isExperience(exp)).toBe(true);
  });

  it('should dynamically import the built-in "iframe" experience (v2)', async () => {
    const exp = await resolveExperience('iframe');
    expect(isExperience(exp)).toBe(true);
  });

  it('should dynamically import the built-in "cube" experience (v2)', async () => {
    const exp = await resolveExperience('cube');
    expect(isExperience(exp)).toBe(true);
  });

  it('should dynamically import the built-in "flappy" experience (v2)', async () => {
    const exp = await resolveExperience('flappy');
    expect(isExperience(exp)).toBe(true);
  });

  it('should dynamically import the built-in "stacker" experience (v2)', async () => {
    const exp = await resolveExperience('stacker');
    expect(isExperience(exp)).toBe(true);
  });

  it('should dynamically import the built-in "orbit" experience (v2)', async () => {
    const exp = await resolveExperience('orbit');
    expect(isExperience(exp)).toBe(true);
  });

  it('should dynamically import the built-in "rhythm" experience (v2)', async () => {
    const exp = await resolveExperience('rhythm');
    expect(isExperience(exp)).toBe(true);
  });

  it('should dynamically import the built-in "gravity" experience (v2)', async () => {
    const exp = await resolveExperience('gravity');
    expect(isExperience(exp)).toBe(true);
  });

  it('should dynamically import the built-in "timing" experience (v2)', async () => {
    const exp = await resolveExperience('timing');
    expect(isExperience(exp)).toBe(true);
  });

  it('should dynamically import the built-in "zigzag" experience (v2)', async () => {
    const exp = await resolveExperience('zigzag');
    expect(isExperience(exp)).toBe(true);
  });

  it('should dynamically import the built-in "rotor" experience (v2)', async () => {
    const exp = await resolveExperience('rotor');
    expect(isExperience(exp)).toBe(true);
  });

  it('should dynamically import the built-in "walljump" experience (v2)', async () => {
    const exp = await resolveExperience('walljump');
    expect(isExperience(exp)).toBe(true);
  });

  it('should dynamically import the built-in "charge" experience (v2)', async () => {
    const exp = await resolveExperience('charge');
    expect(isExperience(exp)).toBe(true);
  });
});

describe('loader — helpers', () => {
  it('hasBuiltin reflects the registry', () => {
    expect(hasBuiltin('noop')).toBe(true);
    expect(hasBuiltin('runner')).toBe(true); // M2 등록됨
    expect(hasBuiltin('iframe')).toBe(true); // v2 등록됨
    expect(hasBuiltin('cube')).toBe(true); // v2 등록됨
    expect(hasBuiltin('flappy')).toBe(true); // v2 등록됨
    expect(hasBuiltin('stacker')).toBe(true); // v2 등록됨
    expect(hasBuiltin('orbit')).toBe(true); // v2 등록됨
    expect(hasBuiltin('rhythm')).toBe(true); // v2 등록됨
    expect(hasBuiltin('gravity')).toBe(true); // v2 등록됨
    expect(hasBuiltin('timing')).toBe(true); // v2 등록됨
    expect(hasBuiltin('zigzag')).toBe(true); // v2 등록됨
    expect(hasBuiltin('rotor')).toBe(true); // v2 등록됨
    expect(hasBuiltin('walljump')).toBe(true); // v2 등록됨
    expect(hasBuiltin('charge')).toBe(true); // v2 등록됨
    expect(hasBuiltin('nope')).toBe(false);
  });

  it('isExperience type guard', () => {
    expect(isExperience(fakeExperience)).toBe(true);
    expect(isExperience({ mount() {} })).toBe(false);
    expect(isExperience(null)).toBe(false);
  });
});
