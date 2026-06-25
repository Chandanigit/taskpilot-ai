import React from 'react';
import { Task } from '../types';
import { CheckCircle2, Clock, BarChart3, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardStatsProps {
  tasks: Task[];
}

export default function DashboardStats({ tasks }: DashboardStatsProps) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate total pending hours
  const pendingHours = tasks
    .filter((t) => !t.completed && t.aiAnalysis?.estimatedHours)
    .reduce((sum, t) => sum + (t.aiAnalysis?.estimatedHours || 0), 0);

  // Calculate high priority count
  const highPriorityCount = tasks.filter((t) => !t.completed && t.priority === 'high').length;

  // Calculate an AI Proactivity Score (how much they focus on 'Important but Not Urgent' vs others)
  // Higher weight for completing "Important but Not Urgent" which shows planning, or doing "Urgent & Important"
  const getProactivityScore = () => {
    if (totalTasks === 0) return 100;
    const completedList = tasks.filter((t) => t.completed);
    if (completedList.length === 0) return 50;

    let points = 0;
    completedList.forEach((t) => {
      const rec = t.aiAnalysis?.recommendation;
      if (rec === 'Important but Not Urgent') {
        points += 100; // Peak productivity behavior (Scheduling & preparing)
      } else if (rec === 'Urgent & Important') {
        points += 80; // Necessary do-now behavior
      } else if (rec === 'Urgent but Not Important') {
        points += 40; // Reactive behavior
      } else {
        points += 20; // Busywork / trivial tasks
      }
    });

    return Math.min(100, Math.max(0, Math.round(points / completedList.length)));
  };

  const proactivityScore = getProactivityScore();

  // Get score description and rating
  const getProactivityLabel = (score: number) => {
    if (score >= 85) return { text: 'Strategic Visionary', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50' };
    if (score >= 65) return { text: 'Balanced Achiever', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50' };
    if (score >= 45) return { text: 'Reactive Doer', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50' };
    return { text: 'Firefighter Mode', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50' };
  };

  const proactivityLabel = getProactivityLabel(proactivityScore);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {/* Task Completion Rate Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Completion Rate</p>
            <h3 className="mt-1 font-mono text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{completionRate}%</h3>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700/55">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-2 rounded-full bg-emerald-500"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex justify-between">
            <span>{completedTasks} completed</span>
            <span>{pendingTasks} pending</span>
          </p>
        </div>
      </motion.div>

      {/* Workload Effort Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Estimated Effort</p>
            <h3 className="mt-1 font-mono text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {pendingHours.toFixed(1)} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">hrs</span>
            </h3>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700/55">
            <Clock className="h-5 w-5 text-indigo-500" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <TrendingUp className="h-4 w-4 text-indigo-500" />
          <span>Across all pending tasks</span>
        </div>
      </motion.div>

      {/* Focus Stress Level (High Priority Tasks) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Critical Load</p>
            <h3 className="mt-1 font-mono text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {highPriorityCount} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">tasks</span>
            </h3>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700/55">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1.5">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-2xs font-semibold ${
              highPriorityCount > 3
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50'
            }`}
          >
            {highPriorityCount > 3 ? 'Overloaded' : 'Healthy Focus'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">High priority pending</span>
        </div>
      </motion.div>

      {/* AI Proactivity Score */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> AI Strategy Index
            </p>
            <h3 className="mt-1 font-mono text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{proactivityScore}/100</h3>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700/55">
            <BarChart3 className="h-5 w-5 text-amber-500" />
          </div>
        </div>
        <div className="mt-4">
          <span className={`inline-flex rounded-md border px-2 py-0.5 text-2xs font-bold ${proactivityLabel.color}`}>
            {proactivityLabel.text}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
