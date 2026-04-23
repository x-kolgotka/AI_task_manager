import { describe, it, expect } from 'vitest';
import { formatPhoneInput, getPhoneError, priorityColor, statusLabel } from '../src/utils/format';

describe('utils/format', () => {
  it('keeps an optional leading plus and strips all other symbols from phone input', () => {
    expect(formatPhoneInput('+1 (202) 555-1212')).toBe('+12025551212');
    expect(formatPhoneInput('1+202abc555')).toBe('1202555');
    expect(formatPhoneInput('++49 30')).toBe('+4930');
    expect(formatPhoneInput('')).toBe('');
  });

  it('validates phone format before submit', () => {
    expect(getPhoneError('+12025551212')).toBeNull();
    expect(getPhoneError('12025551212')).toBeNull();
    expect(getPhoneError('+')).toBe('Некорректный формат номера');
    expect(getPhoneError('12+34')).toBe('Некорректный формат номера');
    expect(getPhoneError('12 34')).toBe('Некорректный формат номера');
  });

  it('maps status labels', () => {
    expect(statusLabel('TODO')).toBe('To Do');
    expect(statusLabel('IN_PROGRESS')).toBe('In Progress');
    expect(statusLabel('DONE')).toBe('Done');
  });

  it('priorityColor classes differ by priority', () => {
    expect(priorityColor('HIGH')).toContain('red');
    expect(priorityColor('MEDIUM')).toContain('yellow');
    expect(priorityColor('LOW')).toContain('green');
  });
});
