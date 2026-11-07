import type { Corner, Project, WallKey } from './types';

export interface Point { x: number; y: number }
export interface GeometryResult {
  status: 'schematic' | 'solved' | 'invalid';
  message: string;
  points?: Record<Corner, Point>;
  angles?: Record<Corner, number>;
  calculatedDiagonal?: { key: 'AC' | 'BD'; value: number; source: string };
  discrepancyMm?: number;
}

const EPS = 1e-8;
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const validTriangle = (a: number, b: number, c: number) => a > 0 && b > 0 && c > 0 && a + b > c + EPS && a + c > b + EPS && b + c > a + EPS;

function trianglePoint(base: number, fromLeft: number, fromRight: number, sign: 1 | -1): Point | null {
  if (!validTriangle(base, fromLeft, fromRight)) return null;
  const x = (fromLeft ** 2 + base ** 2 - fromRight ** 2) / (2 * base);
  const y2 = fromLeft ** 2 - x ** 2;
  if (y2 < -EPS) return null;
  return { x, y: sign * Math.sqrt(Math.max(0, y2)) };
}

function angle(prev: Point, at: Point, next: Point): number {
  const ux = prev.x - at.x, uy = prev.y - at.y;
  const vx = next.x - at.x, vy = next.y - at.y;
  const cosine = Math.min(1, Math.max(-1, (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy))));
  return Math.acos(cosine) * 180 / Math.PI;
}

function resultFromPoints(points: Record<Corner, Point>, calculatedDiagonal?: GeometryResult['calculatedDiagonal']): GeometryResult {
  const angles = {
    A: angle(points.D, points.A, points.B),
    B: angle(points.A, points.B, points.C),
    C: angle(points.B, points.C, points.D),
    D: angle(points.C, points.D, points.A),
  };
  const sum = Object.values(angles).reduce((a, b) => a + b, 0);
  if (!Number.isFinite(sum) || Math.abs(sum - 360) > 0.01) return { status: 'invalid', message: 'Målene kan ikke danne en gyldig, konveks firkant.' };
  return { status: 'solved', message: 'Formen er beregnet ud fra målte længder.', points, angles, calculatedDiagonal };
}

function solveWithAC(w: Project['walls'], ac: number): GeometryResult {
  const B = trianglePoint(ac, w.AB, w.BC, 1);
  const D = trianglePoint(ac, w.DA, w.CD, -1);
  if (!B || !D) return { status: 'invalid', message: 'Krydsmålet A–C kan ikke danne trekanter med de indtastede vægge.' };
  return resultFromPoints({ A: { x: 0, y: 0 }, B, C: { x: ac, y: 0 }, D });
}

function solveWithBD(w: Project['walls'], bd: number): GeometryResult {
  const A = trianglePoint(bd, w.AB, w.DA, 1);
  const C = trianglePoint(bd, w.BC, w.CD, -1);
  if (!A || !C) return { status: 'invalid', message: 'Krydsmålet B–D kan ikke danne trekanter med de indtastede vægge.' };
  return resultFromPoints({ A, B: { x: 0, y: 0 }, C, D: { x: bd, y: 0 } });
}

const adjacentForCorner: Record<Corner, [WallKey, WallKey, 'AC' | 'BD']> = {
  A: ['AB', 'DA', 'BD'], B: ['AB', 'BC', 'AC'], C: ['BC', 'CD', 'BD'], D: ['CD', 'DA', 'AC'],
};

export function solveGeometry(project: Project, toleranceCm = 0.2): GeometryResult {
  const values = Object.values(project.walls);
  if (values.some((v) => !Number.isFinite(v) || v <= 0)) return { status: 'invalid', message: 'Alle fire vægge skal have et positivt mål.' };

  let ac = project.diagonals.AC;
  let bd = project.diagonals.BD;
  let calculated: GeometryResult['calculatedDiagonal'];
  if (!ac && !bd) {
    const corner = project.lockedRightAngle;
    const enteredAngle = corner ? 90 : (Object.keys(project.measuredAngles) as Corner[])[0];
    const measuredCorner = corner ?? ((Object.keys(project.measuredAngles) as Corner[])[0] || null);
    if (!measuredCorner || !enteredAngle) return { status: 'schematic', message: 'Der mangler et krydsmål eller en ekstra vinkel for at beregne rummets præcise form.' };
    const [w1, w2, diagonal] = adjacentForCorner[measuredCorner];
    const degrees = corner ? 90 : project.measuredAngles[measuredCorner]!;
    if (!(degrees > 0 && degrees < 180)) return { status: 'invalid', message: 'Vinklen skal være større end 0° og mindre end 180°.' };
    const value = Math.sqrt(project.walls[w1] ** 2 + project.walls[w2] ** 2 - 2 * project.walls[w1] * project.walls[w2] * Math.cos(degrees * Math.PI / 180));
    calculated = { key: diagonal, value, source: `${degrees.toFixed(1)}° ved hjørne ${measuredCorner}` };
    if (diagonal === 'AC') ac = value; else bd = value;
  }

  let result = ac ? solveWithAC(project.walls, ac) : solveWithBD(project.walls, bd!);
  if (result.status !== 'solved') return result;
  result.calculatedDiagonal = calculated;

  if (ac && bd) {
    const computed = dist(result.points!.B, result.points!.D);
    const discrepancy = Math.abs(computed - bd);
    if (discrepancy > toleranceCm) return { status: 'invalid', message: `De to krydsmål passer ikke sammen. Afvigelsen er ${(discrepancy * 10).toFixed(1)} mm.`, discrepancyMm: discrepancy * 10 };
    result.discrepancyMm = discrepancy * 10;
  }

  for (const [corner, measured] of Object.entries(project.measuredAngles) as [Corner, number][]) {
    if (measured && Math.abs(result.angles![corner] - measured) > 0.2) return { status: 'invalid', message: `Den målte vinkel ved ${corner} passer ikke med længderne (afvigelse ${Math.abs(result.angles![corner] - measured).toFixed(1)}°).` };
  }
  return result;
}

export function rectangleDiagonal(width: number, length: number): number | null {
  return width > 0 && length > 0 && Number.isFinite(width) && Number.isFinite(length) ? Math.hypot(width, length) : null;
}

export function oppositeDifferencesMm(w: Project['walls']) {
  return { width: Math.abs(w.AB - w.CD) * 10, length: Math.abs(w.BC - w.DA) * 10 };
}
