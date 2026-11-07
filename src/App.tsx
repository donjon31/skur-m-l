import { useEffect, useMemo, useRef, useState } from 'react';
import { oppositeDifferencesMm, rectangleDiagonal, solveGeometry, type Point } from './geometry';
import { DEFAULT_PROJECT, type Corner, type Project, type WallKey } from './types';
import { deleteProject, exportProjects, getProjects, importProjects, saveProject } from './storage';
import { calculateBoardLayout, parseDanishNumber, type BoardLayout } from './boardCalculator';

type View = 'home' | 'measurements' | 'materials' | 'notes' | 'projects';
const wallLabels: Record<WallKey, string> = { AB: 'A–B', BC: 'B–C', CD: 'C–D', DA: 'D–A' };
const corners: Corner[] = ['A', 'B', 'C', 'D'];
const da = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const money = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 });
const format = (value: number) => da.format(value);
const numberValue = parseDanishNumber;
const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

function Badge({ kind }: { kind: 'MÅLT' | 'BEREGNET' | 'ANTAGET' }) {
  return <span className={`badge ${kind.toLowerCase()}`}>{kind}</span>;
}

function NumberInput({ label, value, onChange, unit = 'cm', optional = false }: { label: string; value: number | null; onChange: (value: number | null) => void; unit?: string; optional?: boolean }) {
  return <label className="field">
    <span>{label} {optional && <small>(valgfrit)</small>}</span>
    <span className="input-unit"><input inputMode="decimal" min="0" step="0.1" value={value ?? ''} placeholder={optional ? 'Ikke målt' : '0'} onChange={(event) => {
      if (!event.target.value) return onChange(optional ? null : 0);
      const next = numberValue(event.target.value);
      if (Number.isFinite(next) && next >= 0) onChange(next);
    }} /><b>{unit}</b></span>
  </label>;
}

function Drawing({ project, compact = false }: { project: Project; compact?: boolean }) {
  const geometry = solveGeometry(project);
  const solved = geometry.status === 'solved' && geometry.points;
  let points: Record<Corner, Point> = { A: { x: 34, y: 30 }, B: { x: 266, y: 30 }, C: { x: 266, y: 190 }, D: { x: 34, y: 190 } };
  if (solved) {
    const xs = corners.map((c) => geometry.points![c].x), ys = corners.map((c) => geometry.points![c].y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = Math.min(220 / Math.max(maxX - minX, 1), 145 / Math.max(maxY - minY, 1));
    points = Object.fromEntries(corners.map((c) => [c, { x: 40 + (geometry.points![c].x - minX) * scale, y: 35 + (geometry.points![c].y - minY) * scale }])) as Record<Corner, Point>;
  }
  const midpoint = (a: Corner, b: Corner) => ({ x: (points[a].x + points[b].x) / 2, y: (points[a].y + points[b].y) / 2 });
  return <div className={`drawing ${compact ? 'compact' : ''}`}>
    <div className="drawing-label"><span className={`status-dot ${geometry.status}`} />{solved ? 'Beregnet form · målfast forhold' : 'Skematisk · ikke geometrisk målfast'}</div>
    <svg viewBox="0 0 300 220" role="img" aria-label="Skur set ovenfra med hjørner og vægmål">
      <polygon points={corners.map((c) => `${points[c].x},${points[c].y}`).join(' ')} fill="#ecfeff" stroke="#164e63" strokeWidth="5" strokeLinejoin="round" />
      {project.diagonals.AC && <line x1={points.A.x} y1={points.A.y} x2={points.C.x} y2={points.C.y} className="diagonal" />}
      {project.diagonals.BD && <line x1={points.B.x} y1={points.B.y} x2={points.D.x} y2={points.D.y} className="diagonal" />}
      {([['A','B','AB'],['B','C','BC'],['C','D','CD'],['D','A','DA']] as [Corner, Corner, WallKey][]).map(([a,b,key]) => {
        const mid = midpoint(a,b); return <text key={key} x={mid.x} y={mid.y - 7} className="wall-text">{format(project.walls[key])} cm</text>;
      })}
      {corners.map((c) => <g key={c}><circle cx={points[c].x} cy={points[c].y} r="13" /><text x={points[c].x} y={points[c].y + 5} className="corner-text">{c}</text></g>)}
    </svg>
  </div>;
}

function Home({ project, go }: { project: Project; go: (view: View) => void }) {
  const diff = oppositeDifferencesMm(project.walls);
  const s = project.boardCalculator;
  const layout = calculateBoardLayout({ surfaceWidth: s.useShedMeasurements ? project.walls.AB : s.surfaceWidth, surfaceLength: s.useShedMeasurements ? project.walls.BC : s.surfaceLength, boardWidth: s.boardWidth, boardLength: s.boardLength, orientation: s.orientation, edgeClearanceMm: s.edgeClearanceMm, jointGapMm: s.jointGapMm, sawKerfMm: s.sawKerfMm });
  return <>
    <section className="hero v2"><div><p className="eyebrow">SkurMål</p><h1>{project.name}</h1></div><button className="project-switch" onClick={() => go('projects')}>Skift projekt ▾</button></section>
    <Drawing project={project} compact />
    <div className="measurement-strip">{(Object.keys(project.walls) as WallKey[]).map((key) => <div key={key}><small>{wallLabels[key]}</small><b>{format(project.walls[key])}</b><span>cm</span></div>)}</div>
    <div className="difference compact-warning"><span className="difference-icon">↔</span><div><b>Afvigelser: bredde {format(diff.width)} mm · længde {format(diff.length)} mm</b><small>Det gemte D–A-mål er bevaret. Kontrollér målene fysisk.</small></div></div>
    <section className="quick-result"><div><small>Aktuel loftplade</small><b>{format(s.boardLength)} × {format(s.boardWidth)} cm</b></div><div><small>Estimeret køb</small><strong>{layout.valid ? Math.ceil(layout.purchaseCount * (1 + s.wastePercent / 100)) : '–'} <span>plader</span></strong></div></section>
    <nav className="action-grid three" aria-label="Projektfunktioner">
      <button onClick={() => go('measurements')}><span>⌑</span><b>Mål og vinkler</b><small>4 vægge · beregn form</small></button>
      <button className="primary-action" onClick={() => go('materials')}><span>▤</span><b>Materialeberegner</b><small>Loftplader · layout · pris</small></button>
      <button onClick={() => go('notes')}><span>✓</span><b>Huskeseddel</b><small>{project.notes.filter((n) => !n.done).length} åbne punkter</small></button>
    </nav>
    {project.notes.filter((n) => !n.done).slice(0, 2).map((note) => <button className="home-note" key={note.id} onClick={() => go('notes')}><span>○</span>{note.text}</button>)}
    <p className="safety">Vigtige mål skal altid kontrolleres fysisk, før du skærer eller monterer materialer.</p>
  </>;
}

function Measurements({ project, update }: { project: Project; update: (fn: (p: Project) => void) => void }) {
  const [showReference, setShowReference] = useState(false);
  const geometry = useMemo(() => solveGeometry(project), [project]);
  const diff = oppositeDifferencesMm(project.walls);
  const targetDiagonal = rectangleDiagonal(project.rectangleTarget.width, project.rectangleTarget.length);
  return <>
    <header className="section-head"><div><p className="eyebrow">Bygningens grundplan</p><h2>Mål og vinkler</h2></div><Badge kind={geometry.status === 'solved' ? 'BEREGNET' : 'MÅLT'} /></header>
    <Drawing project={project} />
    <section className="card"><h3>Vægmål <Badge kind="MÅLT" /></h3><div className="field-grid">
      {(Object.keys(project.walls) as WallKey[]).map((key) => <NumberInput key={key} label={`Væg ${wallLabels[key]}`} value={project.walls[key]} onChange={(value) => update((p) => { p.walls[key] = value ?? 0; })} />)}
    </div><p className="inline-info">Forskel modstående vægge: <b>{format(diff.width)} mm</b> i bredden · <b>{format(diff.length)} mm</b> i længden</p></section>
    <section className="card"><h3>Krydsmål <Badge kind="MÅLT" /></h3><div className="field-grid">
      <NumberInput label="Diagonal A–C" value={project.diagonals.AC} optional onChange={(value) => update((p) => { p.diagonals.AC = value; })} />
      <NumberInput label="Diagonal B–D" value={project.diagonals.BD} optional onChange={(value) => update((p) => { p.diagonals.BD = value; })} />
    </div><p className="hint">Ét gyldigt krydsmål deler formen i to trekanter og er nok til at beregne en entydig, konveks form.</p></section>
    <section className="card"><h3>Vinkler og 90°-lås</h3><div className="angle-lock"><span>Lås tilsigtet hjørne til 90°</span><div className="segment">{corners.map((corner) => <button key={corner} className={project.lockedRightAngle === corner ? 'active' : ''} onClick={() => update((p) => { p.lockedRightAngle = p.lockedRightAngle === corner ? null : corner; })}>{corner}</button>)}</div></div>
      <details><summary>Indtast en fysisk målt vinkel</summary><div className="field-grid angle-fields">{corners.map((corner) => <NumberInput key={corner} label={`Hjørne ${corner}`} unit="°" optional value={project.measuredAngles[corner] ?? null} onChange={(value) => update((p) => { if (value === null) delete p.measuredAngles[corner]; else p.measuredAngles[corner] = value; })} />)}</div></details>
    </section>
    <section className={`result ${geometry.status}`}><div className="result-title"><b>{geometry.status === 'solved' ? 'Formen kan beregnes' : geometry.status === 'invalid' ? 'Målene passer ikke sammen' : 'Der mangler et mål'}</b>{geometry.status === 'solved' && <Badge kind="BEREGNET" />}</div><p>{geometry.message}</p>
      {geometry.calculatedDiagonal && <p><b>Beregnet {geometry.calculatedDiagonal.key}:</b> {format(geometry.calculatedDiagonal.value)} cm ud fra {geometry.calculatedDiagonal.source}.</p>}
      {geometry.angles && <div className="angle-results">{corners.map((c) => <div key={c}><small>{c}</small><strong>{format(geometry.angles![c])}°</strong></div>)}</div>}
    </section>
    <button className="secondary full" onClick={() => setShowReference((value) => !value)}>{showReference ? 'Skjul retvinklet reference' : 'Vis mål for et retvinklet skur'}</button>
    {showReference && <section className="card reference"><h3>Retvinklet reference <Badge kind="ANTAGET" /></h3><p>Dette er et byggemål – ikke den målte form. Vælg selv målets bredde og længde, fordi de modstående vægge ikke er ens.</p><div className="field-grid"><NumberInput label="Målbredde" value={project.rectangleTarget.width} onChange={(value) => update((p) => { p.rectangleTarget.width = value ?? 0; })} /><NumberInput label="Mållængde" value={project.rectangleTarget.length} onChange={(value) => update((p) => { p.rectangleTarget.length = value ?? 0; })} /></div>{targetDiagonal && <div className="big-number"><small>Teoretisk krydsmål</small><strong>{format(targetDiagonal)} cm</strong><span>Begge diagonaler skal være dette mål.</span></div>}</section>}
  </>;
}

function BoardLayoutDrawing({ layout, selectedId, onSelect }: { layout: BoardLayout; selectedId: number | null; onSelect: (id: number) => void }) {
  if (!layout.valid) return <div className="layout-empty">Indtast gyldige mål for at se pladelayoutet.</div>;
  const scale = Math.min(520 / layout.usableWidth, 300 / layout.usableLength);
  const selected = layout.pieces.find((p) => p.id === selectedId);
  return <div className="layout-wrap"><div className="layout-legend"><span className="full-key">Hel plade</span><span className="cut-key">Skæres</span><span className="reuse-key">Afskær genbrugt</span></div>
    <svg className="board-layout" viewBox={`-28 -28 ${layout.usableWidth * scale + 56} ${layout.usableLength * scale + 56}`} role="img" aria-label="Pladelayout set ovenfra">
      <rect x="0" y="0" width={layout.usableWidth * scale} height={layout.usableLength * scale} className="ceiling-outline" />
      {layout.pieces.map((piece) => <rect key={piece.id} x={(piece.x - (layout.pieces[0]?.x ?? 0)) * scale} y={(piece.y - (layout.pieces[0]?.y ?? 0)) * scale} width={piece.width * scale} height={piece.height * scale} className={`${piece.full ? 'full-board' : piece.reused ? 'reuse-board' : 'cut-board'} ${selectedId === piece.id ? 'selected-board' : ''}`} onClick={() => onSelect(piece.id)} />)}
      <text x={layout.usableWidth * scale / 2} y="-9" className="dimension-label">{format(layout.usableWidth)} cm</text>
      <text x="-12" y={layout.usableLength * scale / 2} className="dimension-label vertical-label">{format(layout.usableLength)} cm</text>
    </svg>
    {selected && <div className="piece-detail"><span>Valgt felt #{selected.id + 1}</span><b>{format(selected.height)} × {format(selected.width)} cm</b><small>{selected.full ? 'Hel plade' : selected.reused ? `Skæres af genbrugt afskær fra plade ${selected.boardNumber}` : `Skæres fra plade ${selected.boardNumber}`}</small></div>}
  </div>;
}

function Materials({ project, update }: { project: Project; update: (fn: (p: Project) => void) => void }) {
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const s = project.boardCalculator;
  const width = s.useShedMeasurements ? project.walls.AB : s.surfaceWidth;
  const length = s.useShedMeasurements ? project.walls.BC : s.surfaceLength;
  const makeLayout = (orientation: 'along' | 'across') => calculateBoardLayout({ surfaceWidth: width, surfaceLength: length, boardWidth: s.boardWidth, boardLength: s.boardLength, orientation, edgeClearanceMm: s.edgeClearanceMm, jointGapMm: s.jointGapMm, sawKerfMm: s.sawKerfMm });
  const along = makeLayout('along'), across = makeLayout('across');
  const layout = s.orientation === 'along' ? along : across;
  const purchaseWithWaste = layout.valid ? Math.ceil(layout.purchaseCount * (1 + s.wastePercent / 100)) : 0;
  const other = s.orientation === 'along' ? across : along;
  const categories = [{ key: 'ceiling', label: 'Loftplader', icon: '▤' }, { key: 'wall', label: 'Vægplader', icon: '▥' }, { key: 'floor', label: 'Gulvplader', icon: '▦' }, { key: 'other', label: 'Andet', icon: '+' }] as const;
  return <><header className="section-head material-head"><div><p className="eyebrow">Materialeberegner</p><h2>Hvad skal du bruge?</h2></div></header>
    <div className="category-row">{categories.map((category) => <button key={category.key} className={s.category === category.key ? 'active' : ''} onClick={() => update((p) => { p.boardCalculator.category = category.key; })}><span>{category.icon}</span>{category.label}</button>)}</div>
    {s.category !== 'ceiling' ? <section className="coming"><b>{categories.find((c) => c.key === s.category)?.label}</b><p>Denne V2-etape gør loftplader færdige først. Vælg Loftplader for den komplette beregner.</p></section> : <>
      <section className="calculator-title"><div><p className="eyebrow">Trin 1–4</p><h2>Beregn loftplader</h2></div><Badge kind="BEREGNET" /></section>
      <section className="compact-card"><div className="step-heading"><span>1</span><div><b>Loftets mål</b><small>Vælg målgrundlag</small></div></div><div className="choice-row"><button className={s.useShedMeasurements ? 'active' : ''} onClick={() => update((p) => { p.boardCalculator.useShedMeasurements = true; })}>Brug skurets mål</button><button className={!s.useShedMeasurements ? 'active' : ''} onClick={() => update((p) => { p.boardCalculator.useShedMeasurements = false; })}>Indtast egne mål</button></div>
        {s.useShedMeasurements ? <div className="loaded-measure"><b>{format(width)} × {format(length)} cm</b><span>A–B × B–C</span><small><Badge kind="ANTAGET" /> Rektangulær planreference. D–A er gemt som {format(project.walls.DA)} cm og ændres ikke.</small></div> : <div className="field-grid compact-fields"><NumberInput label="Bredde" value={s.surfaceWidth} onChange={(v) => update((p) => { p.boardCalculator.surfaceWidth = v ?? 0; })} /><NumberInput label="Længde" value={s.surfaceLength} onChange={(v) => update((p) => { p.boardCalculator.surfaceLength = v ?? 0; })} /></div>}
      </section>
      <section className="compact-card"><div className="step-heading"><span>2</span><div><b>Pladens mål</b><small>Længde × bredde</small></div></div><div className="field-grid compact-fields"><NumberInput label="Pladelængde" value={s.boardLength} onChange={(v) => update((p) => { p.boardCalculator.boardLength = v ?? 0; })} /><NumberInput label="Pladebredde" value={s.boardWidth} onChange={(v) => update((p) => { p.boardCalculator.boardWidth = v ?? 0; })} /></div><div className="recent-sizes"><span>Senest brugt:</span>{s.recentBoardSizes.map((size, index) => <button key={index} onClick={() => update((p) => { p.boardCalculator.boardLength = size.length; p.boardCalculator.boardWidth = size.width; })}>{format(size.length)} × {format(size.width)}</button>)}<button onClick={() => update((p) => { const next = { length: p.boardCalculator.boardLength, width: p.boardCalculator.boardWidth }; p.boardCalculator.recentBoardSizes = [next, ...p.boardCalculator.recentBoardSizes.filter((x) => x.length !== next.length || x.width !== next.width)].slice(0, 3); })}>+ Gem</button></div></section>
      <section className="compact-card"><div className="step-heading"><span>3</span><div><b>Læggeretning</b><small>Sammenlign begge</small></div></div><div className="orientation-grid"><button className={s.orientation === 'along' ? 'active' : ''} onClick={() => { update((p) => { p.boardCalculator.orientation = 'along'; }); setSelectedPiece(null); }}><span>↕</span><b>Langs loftet</b><small>{along.valid ? `${along.purchaseCount} plader før reserve` : '–'}</small></button><button className={s.orientation === 'across' ? 'active' : ''} onClick={() => { update((p) => { p.boardCalculator.orientation = 'across'; }); setSelectedPiece(null); }}><span>↔</span><b>På tværs</b><small>{across.valid ? `${across.purchaseCount} plader før reserve` : '–'}</small></button></div>{layout.valid && other.valid && <p className="best-direction">{layout.purchaseCount < other.purchaseCount ? '✓ Den valgte retning bruger færrest hele plader i dette estimat.' : layout.purchaseCount > other.purchaseCount ? 'Den anden retning bruger færre hele plader.' : 'Begge retninger kræver samme antal hele plader i estimatet.'}</p>}</section>
      <section className="calculation-result"><div className="result-main"><small>Estimeret køb inkl. {format(s.wastePercent)} % reserve</small><strong>{purchaseWithWaste}</strong><b>loftplader</b></div><div className="result-stats"><div><small>Loftareal</small><b>{format(layout.surfaceArea)} m²</b></div><div><small>Pladeareal</small><b>{format(layout.boardArea)} m²</b></div><div><small>Teoretisk minimum</small><b>{layout.theoreticalMinimum} stk.</b></div><div><small>Felter i layout</small><b>{layout.positions} stk.</b></div><div><small>Skøn før reserve</small><b>{layout.purchaseCount} stk.</b></div><div><small>Pris i alt</small><b>{money.format(purchaseWithWaste * s.pricePerBoard)}</b></div></div><p>Minimum efter areal er ikke en skæreplan. Købsskønnet bruger et deterministisk, konservativt afskærsregnskab.</p></section>
      <section className="compact-card layout-card"><div className="step-heading"><span>4</span><div><b>Pladelayout</b><small>Tryk på et felt for skæremål</small></div></div><BoardLayoutDrawing layout={layout} selectedId={selectedPiece} onSelect={setSelectedPiece} /></section>
      <details className="advanced"><summary>Avanceret: fuge, kant, savsnit og pris</summary><div className="field-grid compact-fields"><NumberInput label="Fuge mellem plader" value={s.jointGapMm} unit="mm" onChange={(v) => update((p) => { p.boardCalculator.jointGapMm = v ?? 0; })} /><NumberInput label="Kantafstand" value={s.edgeClearanceMm} unit="mm" onChange={(v) => update((p) => { p.boardCalculator.edgeClearanceMm = v ?? 0; })} /><NumberInput label="Savsnit" value={s.sawKerfMm} unit="mm" onChange={(v) => update((p) => { p.boardCalculator.sawKerfMm = v ?? 0; })} /><NumberInput label="Ekstra reserve" value={s.wastePercent} unit="%" onChange={(v) => update((p) => { p.boardCalculator.wastePercent = v ?? 0; })} /><NumberInput label="Pris pr. plade" value={s.pricePerBoard} unit="kr." onChange={(v) => update((p) => { p.boardCalculator.pricePerBoard = v ?? 0; })} /></div></details>
      <p className="safety">Layoutet gælder en rektangulær planreference. Kontrollér produktets fugekrav, mål og skæreretning før køb og tilskæring.</p>
    </>}
  </>;
}

function Notes({ project, update }: { project: Project; update: (fn: (p: Project) => void) => void }) {
  const [text, setText] = useState('');
  const add = () => { if (!text.trim()) return; update((p) => { p.notes.unshift({ id: uid(), text: text.trim(), done: false }); }); setText(''); };
  return <><header className="section-head"><div><p className="eyebrow">På byggepladsen</p><h2>Huskeseddel</h2></div><span className="count">{project.notes.filter((n) => !n.done).length}</span></header>
    <div className="add-note"><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Skriv et nyt punkt…" /><button onClick={add}>Tilføj</button></div>
    <div className="notes-list">{project.notes.map((note) => <div className={`note ${note.done ? 'done' : ''}`} key={note.id}><button className="check" aria-label={note.done ? 'Markér som ikke færdig' : 'Markér som færdig'} onClick={() => update((p) => { p.notes.find((n) => n.id === note.id)!.done = !note.done; })}>{note.done ? '✓' : ''}</button><input value={note.text} aria-label="Notetekst" onChange={(e) => update((p) => { p.notes.find((n) => n.id === note.id)!.text = e.target.value; })} /><button className="icon-button danger" aria-label="Slet punkt" onClick={() => update((p) => { p.notes = p.notes.filter((n) => n.id !== note.id); })}>×</button></div>)}</div>
    {!project.notes.length && <div className="empty">Huskesedlen er tom.</div>}
  </>;
}

function Projects({ projects, current, select, create, remove, onImport }: { projects: Project[]; current: Project; select: (p: Project) => void; create: () => void; remove: (p: Project) => void; onImport: (files: FileList | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const backup = () => { const url = URL.createObjectURL(new Blob([exportProjects(projects)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `skurmaal-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); };
  return <><header className="section-head"><div><p className="eyebrow">På denne enhed</p><h2>Gemte projekter</h2></div><span className="count">{projects.length}</span></header>
    <div className="project-list">{projects.map((project) => <button className={`project-card ${project.id === current.id ? 'active' : ''}`} key={project.id} onClick={() => select(project)}><span><b>{project.name}</b><small>Ændret {new Date(project.lastEdited).toLocaleString('da-DK', { dateStyle: 'medium', timeStyle: 'short' })}</small></span>{project.id === current.id ? <i>Aktivt</i> : <i>Åbn</i>}</button>)}</div>
    <button className="primary full" onClick={create}>+ Nyt projekt</button>
    {projects.length > 1 && <button className="text-danger full" onClick={() => remove(current)}>Slet det aktive projekt</button>}
    <section className="card backup"><h3>Sikkerhedskopi</h3><p>Eksportér en JSON-fil, hvis du vil skifte telefon eller rydde browserdata.</p><div className="button-row"><button className="secondary" onClick={backup}>Eksportér backup</button><button className="secondary" onClick={() => fileRef.current?.click()}>Importér backup</button></div><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files)} /><p className="hint">Rydning af browserdata kan slette lokalt gemte projekter.</p></section>
  </>;
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [view, setView] = useState<View>('home');
  const [toast, setToast] = useState('');
  useEffect(() => { getProjects().then((items) => { setProjects(items); setProject(items[0]); }).catch(() => setToast('Kunne ikke åbne lokal lagring.')); }, []);
  useEffect(() => {
    if (!project) return;
    const timeout = window.setTimeout(() => saveProject(project).then(() => setProjects((list) => [project, ...list.filter((p) => p.id !== project.id)])).catch(() => setToast('Projektet kunne ikke gemmes.')), 250);
    return () => clearTimeout(timeout);
  }, [project]);
  const update = (fn: (draft: Project) => void) => setProject((current) => { if (!current) return current; const draft = structuredClone(current); fn(draft); draft.lastEdited = new Date().toISOString(); return draft; });
  const go = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const create = () => { const next = structuredClone(DEFAULT_PROJECT); next.id = uid(); next.name = `Nyt skur ${projects.length + 1}`; next.notes = []; next.lastEdited = new Date().toISOString(); setProject(next); setProjects((p) => [next, ...p]); setView('home'); };
  const remove = async (target: Project) => { if (!confirm(`Slet “${target.name}”?`)) return; await deleteProject(target.id); const next = projects.filter((p) => p.id !== target.id); setProjects(next); setProject(next[0]); setView('projects'); };
  const handleImport = async (files: FileList | null) => { if (!files?.[0]) return; try { const imported = importProjects(await files[0].text()); for (const item of imported) await saveProject(item); const all = await getProjects(); setProjects(all); setProject(all[0]); setToast(`${imported.length} projekt(er) importeret.`); } catch (error) { setToast(error instanceof Error ? error.message : 'Importen mislykkedes.'); } };
  if (!project) return <main className="app loading">Åbner dit skurprojekt…</main>;
  return <div className="app-shell"><header className="topbar"><button className="brand" onClick={() => go('home')} aria-label="Gå til forsiden"><span>⌂</span> SkurMål</button>{view !== 'home' && <button className="back" onClick={() => go('home')}>← Oversigt</button>}</header><main className="app">
    {view === 'home' && <Home project={project} go={go} />}
    {view === 'measurements' && <Measurements project={project} update={update} />}
    {view === 'materials' && <Materials project={project} update={update} />}
    {view === 'notes' && <Notes project={project} update={update} />}
    {view === 'projects' && <Projects projects={projects} current={project} select={(p) => { setProject(p); setView('home'); }} create={create} remove={remove} onImport={handleImport} />}
  </main>{toast && <button className="toast" onClick={() => setToast('')}>{toast}</button>}</div>;
}
