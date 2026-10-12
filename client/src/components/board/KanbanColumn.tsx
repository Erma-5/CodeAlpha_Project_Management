import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, Task } from '../../types';
import TaskCard from './TaskCard';

interface Props {
  column: Column;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string) => void;
}

export default function KanbanColumn({ column, tasks, onTaskClick, onAddTask }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: 'column', column } });

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: column.color }} />
        <h3 className="font-semibold text-sm text-gray-700">{column.name}</h3>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 space-y-2 min-h-[200px] transition-colors ${
          isOver ? 'bg-primary-50 border-2 border-primary-200 border-dashed' : 'bg-gray-100/60'
        }`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-gray-400">
            Drop tasks here
          </div>
        )}
      </div>

      {/* Add task button */}
      <button
        onClick={() => onAddTask(column.id)}
        className="mt-2 w-full py-2 text-sm text-gray-500 hover:text-primary-600 hover:bg-primary-50
                   rounded-lg transition-colors flex items-center justify-center gap-1"
      >
        <span className="text-lg leading-none">+</span> Add task
      </button>
    </div>
  );
}
