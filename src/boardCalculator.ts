import type { BoardOrientation } from './types';

export interface BoardPiece {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  full: boolean;
  reused: boolean;
  boardNumber: number;
}

export interface BoardLayoutInput {
  surfaceWidth: number;
  surfaceLength: number;
  boardWidth: number;
  boardLength: number;
  orientation: BoardOrientation;
  edgeClearanceMm?: number;
  jointGapMm?: number;
  sawKerfMm?: number;
}

export interface BoardLayout {
  valid: boolean;
  message?: string;
  usableWidth: number;
  usableLength: number;
  placedBoardWidth: number;
  placedBoardLength: number;
  columns: number;
  rows: number;
  positions: number;
  fullPieces: number;
  cutPieces: number;
  pieces: BoardPiece[];
  purchaseCount: number;
  reusedPieces: number;
  theoreticalMinimum: number;
  surfaceArea: number;
  boardArea: number;
}

interface Offcut { width: number; height: number; boardNumber: number }
const round = (n: number) => Math.round(n * 10000) / 10000;

export function parseDanishNumber(value: string): number {
  return Number(value.trim().replace(',', '.'));
}

function allocatePieces(dimensions: { width: number; height: number; id: number }[], stockWidth: number, stockHeight: number, kerf: number) {
  const offcuts: Offcut[] = [];
  let boards = 0;
  let reused = 0;
  const allocated = new Map<number, { boardNumber: number; reused: boolean }>();
  const ordered = [...dimensions].sort((a, b) => b.width * b.height - a.width * a.height || b.height - a.height);

  for (const piece of ordered) {
    let index = offcuts.findIndex((offcut) => piece.width <= offcut.width + 1e-7 && piece.height <= offcut.height + 1e-7);
    let source: Offcut;
    let isReuse = index >= 0;
    if (isReuse) {
      source = offcuts.splice(index, 1)[0];
      reused++;
    } else {
      boards++;
      source = { width: stockWidth, height: stockHeight, boardNumber: boards };
    }
    allocated.set(piece.id, { boardNumber: source.boardNumber, reused: isReuse });
    const rightWidth = round(source.width - piece.width - kerf);
    const bottomHeight = round(source.height - piece.height - kerf);
    if (rightWidth > 0.05 && piece.height > 0.05) offcuts.push({ width: rightWidth, height: piece.height, boardNumber: source.boardNumber });
    if (bottomHeight > 0.05 && source.width > 0.05) offcuts.push({ width: source.width, height: bottomHeight, boardNumber: source.boardNumber });
    offcuts.sort((a, b) => a.width * a.height - b.width * b.height);
  }
  return { boards, reused, allocated };
}

export function calculateBoardLayout(input: BoardLayoutInput): BoardLayout {
  const empty: BoardLayout = { valid: false, usableWidth: 0, usableLength: 0, placedBoardWidth: 0, placedBoardLength: 0, columns: 0, rows: 0, positions: 0, fullPieces: 0, cutPieces: 0, pieces: [], purchaseCount: 0, reusedPieces: 0, theoreticalMinimum: 0, surfaceArea: 0, boardArea: 0 };
  const values = [input.surfaceWidth, input.surfaceLength, input.boardWidth, input.boardLength];
  if (values.some((v) => !Number.isFinite(v) || v <= 0)) return { ...empty, message: 'Indtast positive mål for loft og plade.' };
  const clearance = Math.max(0, input.edgeClearanceMm ?? 0) / 10;
  const gap = Math.max(0, input.jointGapMm ?? 0) / 10;
  const kerf = Math.max(0, input.sawKerfMm ?? 0) / 10;
  const usableWidth = input.surfaceWidth - clearance * 2;
  const usableLength = input.surfaceLength - clearance * 2;
  if (usableWidth <= 0 || usableLength <= 0) return { ...empty, message: 'Kantafstanden er større end den tilgængelige flade.' };

  const placedBoardWidth = input.orientation === 'along' ? input.boardWidth : input.boardLength;
  const placedBoardLength = input.orientation === 'along' ? input.boardLength : input.boardWidth;
  const columns = Math.ceil((usableWidth + gap) / (placedBoardWidth + gap));
  const rows = Math.ceil((usableLength + gap) / (placedBoardLength + gap));
  const raw: { id: number; x: number; y: number; width: number; height: number }[] = [];
  let id = 0;
  for (let row = 0; row < rows; row++) {
    const y = row * (placedBoardLength + gap);
    const height = Math.min(placedBoardLength, usableLength - y);
    if (height <= 0) continue;
    for (let column = 0; column < columns; column++) {
      const x = column * (placedBoardWidth + gap);
      const width = Math.min(placedBoardWidth, usableWidth - x);
      if (width > 0) raw.push({ id: id++, x: x + clearance, y: y + clearance, width, height });
    }
  }
  const stockWidth = placedBoardWidth;
  const stockHeight = placedBoardLength;
  const allocation = allocatePieces(raw.map(({ id, width, height }) => ({ id, width, height })), stockWidth, stockHeight, kerf);
  const pieces = raw.map((piece) => ({ ...piece, full: Math.abs(piece.width - stockWidth) < 1e-7 && Math.abs(piece.height - stockHeight) < 1e-7, ...allocation.allocated.get(piece.id)! }));
  const surfaceArea = input.surfaceWidth * input.surfaceLength / 10000;
  const boardArea = input.boardWidth * input.boardLength / 10000;
  return {
    valid: true, usableWidth, usableLength, placedBoardWidth, placedBoardLength, columns, rows,
    positions: pieces.length,
    fullPieces: pieces.filter((p) => p.full).length,
    cutPieces: pieces.filter((p) => !p.full).length,
    pieces,
    purchaseCount: allocation.boards,
    reusedPieces: allocation.reused,
    theoreticalMinimum: Math.ceil(surfaceArea / boardArea),
    surfaceArea, boardArea,
  };
}
