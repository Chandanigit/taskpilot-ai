import React, { useState } from 'react';
import { Priority, Category, Task, AIAnalysis, UserType } from '../types';
import { Plus, Sparkles, Loader2, Calendar, AlertCircle, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AddTaskFormProps {
  onAddTask: (task: Task) => void;
  userType: UserType;
}

export default function AddTaskForm({ onAddTask, userType }: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('Work');
  const [deadline, setDeadline] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fallback Analyzer: parses details locally if API is unavailable or fails
  const getFallbackAnalysis = (
    title: string,
    desc: string,
    priority: Priority,
    deadlineStr: string,
    category: Category,
    role: UserType
  ): AIAnalysis => {
    const today = new Date();
    const taskDate = new Date(deadlineStr);
    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Urgency Calculation (1 to 10)
    let urgencyScore = 5;
    if (diffDays <= 0) urgencyScore = 10; // Overdue or today
    else if (diffDays === 1) urgencyScore = 9;
    else if (diffDays <= 3) urgencyScore = 8;
    else if (diffDays <= 7) urgencyScore = 6;
    else urgencyScore = Math.max(1, 10 - diffDays);

    // Importance Calculation (1 to 10)
    let importanceScore = 5;
    if (priority === 'high') importanceScore = 8;
    if (priority === 'low') importanceScore = 3;

    // Boost based on keywords
    const textToCheck = `${title.toLowerCase()} ${desc.toLowerCase()}`;
    if (textToCheck.includes('exam') || textToCheck.includes('launch') || textToCheck.includes('client') || textToCheck.includes('interview') || textToCheck.includes('deadline')) {
      importanceScore = Math.min(10, importanceScore + 2);
    }
    if (textToCheck.includes('review') || textToCheck.includes('read') || textToCheck.includes('check') || textToCheck.includes('browse')) {
      importanceScore = Math.max(1, importanceScore - 1);
    }

    // Determine Quadrant
    let recommendation: 'Urgent & Important' | 'Important but Not Urgent' | 'Urgent but Not Important' | 'Not Urgent & Not Important';
    if (urgencyScore >= 7 && importanceScore >= 6) {
      recommendation = 'Urgent & Important';
    } else if (urgencyScore < 7 && importanceScore >= 6) {
      recommendation = 'Important but Not Urgent';
    } else if (urgencyScore >= 7 && importanceScore < 6) {
      recommendation = 'Urgent but Not Important';
    } else {
      recommendation = 'Not Urgent & Not Important';
    }

    // Role customized suggestions
    let suggestions: string[] = [];
    let startingStep = '';
    let technique = '';
    let estimatedHours = 1;

    if (role === 'student') {
      suggestions = [
        'Break your revision blocks into 45-minute sessions followed by a 15-minute restorative review.',
        'Eliminate digital distractions by using a website blocker during study hours.',
        'Review syllabus rubric guidelines before submitting or putting final edits.'
      ];
      startingStep = 'Create a mind map or write down the 3 core concepts required for this study task.';
      technique = 'Pomodoro (45m study / 15m review)';
      estimatedHours = priority === 'high' ? 4 : 2;
    } else if (role === 'entrepreneur') {
      suggestions = [
        'Outline the high-leverage business objective that this task unlocks first.',
        'Apply the 80/20 rule: focus on the core value and draft a minimal viable output first.',
        'Timebox this activity strictly to protect space for core client relations and sales strategy.'
      ];
      startingStep = 'Draft a 3-bullet-point summary of what absolute success for this task looks like.';
      technique = 'Strict Time Boxing';
      estimatedHours = priority === 'high' ? 3 : 1.5;
    } else {
      // professional or general
      suggestions = [
        'Schedule a dedicated focus block on your outlook/calendar to prevent meetings overlapping.',
        'Notify key stakeholders or team members if dependencies are impacted by this task completion.',
        'Draft a skeleton outline before diving into deep writing or layout work.'
      ];
      startingStep = 'Open the required software, file, or document and spend exactly 5 minutes drafting the outline.';
      technique = 'Eat the Frog (Do first thing in the morning)';
      estimatedHours = priority === 'high' ? 2.5 : 1;
    }

    return {
      urgencyScore,
      importanceScore,
      recommendation,
      suggestions,
      actionPlan: startingStep,
      timeManagementTechnique: technique,
      estimatedHours
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsAnalyzing(true);
    setErrorMsg(null);

    const currentDateStr = new Date().toISOString().split('T')[0];

    try {
      const response = await fetch('/api/analyze-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          priority,
          deadline,
          category,
          userType,
          currentDate: currentDateStr,
        }),
      });

      if (!response.ok) {
        throw new Error('API server returned an error.');
      }

      const aiAnalysis: AIAnalysis = await response.json();

      const newTask: Task = {
        id: crypto.randomUUID(),
        title: title.trim(),
        description: description.trim(),
        priority,
        deadline,
        category,
        completed: false,
        createdAt: new Date().toISOString(),
        aiAnalysis,
      };

      onAddTask(newTask);
      setTitle('');
      setDescription('');
    } catch (err: any) {
      console.warn('AI Analysis failed, applying local fallback analysis rules.', err);
      // Run the client-side fallback so user is NEVER blocked
      const fallbackAnalysis = getFallbackAnalysis(title, description, priority, deadline, category, userType);

      const newTask: Task = {
        id: crypto.randomUUID(),
        title: title.trim(),
        description: description.trim(),
        priority,
        deadline,
        category,
        completed: false,
        createdAt: new Date().toISOString(),
        aiAnalysis: fallbackAnalysis,
      };

      onAddTask(newTask);
      setTitle('');
      setDescription('');
      
      // Let user know fallback happened (without breaking layout or popping ugly alerts)
      setErrorMsg('AI API was busy. A fast offline-precision task calculation has been applied!');
      setTimeout(() => setErrorMsg(null), 6000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/40 p-1.5 text-indigo-600 dark:text-indigo-400">
          <Plus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-sans font-bold text-slate-900 dark:text-white tracking-tight text-lg">Add New Task</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Pilot your tasks with instant AI indexing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="task-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Task Title *
          </label>
          <input
            id="task-title"
            type="text"
            required
            placeholder="e.g., Finalize marketing proposal"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isAnalyzing}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="task-desc" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Description
          </label>
          <textarea
            id="task-desc"
            rows={3}
            placeholder="Outline main items, requirements, or links..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isAnalyzing}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* Priority & Category side-by-side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="task-priority" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Priority
            </label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              disabled={isAnalyzing}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-colors"
            >
              <option value="high" className="dark:bg-slate-900">🔴 High</option>
              <option value="medium" className="dark:bg-slate-900">🟡 Medium</option>
              <option value="low" className="dark:bg-slate-900">🟢 Low</option>
            </select>
          </div>

          <div>
            <label htmlFor="task-category" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              id="task-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              disabled={isAnalyzing}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-colors"
            >
              <option value="Work" className="dark:bg-slate-900">💼 Work</option>
              <option value="Personal" className="dark:bg-slate-900">🏠 Personal</option>
              <option value="Education" className="dark:bg-slate-900">🎓 Education</option>
              <option value="Health" className="dark:bg-slate-900">🌱 Health</option>
              <option value="Finance" className="dark:bg-slate-900">💰 Finance</option>
              <option value="Other" className="dark:bg-slate-900">🏷️ Other</option>
            </select>
          </div>
        </div>

        {/* Deadline Date */}
        <div>
          <label htmlFor="task-deadline" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Deadline Date
          </label>
          <div className="relative">
            <input
              id="task-deadline"
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={isAnalyzing}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-colors"
            />
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Submit button with loader */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isAnalyzing || !title.trim()}
            className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:from-indigo-500 hover:to-violet-500 focus:outline-none disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all"
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-200" />
                <span>AI is analyzing task details...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-200" />
                <span>Analyze & Add with TaskPilot AI</span>
              </span>
            )}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-3 text-xs text-amber-800 dark:text-amber-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
