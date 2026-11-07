export type Corner = 'A' | 'B' | 'C' | 'D';
export type WallKey = 'AB' | 'BC' | 'CD' | 'DA';

export interface Note { id: string; text: string; done: boolean }
export interface MaterialItem { id: string; name: string; quantity: number; unit: string }
export type MaterialCategory = 'ceiling' | 'wall' | 'floor' | 'other';
export type BoardOrientation = 'along' | 'across';

export interface BoardCalculatorSettings {
  category: MaterialCategory;
  useShedMeasurements: boolean;
  surfaceWidth: number;
  surfaceLength: number;
  boardLength: number;
  boardWidth: number;
  recentBoardSizes: { length: number; width: number }[];
  orientation: BoardOrientation;
  compareOrientations: boolean;
  edgeClearanceMm: number;
  jointGapMm: number;
  sawKerfMm: number;
  wastePercent: number;
  pricePerBoard: number;
}

export interface Project {
  id: string;
  name: string;
  walls: Record<WallKey, number>;
  diagonals: { AC: number | null; BD: number | null };
  measuredAngles: Partial<Record<Corner, number>>;
  lockedRightAngle: Corner | null;
  rectangleTarget: { width: number; length: number };
  material: {
    surfaceWidth: number;
    surfaceLength: number;
    boardWidth: number;
    boardLength: number;
    wastePercent: number;
    pricePerBoard: number;
    manualBoardCount: number | null;
    items: MaterialItem[];
  };
  boardCalculator: BoardCalculatorSettings;
  notes: Note[];
  assumptions: string[];
  lastEdited: string;
}

export const DEFAULT_PROJECT: Project = {
  id: 'mit-hjemmeskur',
  name: 'Mit hjemmeskur',
  walls: { AB: 299.4, BC: 494.2, CD: 298.0, DA: 494.2 },
  diagonals: { AC: null, BD: null },
  measuredAngles: {},
  lockedRightAngle: null,
  rectangleTarget: { width: 298.7, length: 494.2 },
  material: {
    surfaceWidth: 0, surfaceLength: 0, boardWidth: 0, boardLength: 0,
    wastePercent: 10, pricePerBoard: 0, manualBoardCount: null,
    items: [
      { id: 'skruer', name: 'Skruer', quantity: 0, unit: 'stk.' },
      { id: 'beslag', name: 'Beslag', quantity: 0, unit: 'stk.' },
      { id: 'lim', name: 'Lim/fugemasse', quantity: 0, unit: 'stk.' },
    ],
  },
  boardCalculator: {
    category: 'ceiling',
    useShedMeasurements: true,
    surfaceWidth: 299.4,
    surfaceLength: 494.2,
    boardLength: 120,
    boardWidth: 60,
    recentBoardSizes: [{ length: 120, width: 60 }],
    orientation: 'along',
    compareOrientations: true,
    edgeClearanceMm: 0,
    jointGapMm: 0,
    sawKerfMm: 3,
    wastePercent: 10,
    pricePerBoard: 0,
  },
  notes: [
    { id: 'note-1', text: 'Husk teleskopstøtten.', done: false },
    { id: 'note-2', text: 'Start langs væg D–A.', done: false },
  ],
  assumptions: [],
  lastEdited: new Date(0).toISOString(),
};
