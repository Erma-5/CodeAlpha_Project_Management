import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { DashboardData } from '../types';

const PRIORITY_DOT: Record<string, string> = {
  LOW: 'bg-gray-400', MEDIUM: 'bg-blue-500', HIGH: 'bg-orange-500', URGENT: 'bg-red-500',
};

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date());
  const navigate = useNavigate();

  const { data } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
  });

  const allTasks = [...(data?.myTasks ?? []), ...(data?.upcomingDeadlines ?? [])];
  const uniqueTasks = allTasks.filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i);

  const days = eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) });
  const startPad = startOfMonth(current).getDay();

  const tasksOnDay = (day: Date) =>
    uniqueTasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500 text-sm mt-1">Tasks with due dates</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrent(subMonths(current, 1))} className="btn-secondary px-3">←</button>
          <span className="text-sm font-semibold text-gray-900 w-32 text-center">
            {format(current, 'MMMM yyyy')}
          </span>
          <button onClick={() => setCurrent(addMonths(current, 1))} className="btn-secondary px-3">→</button>
          <button onClick={() => setCurrent(new Date())} className="btn-secondary text-sm">Today</button>
        </div>
      </div>

      <div className="card p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-xs font-semibold text-gray-400 text-center py-2">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Padding for first day */}
          {[...Array(startPad)].map((_, i) => <div key={`pad-${i}`} />)}

          {days.map(day => {
            const tasks = tasksOnDay(day);
            const today = isToday(day);
            return (
              <div key={day.toISOString()}
                className={`min-h-[80px] rounded-lg p-1.5 border transition-colors ${
                  today ? 'border-primary-300 bg-primary-50' : 'border-transparent hover:bg-gray-50'
                }`}>
                <p className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  today ? 'bg-primary-600 text-white' : 'text-gray-700'
                }`}>
                  {format(day, 'd')}
                </p>
                <div className="space-y-0.5">
                  {tasks.slice(0, 3).map(task => (
                    <div key={task.id}
                      onClick={() => navigate(`/projects/${task.projectId}`)}
                      className="flex items-center gap-1 cursor-pointer group">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
                      <p className="text-[10px] text-gray-700 truncate group-hover:text-primary-600 leading-tight">{task.title}</p>
                    </div>
                  ))}
                  {tasks.length > 3 && (
                    <p className="text-[10px] text-gray-400">+{tasks.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
