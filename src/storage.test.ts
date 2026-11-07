import { beforeEach, describe, expect, it } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { DEFAULT_PROJECT } from './types';
import { exportProjects, getProjects, importProjects, migrateProject, saveProject } from './storage';

beforeEach(async () => {
  await new Promise<void>((resolve) => { const req = indexedDB.deleteDatabase('skurmaal-db'); req.onsuccess = () => resolve(); req.onerror = () => resolve(); });
});

describe('lokale projekter', () => {
  it('gemmer og genindlæser et projekt', async () => { const p = structuredClone(DEFAULT_PROJECT); p.name = 'Testskur'; await saveProject(p); expect((await getProjects())[0].name).toBe('Testskur'); });
  it('eksporterer og importerer projektdata', () => { const json = exportProjects([DEFAULT_PROJECT]); const restored = importProjects(json); expect(restored[0].walls.AB).toBe(299.4); });
  it('migrerer gamle data uden at ændre det gemte D–A-mål', () => {
    const old = structuredClone(DEFAULT_PROJECT) as Partial<typeof DEFAULT_PROJECT>;
    old.walls!.DA = 496.2;
    delete old.boardCalculator;
    const migrated = migrateProject(old as typeof DEFAULT_PROJECT);
    expect(migrated.walls.DA).toBe(496.2);
    expect(migrated.boardCalculator.boardLength).toBe(120);
  });
});
