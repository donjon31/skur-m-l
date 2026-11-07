import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('mobil layout', () => {
  it('har mobil viewport og responsive regler', () => {
    expect(readFileSync('index.html', 'utf8')).toContain('width=device-width');
    expect(readFileSync('src/styles.css', 'utf8')).toContain('@media (max-width: 390px)');
  });
});
