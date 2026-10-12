import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../types';
import { format, isPast, isToday } from 'date-fns';

interface Props {
  task: Task;
  onClick: () => void;
}

const PRIORITY_STYLES: Record<string, string> = {
  LOW:    'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH:   'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export default function TaskCard({ task, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const tags: string[] = task.tags ? JSON.parse(task.tags) : [];
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);
  const isDueToday = dueDate && isToday(dueDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 cursor-pointer
                 hover:shadow-md hover:border-primary-200 transition-all group select-none"
    >
      {/* Priority + tags */}
      <div className="flex flex-wrap gap-1 mb-2">
        <span className={`badge text-[10px] ${PRIORITY_STYLES[task.priority]}`}>
          {task.priority}
        </span>
        {tags.map(tag => (
          <span key={tag} className="badge bg-purple-100 text-purple-700 text-[10px]">{tag}</span>
        ))}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">{task.title}</p>

      {/* Due date */}
      {dueDate && (
        <div className={`flex items-center gap-1 text-xs mb-2 ${
          isOverdue ? 'text-red-600' : isDueToday ? 'text-orange-600' : 'text-gray-400'
        }`}>
          <span>{isOverdue ? '⚠️' : '📅'}</span>
          <span>{format(dueDate, 'MMM d')}</span>
        </div>
      )}

      {/* Footer: assignee + comments */}
      <div className="flex items-center justify-between mt-2">
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 font-semibold text-[10px]">
              {task.assignee.name[0].toUpperCase()}
            </div>
            <span className="text-xs text-gray-400 truncate max-w-[80px]">{task.assignee.name.split(' ')[0]}</span>
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-gray-100 border border-dashed border-gray-300" />
        )}

        {(task._count?.comments ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>💬</span>
            <span>{task._count!.comments}</span>
          </div>
        )}
      </div>
    </div>
  );
}
