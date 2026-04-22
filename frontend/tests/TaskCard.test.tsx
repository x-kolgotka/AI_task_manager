import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskCard from '../src/components/TaskCard';
import { Task } from '../src/types';

const baseTask: Task = {
  id: '1',
  title: 'Write docs',
  description: 'Readme',
  status: 'TODO',
  priority: 'HIGH',
  dueDate: '2026-04-30T00:00:00.000Z',
  tags: [],
  position: 0,
  createdAt: '',
  updatedAt: '',
  subtasks: [
    { id: 's1', taskId: '1', title: 'a', completed: true, estimateHours: null, position: 0 },
    { id: 's2', taskId: '1', title: 'b', completed: false, estimateHours: null, position: 1 },
  ],
};

describe('TaskCard', () => {
  it('renders title and priority badge', () => {
    render(<TaskCard task={baseTask} />);
    expect(screen.getByText('Write docs')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('shows subtask progress', () => {
    render(<TaskCard task={baseTask} />);
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('calls onClick', async () => {
    const fn = vi.fn();
    render(<TaskCard task={baseTask} onClick={fn} />);
    await userEvent.click(screen.getByRole('button'));
    expect(fn).toHaveBeenCalled();
  });
});
