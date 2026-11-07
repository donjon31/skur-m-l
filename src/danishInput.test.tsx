import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NumberInput } from './App';

describe('danske målefelter', () => {
  it('viser decimaler med komma', () => {
    render(<NumberInput label="Væg A–B" value={299.4} onChange={() => undefined} />);
    expect(screen.getByLabelText(/Væg A–B/)).toHaveProperty('value', '299,4');
  });

  it('accepterer et dansk kommatal', () => {
    const onChange = vi.fn();
    render(<NumberInput label="Væg D–A" value={494.2} onChange={onChange} />);
    const input = screen.getByLabelText(/Væg D–A/);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '496,2' } });
    expect(onChange).toHaveBeenLastCalledWith(496.2);
    expect(input).toHaveProperty('value', '496,2');
  });

  it('omdanner punktum til dansk komma', () => {
    const onChange = vi.fn();
    render(<NumberInput label="Pladebredde" value={60} onChange={onChange} />);
    const input = screen.getByLabelText(/Pladebredde/);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '60.5' } });
    expect(onChange).toHaveBeenLastCalledWith(60.5);
    expect(input).toHaveProperty('value', '60,5');
  });
});
