import { describe, expect, it } from 'vitest';
import { DEFAULT_PROJECT } from './types';
import { oppositeDifferencesMm, rectangleDiagonal, solveGeometry } from './geometry';

const project = () => structuredClone(DEFAULT_PROJECT);

describe('grundmål', () => {
  it('indlæser de fire leverede vægmål', () => expect(project().walls).toEqual({ AB: 299.4, BC: 494.2, CD: 298, DA: 494.2 }));
  it('finder forskellen på 1,4 cm / 14 mm', () => expect(oppositeDifferencesMm(project().walls).width).toBeCloseTo(14));
});

describe('geometri', () => {
  it('forklarer at en diagonal mangler', () => expect(solveGeometry(project()).status).toBe('schematic'));
  it('beregner Pythagoras for et retvinklet mål', () => expect(rectangleDiagonal(300, 400)).toBe(500));
  it('afviser et umuligt krydsmål', () => { const p = project(); p.diagonals.AC = 900; expect(solveGeometry(p).status).toBe('invalid'); });
  it('viser utilstrækkelig information uden diagonal eller vinkellås', () => expect(solveGeometry(project()).message).toContain('mangler et krydsmål'));
  it('beregner alle vinkler når en kompatibel 90-graders vinkel låses', () => { const p = project(); p.lockedRightAngle = 'A'; const r = solveGeometry(p); expect(r.status).toBe('solved'); expect(r.angles?.A).toBeCloseTo(90, 5); expect(Object.values(r.angles!).reduce((a,b) => a+b, 0)).toBeCloseTo(360, 5); });
  it('beregner en form fra et tilstrækkeligt krydsmål', () => { const p = project(); p.diagonals.AC = 577; const r = solveGeometry(p); expect(r.status).toBe('solved'); expect(r.angles).toBeDefined(); });
});
