import { describe, expect, it } from 'vitest';
import { calculateBoardLayout, parseDanishNumber } from './boardCalculator';

const base = { surfaceWidth: 299.4, surfaceLength: 494.2, boardWidth: 60, boardLength: 120, orientation: 'along' as const, sawKerfMm: 3 };

describe('loftpladeberegner', () => {
  it('beregner pladeareal', () => expect(calculateBoardLayout(base).boardArea).toBeCloseTo(0.72));
  it('beregner loftareal', () => expect(calculateBoardLayout(base).surfaceArea).toBeCloseTo(14.796348));
  it('runder det teoretiske arealminimum op til 21', () => expect(calculateBoardLayout(base).theoreticalMinimum).toBe(21));
  it('beregner 25 felter langs loftet', () => { const r = calculateBoardLayout(base); expect(r.columns).toBe(5); expect(r.rows).toBe(5); expect(r.positions).toBe(25); });
  it('beregner 27 felter på tværs', () => { const r = calculateBoardLayout({ ...base, orientation: 'across' }); expect(r.columns).toBe(3); expect(r.rows).toBe(9); expect(r.positions).toBe(27); });
  it('finder hele plader og reelle kantstykker', () => { const r = calculateBoardLayout(base); expect(r.fullPieces).toBe(16); expect(r.cutPieces).toBe(9); expect(r.pieces.some((p) => p.width < r.placedBoardWidth)).toBe(true); expect(r.pieces.some((p) => p.height < r.placedBoardLength)).toBe(true); });
  it('genbruger kun stykker der kan være på en rå plade', () => { const r = calculateBoardLayout(base); expect(r.reusedPieces).toBeGreaterThan(0); for (const p of r.pieces.filter((x) => x.reused)) { expect(p.width).toBeLessThanOrEqual(r.placedBoardWidth); expect(p.height).toBeLessThanOrEqual(r.placedBoardLength); } });
  it('medregner savsnit konservativt', () => { const noKerf = calculateBoardLayout({ ...base, sawKerfMm: 0 }); const kerf = calculateBoardLayout({ ...base, sawKerfMm: 3 }); expect(kerf.purchaseCount).toBeGreaterThanOrEqual(noKerf.purchaseCount); });
  it('bevarer 496,2 cm som alternativ længde', () => { const r = calculateBoardLayout({ ...base, surfaceLength: 496.2 }); expect(r.usableLength).toBe(496.2); });
  it('forstår dansk decimalkomma', () => expect(parseDanishNumber('496,2')).toBe(496.2));
  it('afviser ugyldige mål', () => expect(calculateBoardLayout({ ...base, boardWidth: 0 }).valid).toBe(false));
});
