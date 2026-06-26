import React, { useState } from 'react';
import { Task } from '../types';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Trash2,
  AlertCircle,
  TrendingUp,
  BrainCircuit,
  Zap,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TaskCardProps {
  key?: React.Key;
  task: Task;
  onToggleComplete: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onViewOnMap?: (task: Task) => void;
}

export default function TaskCard({ task, onToggleComplete, onDeleteTask, onViewOnMap }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper: Format relative deadline string
  const getDeadlineStatus = (deadlineStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadlineStr);
    deadlineDate.setHours(0, 0, 0, 0);

    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`, color: 'text-rose-600 font-semibold' };
    }
    if (diffDays === 0) {
      return { text: 'Today', color: 'text-amber-600 font-bold' };
    }
    if (diffDays === 1) {
      return { text: 'Tomorrow', color: 'text-indigo-600 font-medium' };
    }
    if (diffDays <= 7) {
      return { text: `In ${diffDays} days`, color: 'text-slate-600' };
    }
    return { text: deadlineStr, color: 'text-slate-500' };
  };

  const deadlineStatus = getDeadlineStatus(task.deadline);

  // Helper: Get priority styling
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'low':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  // Helper: Get Eisenhower recommendation color details
  const getEisenhowerLabel = (rec?: string) => {
    switch (rec) {
      case 'Urgent & Important':
        return { text: 'Do First', color: 'bg-rose-100/70 text-rose-800 border-rose-200' };
      case 'Important but Not Urgent':
        return { text: 'Schedule', color: 'bg-indigo-100/70 text-indigo-800 border-indigo-200' };
      case 'Urgent but Not Important':
        return { text: 'Delegate', color: 'bg-amber-100/70 text-amber-800 border-amber-200' };
      case 'Not Urgent & Not Important':
        return { text: 'Defer/Eliminate', color: 'bg-slate-100/70 text-slate-800 border-slate-200' };
      default:
        return { text: 'Pending Analysis', color: 'bg-slate-100 text-slate-800' };
    }
  };

  const eisenhowerLabel = getEisenhowerLabel(task.aiAnalysis?.recommendation);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`group overflow-hidden rounded-2xl border transition-all ${
        task.completed
          ? 'border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/30 shadow-none'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          {/* Custom Toggle Checkbox */}
          <button
            onClick={() => onToggleComplete(task.id)}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
              task.completed
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:border-indigo-500 hover:bg-indigo-50/20'
            }`}
          >
            {task.completed && <Check className="h-3.5 w-3.5 stroke-[3]" />}
          </button>

          {/* Core task title/desc content */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Badge */}
              <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-2xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                {task.category}
              </span>

              {/* Priority Badge */}
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-2xs font-semibold ${getPriorityBadge(task.priority)}`}>
                {task.priority.toUpperCase()}
              </span>

              {/* Eisenhower Matrix recommendation badge */}
              {task.aiAnalysis && (
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-2xs font-bold ${eisenhowerLabel.color}`}>
                  <Zap className="mr-0.5 h-2.5 w-2.5" />
                  {eisenhowerLabel.text}
                </span>
              )}
            </div>

            <h4
              onClick={() => setIsExpanded(!isExpanded)}
              className={`mt-1.5 cursor-pointer font-sans text-base font-semibold leading-snug text-slate-900 dark:text-white tracking-tight break-words hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
                task.completed ? 'text-slate-400 dark:text-slate-500 line-through font-normal' : ''
              }`}
            >
              {task.title}
            </h4>

            {task.description && (
              <p className={`mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2 break-words ${task.completed ? 'text-slate-400/80' : ''}`}>
                {task.description}
              </p>
            )}

            {/* Deadline & Expand Actions Row */}
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-y-2 border-t border-slate-100/80 dark:border-slate-800/80 pt-3 text-xs">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                <span className={deadlineStatus.color}>{deadlineStatus.text}</span>
              </div>

              <div className="flex items-center gap-3">
                {/* View on Map button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onViewOnMap) {
                      onViewOnMap(task);
                    }
                  }}
                  className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                  title="View this task location on the map"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>View on Map</span>
                </button>

                {/* Delete button (only visible on hover/focus, or always on mobile) */}
                <button
                  onClick={() => onDeleteTask(task.id)}
                  aria-label="Delete Task"
                  className="rounded-md p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                {/* AI Insights expand button */}
                {task.aiAnalysis && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                    <span>AI Pilot Insights</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable AI Analysis Panel */}
      <AnimatePresence>
        {isExpanded && task.aiAnalysis && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 overflow-hidden"
          >
            <div className="p-4 sm:p-5 border-l-4 border-indigo-500/80 bg-gradient-to-r from-indigo-50/30 dark:from-indigo-950/10 to-transparent">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200 mb-4">
                <BrainCircuit className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                <span className="uppercase tracking-wider">AI Pilot Decision Analysis</span>
              </div>

              {/* Quadrant, Urgency, Importance breakdown */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 p-3 shadow-2xs">
                  <span className="text-2xs font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Matrix Verdict</span>
                  <div className="mt-1 flex items-center gap-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                    <Zap className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>{task.aiAnalysis.recommendation}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 p-3 shadow-2xs">
                  <span className="text-2xs font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Urgency Score</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">{task.aiAnalysis.urgencyScore}/10</span>
                    <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${task.aiAnalysis.urgencyScore * 10}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 p-3 shadow-2xs">
                  <span className="text-2xs font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Importance Score</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">{task.aiAnalysis.importanceScore}/10</span>
                    <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-rose-500"
                        style={{ width: `${task.aiAnalysis.importanceScore * 10}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Starting Step & Strategy */}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/30 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                    <Zap className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>Immediate Micro-Step (Action Plan)</span>
                  </div>
                  <p className="text-xs text-indigo-800 dark:text-indigo-300 font-medium">
                    {task.aiAnalysis.actionPlan}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>Time Management & Target Effort</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    Technique: <span className="font-semibold text-slate-900 dark:text-white">{task.aiAnalysis.timeManagementTechnique}</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Allocated focus: <span className="font-semibold text-slate-800 dark:text-slate-200">{task.aiAnalysis.estimatedHours} hrs</span>
                  </p>
                </div>
              </div>

              {/* Suggestions */}
              <div className="mt-4">
                <h5 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">Tailored Smart Suggestions</h5>
                <ul className="space-y-2">
                  {task.aiAnalysis.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
