import React, { useState, useEffect } from 'react';
import { Task, Priority, Category, UserType } from './types';
import { INITIAL_TASKS } from './mockData';
import DashboardStats from './components/DashboardStats';
import AddTaskForm from './components/AddTaskForm';
import TaskCard from './components/TaskCard';
import TaskMap from './components/TaskMap';
import EisenhowerMatrix from './components/EisenhowerMatrix';
import AIChatAssistant from './components/AIChatAssistant';
import {
  Sparkles,
  Search,
  Filter,
  Trash2,
  ListTodo,
  Grid2X2,
  MessageSquare,
  Bot,
  Briefcase,
  GraduationCap,
  Hammer,
  HelpCircle,
  LayoutDashboard,
  TrendingUp,
  CheckCircle2,
  Clock,
  Zap,
  Activity,
  ShieldAlert,
  ArrowUpRight,
  Sun,
  Moon,
  Bell,
  Award,
  BookOpen,
  Rocket,
  Clock3,
  AlertTriangle,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Retrieve initial state from LocalStorage
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const savedTasks = localStorage.getItem('taskpilot_tasks');
      if (savedTasks) {
        return JSON.parse(savedTasks);
      }
    } catch (e) {
      console.error('Failed to parse tasks from localStorage', e);
    }
    return INITIAL_TASKS;
  });

  const [userType, setUserType] = useState<UserType>(() => {
    const savedType = localStorage.getItem('taskpilot_usertype');
    return (savedType as UserType) || 'general';
  });

  // Navigation and Workspace state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matrix' | 'coach'>('dashboard');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | Category>('all');

  // Sorting state
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'createdAt'>(() => {
    return (localStorage.getItem('taskpilot_sortby') as any) || 'deadline';
  });

  // Dark Mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('taskpilot_dark');
    return saved === 'true';
  });

  // Focused Task state for GIS Map interaction
  const [focusedTask, setFocusedTask] = useState<Task | null>(null);

  // Role specific tracking items
  const [studentAssignments, setStudentAssignments] = useState(() => {
    const saved = localStorage.getItem('taskpilot_student_assignments');
    return saved ? JSON.parse(saved) : [
      { id: 'sa-1', title: 'CS 101 Midterm Prep', course: 'Computer Science', hours: 4, completed: false },
      { id: 'sa-2', title: 'Calculus Problem Set 3', course: 'Mathematics', hours: 2, completed: false },
      { id: 'sa-3', title: 'History Term Paper Outline', course: 'History', hours: 3, completed: true }
    ];
  });

  const [professionalMeetings, setProfessionalMeetings] = useState(() => {
    const saved = localStorage.getItem('taskpilot_professional_meetings');
    return saved ? JSON.parse(saved) : [
      { id: 'pm-1', title: 'Q2 Sprint Planning Meeting', time: '10:00 AM', room: 'Virtual Room A', checked: false },
      { id: 'pm-2', title: 'Product Demo to Stakeholders', time: '2:30 PM', room: 'Virtual Room B', checked: false }
    ];
  });

  const [entrepreneurGoals, setEntrepreneurGoals] = useState(() => {
    const saved = localStorage.getItem('taskpilot_entrepreneur_goals');
    return saved ? JSON.parse(saved) : [
      { id: 'eg-1', title: 'Complete Pitch Deck V1', milestone: 'Funding Round', targetDate: '2026-06-30', completed: false },
      { id: 'eg-2', title: 'Launch MVP Landing Page', milestone: 'Beta Release', targetDate: '2026-07-15', completed: false },
      { id: 'eg-3', title: 'Draft Founder Agreement', milestone: 'Governance', targetDate: '2026-06-28', completed: true }
    ];
  });

  // Persistence hooks
  useEffect(() => {
    localStorage.setItem('taskpilot_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('taskpilot_usertype', userType);
  }, [userType]);

  useEffect(() => {
    localStorage.setItem('taskpilot_sortby', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('taskpilot_dark', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('taskpilot_student_assignments', JSON.stringify(studentAssignments));
  }, [studentAssignments]);

  useEffect(() => {
    localStorage.setItem('taskpilot_professional_meetings', JSON.stringify(professionalMeetings));
  }, [professionalMeetings]);

  useEffect(() => {
    localStorage.setItem('taskpilot_entrepreneur_goals', JSON.stringify(entrepreneurGoals));
  }, [entrepreneurGoals]);

  // Task Handlers
  const handleAddTask = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleToggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updatedStatus = !t.completed;
          return {
            ...t,
            completed: updatedStatus,
            completedAt: updatedStatus ? new Date().toISOString() : undefined,
          };
        }
        return t;
      })
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleClearCompleted = () => {
    setTasks((prev) => prev.filter((t) => !t.completed));
  };

  // Filter and Search logic
  const filteredTasks = tasks.filter((t) => {
    // Status Filter
    if (taskStatusFilter === 'pending' && t.completed) return false;
    if (taskStatusFilter === 'completed' && !t.completed) return false;

    // Priority Filter
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

    // Category Filter
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

    // Search Query (Match Title or Description)
    const matchesQuery =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesQuery;
  });

  // Sorting logic
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'deadline') {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    if (sortBy === 'priority') {
      const weight = { high: 3, medium: 2, low: 1 };
      return weight[b.priority] - weight[a.priority];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Overdue, due today, due tomorrow alerts for Deadline Reminder system
  const getDeadlineAlerts = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const overdue = tasks.filter(t => !t.completed && t.deadline < todayStr);
    const dueToday = tasks.filter(t => !t.completed && t.deadline === todayStr);
    const dueTomorrow = tasks.filter(t => !t.completed && t.deadline === tomorrowStr);

    return { overdue, dueToday, dueTomorrow };
  };

  const deadlineAlerts = getDeadlineAlerts();

  // Preset role details
  const getRoleHeader = (role: UserType) => {
    switch (role) {
      case 'professional':
        return {
          title: 'Professional Hub',
          icon: <Briefcase className="h-4 w-4" />,
          desc: 'Optimized for project delivery, stakeholder management, and focus scheduling.'
        };
      case 'student':
        return {
          title: 'Academic Desk',
          icon: <GraduationCap className="h-4 w-4" />,
          desc: 'Optimized for active recall, exam schedules, and coursework reviews.'
        };
      case 'entrepreneur':
        return {
          title: 'Founder Suite',
          icon: <Hammer className="h-4 w-4" />,
          desc: 'Optimized for leverage planning, rapid MVPs, and strict time boxes.'
        };
      default:
        return {
          title: 'Standard Pilot',
          icon: <Bot className="h-4 w-4" />,
          desc: 'Balanced everyday productivity and stress index calculations.'
        };
    }
  };

  const currentRole = getRoleHeader(userType);

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

  const getProactivityScore = () => {
    if (totalTasks === 0) return 100;
    const completedList = tasks.filter((t) => t.completed);
    if (completedList.length === 0) return 50;

    let points = 0;
    completedList.forEach((t) => {
      const rec = t.aiAnalysis?.recommendation;
      if (rec === 'Important but Not Urgent') {
        points += 100;
      } else if (rec === 'Urgent & Important') {
        points += 80;
      } else if (rec === 'Urgent but Not Important') {
        points += 40;
      } else {
        points += 20;
      }
    });

    return Math.min(100, Math.max(0, Math.round(points / completedList.length)));
  };

  const proactivityScore = getProactivityScore();

  const getProactivityLabel = (score: number) => {
    if (score >= 85) return { text: 'Strategic Visionary', color: 'text-emerald-400' };
    if (score >= 65) return { text: 'Balanced Achiever', color: 'text-indigo-300' };
    if (score >= 45) return { text: 'Reactive Doer', color: 'text-amber-400' };
    return { text: 'Firefighter Mode', color: 'text-rose-400' };
  };

  const proactivityLabel = getProactivityLabel(proactivityScore);

  const getCategoryPercentages = () => {
    const activeTasks = tasks.filter(t => !t.completed);
    if (activeTasks.length === 0) {
      return [
        { name: 'Work', percentage: 45, color: 'bg-indigo-500' },
        { name: 'Personal', percentage: 30, color: 'bg-rose-500' },
        { name: 'Education', percentage: 25, color: 'bg-amber-500' }
      ];
    }
    
    const counts: Record<Category, number> = {
      Work: 0,
      Personal: 0,
      Education: 0,
      Health: 0,
      Finance: 0,
      Other: 0
    };
    
    activeTasks.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    
    const totalActive = activeTasks.length;
    
    const colors: Record<Category, string> = {
      Work: 'bg-indigo-500',
      Personal: 'bg-rose-500',
      Education: 'bg-amber-500',
      Health: 'bg-emerald-500',
      Finance: 'bg-sky-500',
      Other: 'bg-slate-400'
    };

    return (Object.keys(counts) as Category[])
      .map(cat => ({
        name: cat,
        percentage: Math.round((counts[cat] / totalActive) * 100),
        color: colors[cat]
      }))
      .filter(item => item.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage);
  };

  const getNextCriticalTask = () => {
    const pendingHigh = tasks.filter(t => !t.completed && t.priority === 'high');
    if (pendingHigh.length > 0) {
      return pendingHigh.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];
    }
    const pendingAny = tasks.filter(t => !t.completed);
    if (pendingAny.length > 0) {
      return pendingAny.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];
    }
    return null;
  };

  const nextCriticalTask = getNextCriticalTask();
  const categoryPercentages = getCategoryPercentages();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} antialiased font-sans pb-16`}>
      {/* Upper Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Branding logo */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="font-sans font-extrabold text-slate-900 dark:text-white tracking-tight text-xl leading-none">
                  TaskPilot <span className="text-indigo-600 dark:text-indigo-400 font-black">AI</span>
                </h1>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono tracking-widest mt-1 uppercase font-bold">
                  Bento Strategic Hub
                </p>
              </div>
            </div>

            {/* User Persona Selector */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
              {(['professional', 'student', 'entrepreneur', 'general'] as UserType[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setUserType(role)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
                    userType === role
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Profile & Dark Mode switch */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Toggle Dark Mode"
              >
                {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
              </button>

              <div className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                AI Assistant Active
              </div>
              
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs">
                {currentRole.icon}
                <span className="capitalize">{userType}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Workspace Nav Tabs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-950 p-1.5 rounded-2xl w-fit font-sans">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Pilot Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                activeTab === 'matrix'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Grid2X2 className="h-4 w-4" />
              <span>Eisenhower Matrix</span>
            </button>

            <button
              onClick={() => setActiveTab('coach')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                activeTab === 'coach'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="flex items-center gap-1">
                AI Coach
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </span>
            </button>
          </div>

          {/* Persona selector for smaller responsive view */}
          <div className="flex sm:hidden items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-full justify-between">
            {(['professional', 'student', 'entrepreneur'] as UserType[]).map((role) => (
              <button
                key={role}
                onClick={() => setUserType(role)}
                className={`flex-1 text-center py-1.5 text-2xs font-semibold rounded-lg capitalize transition-all ${
                  userType === role 
                    ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs font-bold' 
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          <div className="text-2xs text-slate-500 dark:text-slate-400 md:text-xs">
            Role: <span className="font-bold text-slate-800 dark:text-slate-200">{currentRole.title}</span> — {currentRole.desc}
          </div>
        </div>

        {/* PROGRESS TRACKING BAR AND REMINDER CENTER BANNER */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Global Progress Tracking
              </span>
              <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 font-mono">
                {completionRate}% Complete
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-950 h-3 rounded-full overflow-hidden mb-2">
              <motion.div
                className="bg-gradient-to-r from-indigo-500 to-violet-600 h-full animate-pulse"
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{completedTasks} completed tasks</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {pendingTasks > 0 ? `🎯 ${pendingTasks} pending strategic objectives` : '🎉 All caught up! Stellar job!'}
              </span>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${deadlineAlerts.overdue.length > 0 ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600'} shrink-0`}>
              <Bell className="h-5 w-5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Deadline Reminder Center</h4>
              {deadlineAlerts.overdue.length > 0 ? (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-0.5 animate-pulse">
                  ⚠️ {deadlineAlerts.overdue.length} Overdue task(s) require actions!
                </p>
              ) : deadlineAlerts.dueToday.length > 0 ? (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                  ⚡ {deadlineAlerts.dueToday.length} Task(s) due today!
                </p>
              ) : deadlineAlerts.dueTomorrow.length > 0 ? (
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                  📅 {deadlineAlerts.dueTomorrow.length} Task(s) due tomorrow!
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  ✅ No urgent deadlines pending. All safe!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tab Views */}
        <div className="grid grid-cols-1 gap-6">
          {/* VIEW 1: PILOT DASHBOARD (THE MASTERPIECE BENTO GRID) */}
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-12 gap-5 items-stretch">
              
              {/* Box 1: Create Task (Left Block) */}
              <div className="col-span-12 lg:col-span-4 lg:row-span-4 flex flex-col">
                <AddTaskForm onAddTask={handleAddTask} userType={userType} />
              </div>

              {/* Box 2: Pending Queue / Active Tasks (Center Main Block) */}
              <div className="col-span-12 lg:col-span-5 lg:row-span-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 overflow-hidden flex flex-col min-h-[550px]">
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <div>
                    <h2 className="font-sans font-bold text-slate-900 dark:text-white text-lg tracking-tight">Pending Queue</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Search, sort, and orchestrate active items</p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 px-3 py-1 rounded-full">
                    {sortedTasks.length} Active
                  </span>
                </div>

                {/* Compact Bento Search & Toolbar */}
                <div className="space-y-3 mb-4 shrink-0">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-colors"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  </div>

                  {/* Filter pills & selectors row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg">
                      {(['pending', 'completed', 'all'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => setTaskStatusFilter(status)}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold capitalize transition-all ${
                            taskStatusFilter === status
                              ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as any)}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 px-2 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:bg-white dark:focus:bg-slate-950"
                      >
                        <option value="all" className="dark:bg-slate-900">All Priorities</option>
                        <option value="high" className="dark:bg-slate-900">🔴 High</option>
                        <option value="medium" className="dark:bg-slate-900">🟡 Medium</option>
                        <option value="low" className="dark:bg-slate-900">🟢 Low</option>
                      </select>

                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value as any)}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 px-2 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:bg-white dark:focus:bg-slate-950"
                      >
                        <option value="all" className="dark:bg-slate-900">All Categories</option>
                        <option value="Work" className="dark:bg-slate-900">💼 Work</option>
                        <option value="Personal" className="dark:bg-slate-900">🏠 Personal</option>
                        <option value="Education" className="dark:bg-slate-900">🎓 Education</option>
                        <option value="Health" className="dark:bg-slate-900">🌱 Health</option>
                        <option value="Finance" className="dark:bg-slate-900">💰 Finance</option>
                        <option value="Other" className="dark:bg-slate-900">🏷️ Other</option>
                      </select>

                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 px-2 py-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 focus:outline-none focus:bg-white dark:focus:bg-slate-950"
                        title="Sort Tasks"
                      >
                        <option value="deadline" className="dark:bg-slate-900">📅 Sort: Deadline</option>
                        <option value="priority" className="dark:bg-slate-900">⚡ Sort: Priority</option>
                        <option value="createdAt" className="dark:bg-slate-900">🆕 Sort: Newest</option>
                      </select>

                      {taskStatusFilter === 'completed' && filteredTasks.length > 0 && (
                        <button
                          onClick={handleClearCompleted}
                          className="flex items-center gap-0.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 text-[10px] font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scrollable list section */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[460px] lg:max-h-none">
                  <AnimatePresence mode="popLayout">
                    {sortedTasks.length > 0 ? (
                      sortedTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onToggleComplete={handleToggleComplete}
                          onDeleteTask={handleDeleteTask}
                          onViewOnMap={setFocusedTask}
                        />
                      ))
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-950/10"
                      >
                        <ListTodo className="h-8 w-8 text-slate-300 dark:text-slate-700 stroke-[1.5] mx-auto mb-2" />
                        <h4 className="font-sans font-bold text-slate-700 dark:text-slate-300 text-sm">No tasks in this pilot view</h4>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-xs mx-auto">
                          Adjust filters or add a strategic item to begin tracking details.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Box 3: Stats - AI Strategy Index (Right Top Block) */}
              <div className="col-span-12 md:col-span-6 lg:col-span-3 lg:row-span-2 bg-slate-900 rounded-3xl p-6 flex flex-col justify-between text-white shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Activity className="w-20 h-20 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI Strategy Index</p>
                  <p className="text-2xs text-slate-500 mt-0.5">High-impact quadrant focus</p>
                </div>
                <div className="my-2 flex items-end justify-between z-10">
                  <span className="text-5xl font-light italic leading-none text-white tracking-tighter">
                    {proactivityScore}<span className="text-lg font-normal text-slate-400 ml-0.5">%</span>
                  </span>
                  <div className="text-right">
                    <p className={`text-xs font-black ${proactivityLabel.color}`}>{proactivityLabel.text}</p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">Productivity rating</p>
                  </div>
                </div>
                <div className="space-y-1 z-10">
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-500"
                      style={{ width: `${proactivityScore}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>Target: 80%+</span>
                    <span>Live feedback</span>
                  </div>
                </div>
              </div>

              {/* Box 4: Stats - Task Completion Rate (Right Middle Block) */}
              <div className="col-span-12 md:col-span-6 lg:col-span-3 lg:row-span-2 bg-indigo-600 rounded-3xl p-6 flex flex-col justify-between text-white shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-15 group-hover:opacity-25 transition-opacity">
                  <Zap className="w-20 h-20 text-white animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-100">Completion Rate</p>
                  <p className="text-2xs text-indigo-200 mt-0.5">Ratio of checked items</p>
                </div>
                <div className="my-2 flex items-end justify-between z-10">
                  <span className="text-5xl font-light italic leading-none text-white tracking-tighter">
                    {completionRate}<span className="text-lg font-normal text-indigo-200 ml-0.5">%</span>
                  </span>
                  <div className="text-right">
                    <p className="text-xs font-bold text-white">{completedTasks} Completed</p>
                    <p className="text-[9px] text-indigo-200 mt-0.5">{pendingTasks} Pending</p>
                  </div>
                </div>
                <div className="space-y-1 z-10">
                  <div className="h-1 bg-indigo-800 rounded-full overflow-hidden">
                    <div
                      className="bg-white h-full transition-all duration-500"
                      style={{ width: `${completionRate}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-indigo-200 font-mono">
                    <span>Target: 100%</span>
                    <span>Daily Progress</span>
                  </div>
                </div>
              </div>

              {/* Box 5: Workload Effort (Bottom Left Block) */}
              <div className="col-span-12 md:col-span-6 lg:col-span-4 lg:row-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Focus Workload Effort</h3>
                    <p className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Estimated time allocation</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    highPriorityCount > 2 ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50' : 'bg-green-50 dark:bg-emerald-950/40 text-green-700 dark:text-emerald-400 border border-green-100 dark:border-emerald-900/50'
                  }`}>
                    {highPriorityCount > 2 ? 'High Load' : 'Balanced'}
                  </span>
                </div>
                <div className="flex items-center gap-4 py-1">
                  <div className="relative w-12 h-12 rounded-full border-2 border-indigo-100 dark:border-indigo-950 flex items-center justify-center font-extrabold text-slate-800 dark:text-slate-200 text-sm shrink-0">
                    <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-indigo-400 opacity-75 -top-1 -right-1"></span>
                    {highPriorityCount}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {pendingHours > 0 ? `${pendingHours.toFixed(1)} hrs` : '0 hrs'} estimated
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {highPriorityCount > 0 ? `${highPriorityCount} critical items require urgent focus today.` : 'No critical high-priority tasks pending.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Box 6: Category Mix (Bottom Right Block) */}
              <div className="col-span-12 md:col-span-6 lg:col-span-3 lg:row-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Category Mix</h3>
                  <p className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Distribution of active tasks</p>
                </div>
                <div className="space-y-2.5 mt-2">
                  {categoryPercentages.slice(0, 3).map((item, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${item.color}`}></span>
                          {item.name}
                        </span>
                        <span>{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-950 h-1 rounded-full overflow-hidden">
                        <div className={`${item.color} h-full transition-all duration-500`} style={{ width: `${item.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 7: Dynamic Role-Specific Hub */}
              {userType !== 'general' && (
                <div className="col-span-12 md:col-span-6 lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
                  {userType === 'student' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono">Academic Desk</span>
                          <h3 className="font-bold text-slate-800 dark:text-white text-base mt-0.5 font-sans">Assignment Tracking</h3>
                        </div>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 px-2.5 py-0.5 rounded-full">
                          GPA Goal: 4.0
                        </span>
                      </div>
                      
                      <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                        {studentAssignments.map((as: any) => (
                          <div 
                            key={as.id} 
                            onClick={() => {
                              setStudentAssignments((prev: any) => prev.map((item: any) => 
                                item.id === as.id ? { ...item, completed: !item.completed } : item
                              ));
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                              as.completed 
                                ? 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-900 line-through opacity-60' 
                                : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input 
                                type="checkbox" 
                                checked={as.completed}
                                onChange={() => {}} // handled by parent onClick
                                className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{as.title}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">{as.course}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 font-mono shrink-0">
                              {as.hours}h study
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <input
                          id="new-assignment"
                          type="text"
                          placeholder="Add coursework title..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement;
                              if (!input.value.trim()) return;
                              setStudentAssignments((prev: any) => [
                                ...prev,
                                {
                                  id: `sa-${Date.now()}`,
                                  title: input.value.trim(),
                                  course: 'Syllabus Assignment',
                                  hours: 2,
                                  completed: false
                                }
                              ]);
                              input.value = '';
                            }
                          }}
                          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById('new-assignment') as HTMLInputElement;
                            if (input && input.value.trim()) {
                              setStudentAssignments((prev: any) => [
                                ...prev,
                                {
                                  id: `sa-${Date.now()}`,
                                  title: input.value.trim(),
                                  course: 'Syllabus Assignment',
                                  hours: 2,
                                  completed: false
                                }
                              ]);
                              input.value = '';
                            }
                          }}
                          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 shrink-0 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  {userType === 'professional' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono">Professional Suite</span>
                          <h3 className="font-bold text-slate-800 dark:text-white text-base mt-0.5 font-sans">Meetings & Focus Blocks</h3>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 px-2.5 py-0.5 rounded-full">
                          Sprint Active
                        </span>
                      </div>
                      
                      <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                        {professionalMeetings.map((mt: any) => (
                          <div 
                            key={mt.id}
                            onClick={() => {
                              setProfessionalMeetings((prev: any) => prev.map((item: any) => 
                                item.id === mt.id ? { ...item, checked: !item.checked } : item
                              ));
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                              mt.checked 
                                ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/40 opacity-70' 
                                : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-2 h-2 rounded-full ${mt.checked ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'} shrink-0`} />
                              <div className="min-w-0">
                                <p className={`text-xs font-bold text-slate-800 dark:text-slate-200 truncate ${mt.checked ? 'line-through' : ''}`}>{mt.title}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">{mt.room}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md font-mono">
                              {mt.time}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <input
                          id="new-meeting"
                          type="text"
                          placeholder="E.g., Client sync 11:30 AM..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement;
                              if (!input.value.trim()) return;
                              setProfessionalMeetings((prev: any) => [
                                ...prev,
                                {
                                  id: `pm-${Date.now()}`,
                                  title: input.value.trim(),
                                  time: 'TBD',
                                  room: 'Virtual Room C',
                                  checked: false
                                }
                              ]);
                              input.value = '';
                            }
                          }}
                          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById('new-meeting') as HTMLInputElement;
                            if (input && input.value.trim()) {
                              setProfessionalMeetings((prev: any) => [
                                ...prev,
                                {
                                  id: `pm-${Date.now()}`,
                                  title: input.value.trim(),
                                  time: 'TBD',
                                  room: 'Virtual Room C',
                                  checked: false
                                }
                              ]);
                              input.value = '';
                            }
                          }}
                          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 shrink-0 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  {userType === 'entrepreneur' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono">Founder Suite</span>
                          <h3 className="font-bold text-slate-800 dark:text-white text-base mt-0.5 font-sans">Business Goals Tracking</h3>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 px-2.5 py-0.5 rounded-full">
                          MRR Goal: $10k
                        </span>
                      </div>
                      
                      <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                        {entrepreneurGoals.map((gl: any) => (
                          <div 
                            key={gl.id}
                            onClick={() => {
                              setEntrepreneurGoals((prev: any) => prev.map((item: any) => 
                                item.id === gl.id ? { ...item, completed: !item.completed } : item
                              ));
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                              gl.completed 
                                ? 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-900 line-through opacity-60' 
                                : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input 
                                type="checkbox" 
                                checked={gl.completed}
                                onChange={() => {}} // handled by parent onClick
                                className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{gl.title}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">{gl.milestone}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-400 font-mono shrink-0 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">
                              {gl.targetDate}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <input
                          id="new-goal"
                          type="text"
                          placeholder="Add new launch milestone..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement;
                              if (!input.value.trim()) return;
                              setEntrepreneurGoals((prev: any) => [
                                ...prev,
                                {
                                  id: `eg-${Date.now()}`,
                                  title: input.value.trim(),
                                  milestone: 'Growth Objective',
                                  targetDate: '2026-07-01',
                                  completed: false
                                }
                              ]);
                              input.value = '';
                            }
                          }}
                          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById('new-goal') as HTMLInputElement;
                            if (input && input.value.trim()) {
                              setEntrepreneurGoals((prev: any) => [
                                ...prev,
                                {
                                  id: `eg-${Date.now()}`,
                                  title: input.value.trim(),
                                  milestone: 'Growth Objective',
                                  targetDate: '2026-07-01',
                                  completed: false
                                }
                              ]);
                              input.value = '';
                            }
                          }}
                          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 shrink-0 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Dedicated "GIS Task Map" Section below the main grid */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col gap-4 mt-6">
              <div className="flex flex-col">
                <h2 className="font-sans font-bold text-slate-900 dark:text-white text-lg tracking-tight">GIS Task Map</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500">Interactive live spatial mapping engine for checked GIS locations</p>
              </div>
              <TaskMap tasks={tasks} focusedTask={focusedTask} />
            </div>
            </>
          )}

          {/* VIEW 2: EISENHOWER DECISION MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-6">
              {/* Secondary view Overview stats (satisfies preserving all components!) */}
              <DashboardStats tasks={tasks} />
              <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
                <EisenhowerMatrix tasks={tasks} onToggleComplete={handleToggleComplete} />
              </div>
            </div>
          )}

          {/* VIEW 3: AI COACH CHAT ASSISTANT */}
          {activeTab === 'coach' && (
            <div className="space-y-6">
              {/* Secondary view Overview stats (satisfies preserving all components!) */}
              <DashboardStats tasks={tasks} />
              <div className="max-w-4xl mx-auto w-full">
                <AIChatAssistant tasks={tasks} userType={userType} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
