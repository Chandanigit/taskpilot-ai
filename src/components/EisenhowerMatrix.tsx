import React from 'react';
import { Task, EisenhowerCategory } from '../types';
import { motion } from 'motion/react';
import { Check, Flame, Calendar, Share2, EyeOff, Zap } from 'lucide-react';

interface EisenhowerMatrixProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
}

export default function EisenhowerMatrix({ tasks, onToggleComplete }: EisenhowerMatrixProps) {
  const pendingTasks = tasks.filter((t) => !t.completed);

  // Helper: Filter tasks by Eisenhower recommendation
  const getTasksByQuadrant = (quadrant: EisenhowerCategory) => {
    return pendingTasks.filter((t) => t.aiAnalysis?.recommendation === quadrant);
  };

  const quadrantConfigs = [
    {
      id: 'urgent_important' as const,
      category: 'Urgent & Important' as EisenhowerCategory,
      title: 'Do First (Urgent & Important)',
      subtitle: 'Perform immediately. High-stakes deadlines.',
      bgColor: 'bg-rose-50/50',
      borderColor: 'border-rose-200',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      textColor: 'text-rose-900',
      icon: <Flame className="h-4 w-4 text-rose-600" />,
      strategy: 'DO FIRST'
    },
    {
      id: 'important_not_urgent' as const,
      category: 'Important but Not Urgent' as EisenhowerCategory,
      title: 'Schedule (Important, Not Urgent)',
      subtitle: 'Plan dedicated time. Key strategic goals.',
      bgColor: 'bg-indigo-50/40',
      borderColor: 'border-indigo-100',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      textColor: 'text-indigo-900',
      icon: <Calendar className="h-4 w-4 text-indigo-600" />,
      strategy: 'SCHEDULE'
    },
    {
      id: 'urgent_not_important' as const,
      category: 'Urgent but Not Important' as EisenhowerCategory,
      title: 'Delegate (Urgent, Not Important)',
      subtitle: 'Delegate, automate, or batch to save energy.',
      bgColor: 'bg-amber-50/40',
      borderColor: 'border-amber-100',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      textColor: 'text-amber-900',
      icon: <Share2 className="h-4 w-4 text-amber-600" />,
      strategy: 'DELEGATE'
    },
    {
      id: 'not_urgent_not_important' as const,
      category: 'Not Urgent & Not Important' as EisenhowerCategory,
      title: 'Defer/Eliminate (Trivial)',
      subtitle: 'Lowest priority. Delay or drop entirely.',
      bgColor: 'bg-slate-50/50',
      borderColor: 'border-slate-200',
      badgeColor: 'bg-slate-200 text-slate-800 border-slate-300',
      textColor: 'text-slate-900',
      icon: <EyeOff className="h-4 w-4 text-slate-600" />,
      strategy: 'DELAY'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-sans font-bold text-slate-900 tracking-tight text-xl flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-500 shrink-0" />
            <span>Eisenhower Decision Matrix</span>
          </h2>
          <p className="text-xs text-slate-500">AI-analyzed workload distribution across decision priority quadrants</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {quadrantConfigs.map((quad) => {
          const quadTasks = getTasksByQuadrant(quad.category);

          return (
            <motion.div
              key={quad.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className={`rounded-2xl border ${quad.borderColor} ${quad.bgColor} p-5 flex flex-col min-h-[220px] transition-all`}
            >
              {/* Quadrant Title / Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-200/50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-white p-1.5 border border-slate-100 shadow-3xs shrink-0">
                    {quad.icon}
                  </div>
                  <div>
                    <h3 className={`font-sans font-bold text-sm tracking-tight ${quad.textColor}`}>{quad.title}</h3>
                    <p className="text-2xs text-slate-500 mt-0.5 leading-none">{quad.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-3xs font-black tracking-wider bg-slate-900 text-white rounded px-1.5 py-0.5">
                    {quad.strategy}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-2xs font-bold leading-none ${quad.badgeColor}`}>
                    {quadTasks.length}
                  </span>
                </div>
              </div>

              {/* Task list inside Quadrant */}
              <div className="mt-3.5 flex-1 overflow-y-auto max-h-[160px] space-y-2 pr-1">
                {quadTasks.length > 0 ? (
                  quadTasks.map((t) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white/95 p-2.5 shadow-3xs hover:shadow-2xs transition-all"
                    >
                      <button
                        onClick={() => onToggleComplete(t.id)}
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 transition-all"
                      >
                        <Check className="h-3 w-3 stroke-[3] opacity-0 hover:opacity-100 text-indigo-500" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate leading-snug">{t.title}</p>
                        {t.aiAnalysis?.estimatedHours && (
                          <p className="text-3xs text-slate-400 mt-0.5 font-mono">
                            ⏳ Effort: {t.aiAnalysis.estimatedHours} hrs | Priority: {t.priority}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-6 text-center text-slate-400">
                    <Check className="h-6 w-6 text-slate-300 stroke-[1.5] mb-1" />
                    <span className="text-2xs">All clear in this quadrant</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
