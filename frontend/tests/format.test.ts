import { describe, it, expect } from 'vitest';
import { formatPhoneInput, statusLabel, priorityColor } from '../src/utils/format';

describe('utils/format', () => {
  it('formats phone to +digits', () => {
    expect(formatPhoneInput('1 (202) 555-1212')).toBe('+12025551212');
    expect(formatPhoneInput('')).toBe('');
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
