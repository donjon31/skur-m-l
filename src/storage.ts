import { DEFAULT_PROJECT, type Project } from './types';

const DB_NAME = 'skurmaal-db';
const STORE = 'projects';

function cloneDefault(): Project {
  return { ...structuredClone(DEFAULT_PROJECT), lastEdited: new Date().toISOString() };
}

export function migrateProject(project: Project): Project {
  const migrated = structuredClone(project);
  if (!migrated.boardCalculator) migrated.boardCalculator = structuredClone(DEFAULT_PROJECT.boardCalculator);
  else migrated.boardCalculator = { ...structuredClone(DEFAULT_PROJECT.boardCalculator), ...migrated.boardCalculator };
  if (!Array.isArray(migrated.boardCalculator.recentBoardSizes)) migrated.boardCalculator.recentBoardSizes = [{ length: migrated.boardCalculator.boardLength, width: migrated.boardCalculator.boardWidth }];
  return migrated;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProject(project: Project): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(project);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getProjects(): Promise<Project[]> {
  const db = await openDb();
  const projects = await new Promise<Project[]>((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  if (projects.length) {
    const migrated = projects.map(migrateProject).sort((a, b) => b.lastEdited.localeCompare(a.lastEdited));
    await Promise.all(migrated.map(saveProject));
    return migrated;
  }
  const initial = cloneDefault();
  await saveProject(initial);
  return [initial];
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export function exportProjects(projects: Project[]): string {
  return JSON.stringify({ app: 'SkurMål', version: 1, exportedAt: new Date().toISOString(), projects }, null, 2);
}

export function importProjects(json: string): Project[] {
  const parsed: unknown = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { projects?: unknown }).projects)) throw new Error('Filen indeholder ikke en gyldig SkurMål-sikkerhedskopi.');
  const projects = (parsed as { projects: Project[] }).projects;
  for (const project of projects) {
    if (!project.id || !project.name || !project.walls || ['AB', 'BC', 'CD', 'DA'].some((key) => !(project.walls[key as keyof typeof project.walls] > 0))) {
      throw new Error('Et projekt i filen mangler gyldige grundmål.');
    }
  }
  return projects.map(migrateProject);
}
