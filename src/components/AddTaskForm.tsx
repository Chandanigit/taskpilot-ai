import React, { useState } from 'react';
import { Priority, Category, Task, AIAnalysis, UserType } from '../types';
import { Plus, Sparkles, Loader2, Calendar, AlertCircle, HelpCircle, MapPin, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AddTaskFormProps {
  onAddTask: (task: Task) => void;
  userType: UserType;
}

const PRESETS = [
  { name: 'Patna Center', lat: '25.5941', lng: '85.1376' },
  { name: 'SF Tech District', lat: '37.7749', lng: '-122.4194' },
  { name: 'NYC Headquarters', lat: '40.7128', lng: '-74.0060' },
  { name: 'London Office', lat: '51.5308', lng: '-0.1238' },
  { name: 'Tokyo Office', lat: '35.6586', lng: '139.7454' }
];

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

  // Speech Recognition States & Logic
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);

  const startSpeechRecognition = () => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setErrorMsg('Speech recognition is not supported in this browser. Try Chrome, Edge, or Safari.');
      setTimeout(() => setErrorMsg(null), 5000);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceStatus('Listening... Speak now!');
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setIsListening(false);
        setVoiceStatus(null);
        setErrorMsg(`Speech recognition error: ${event.error || 'unknown'}`);
        setTimeout(() => setErrorMsg(null), 5000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && transcript.trim()) {
          const cleanTranscript = transcript.trim();
          // Capitalize first letter
          const capitalized = cleanTranscript.charAt(0).toUpperCase() + cleanTranscript.slice(1);
          
          setTitle(capitalized);
          setDescription(`Created via Voice Recognition: "${cleanTranscript}"`);
          
          setVoiceStatus('Voice recognized successfully');
          setTimeout(() => setVoiceStatus(null), 4000);

          // Smart auto-date extraction
          const lower = cleanTranscript.toLowerCase();
          if (lower.includes('today')) {
            const todayStr = new Date().toISOString().split('T')[0];
            setDeadline(todayStr);
          } else if (lower.includes('tomorrow')) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setDeadline(tomorrow.toISOString().split('T')[0]);
          }
        }
      };

      recognition.start();
    } catch (err: any) {
      console.error('Speech recognition exception:', err);
      setErrorMsg('Could not start speech recognition.');
      setTimeout(() => setErrorMsg(null), 5000);
      setIsListening(false);
      setVoiceStatus(null);
    }
  };

  // GIS Location States
  const [hasLocation, setHasLocation] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('25.5941');
  const [longitude, setLongitude] = useState('85.1376');

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

    // Suggested category mapping
    let suggestedCategory = 'Work';
    if (category === 'Education') suggestedCategory = 'Study';
    else if (category === 'Personal' || category === 'Health') suggestedCategory = 'Personal';
    else if (category === 'Work' || category === 'Finance') suggestedCategory = 'Work';

    // Offline subtasks
    const subtasks = [
      `Review task requirements for: ${title}`,
      `Draft initial outline / layout of key components`,
      `Finalize delivery and run a self-review checkpoint`
    ];

    // Offline productivity tips
    const productivityTips = [
      `Focus for 25 minutes using the ${technique} technique.`,
      `Minimize tab clutter to only the document required for this task.`,
      `Review progress at the midpoint of your estimated ${estimatedHours} hours.`
    ];

    // Offline insights & recommendations
    const aiInsightsCard = `This task is marked as ${priority} priority. Urgency is ${urgencyScore}/10 and importance is ${importanceScore}/10 based on local analysis.`;
    const aiRecommendationText = priority === 'high' 
      ? 'Complete this first to avoid bottlenecking other dependencies!' 
      : 'Handle this during low-energy focus blocks to protect critical tasks.';

    return {
      urgencyScore,
      importanceScore,
      recommendation,
      suggestions,
      actionPlan: startingStep,
      timeManagementTechnique: technique,
      estimatedHours,
      suggestedPriority: priority,
      suggestedCategory,
      subtasks,
      productivityTips,
      aiInsightsCard,
      aiRecommendationText
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsAnalyzing(true);
    setErrorMsg(null);

    const currentDateStr = new Date().toISOString().split('T')[0];
    
    const locationObj = hasLocation ? {
      name: locationName.trim() || 'Patna Center',
      lat: parseFloat(latitude) || 25.5941,
      lng: parseFloat(longitude) || 85.1376
    } : undefined;

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

      // Map AI Suggested Category and Priority if they exist
      let finalPriority = priority;
      if (aiAnalysis.suggestedPriority) {
        finalPriority = aiAnalysis.suggestedPriority;
      }
      
      let finalCategory = category;
      if (aiAnalysis.suggestedCategory) {
        if (aiAnalysis.suggestedCategory === 'Study') {
          finalCategory = 'Education';
        } else if (aiAnalysis.suggestedCategory === 'Work' || aiAnalysis.suggestedCategory === 'Personal') {
          finalCategory = aiAnalysis.suggestedCategory as Category;
        }
      }

      const newTask: Task = {
        id: crypto.randomUUID(),
        title: title.trim(),
        description: description.trim(),
        priority: finalPriority,
        deadline,
        category: finalCategory,
        completed: false,
        createdAt: new Date().toISOString(),
        aiAnalysis,
        location: locationObj,
      };

      onAddTask(newTask);
      setTitle('');
      setDescription('');
      setHasLocation(false);
      setLocationName('');
      setLatitude('25.5941');
      setLongitude('85.1376');
    } catch (err: any) {
      console.warn('AI Analysis failed, applying local fallback analysis rules.', err);
      // Run the client-side fallback so user is NEVER blocked
      const fallbackAnalysis = getFallbackAnalysis(title, description, priority, deadline, category, userType);

      // Map fallback suggested properties
      let fallbackPriority = priority;
      if (fallbackAnalysis.suggestedPriority) {
        fallbackPriority = fallbackAnalysis.suggestedPriority;
      }
      
      let fallbackCategory = category;
      if (fallbackAnalysis.suggestedCategory) {
        if (fallbackAnalysis.suggestedCategory === 'Study') {
          fallbackCategory = 'Education';
        } else if (fallbackAnalysis.suggestedCategory === 'Work' || fallbackAnalysis.suggestedCategory === 'Personal') {
          fallbackCategory = fallbackAnalysis.suggestedCategory as Category;
        }
      }

      const newTask: Task = {
        id: crypto.randomUUID(),
        title: title.trim(),
        description: description.trim(),
        priority: fallbackPriority,
        deadline,
        category: fallbackCategory,
        completed: false,
        createdAt: new Date().toISOString(),
        aiAnalysis: fallbackAnalysis,
        location: locationObj,
      };

      onAddTask(newTask);
      setTitle('');
      setDescription('');
      setHasLocation(false);
      setLocationName('');
      setLatitude('25.5941');
      setLongitude('85.1376');
      
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
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="task-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Task Title *
            </label>
            <AnimatePresence>
              {voiceStatus && (
                <motion.span
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    voiceStatus.includes('successfully')
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                      : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 animate-pulse'
                  }`}
                >
                  {voiceStatus}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="flex gap-2">
            <input
              id="task-title"
              type="text"
              required
              placeholder="e.g., Finalize marketing proposal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isAnalyzing}
              className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={startSpeechRecognition}
              disabled={isAnalyzing}
              title="Click to dictate task title & description"
              className={`px-3.5 rounded-xl border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                isListening
                  ? 'bg-rose-500 border-rose-500 text-white animate-pulse shadow-md shadow-rose-500/20'
                  : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          </div>
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

        {/* GIS Location Section */}
        <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            <input
              type="checkbox"
              checked={hasLocation}
              onChange={(e) => {
                setHasLocation(e.target.checked);
                if (e.target.checked && !locationName) {
                  setLocationName('Patna Center');
                  setLatitude('25.5941');
                  setLongitude('85.1376');
                }
              }}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Pin to GIS Map</span>
          </label>

          {hasLocation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 pl-6"
            >
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Preset Locations
                </label>
                <select
                  onChange={(e) => {
                    const preset = PRESETS.find(p => p.name === e.target.value);
                    if (preset) {
                      setLocationName(preset.name);
                      setLatitude(preset.lat);
                      setLongitude(preset.lng);
                    } else if (e.target.value === 'Custom') {
                      setLocationName('');
                      setLatitude('25.5941');
                      setLongitude('85.1376');
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-colors"
                >
                  <option value="Patna Center">📍 Patna Center, Bihar</option>
                  <option value="SF Tech District">💼 San Francisco Tech District</option>
                  <option value="NYC Headquarters">🗽 New York Broadway HQ</option>
                  <option value="London Office">🇬🇧 London Kings Cross Hub</option>
                  <option value="Tokyo Office">🗼 Tokyo Ginza Office</option>
                  <option value="Custom">📍 Custom Coordinate...</option>
                </select>
              </div>

              <div>
                <label htmlFor="loc-name" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Location Name
                </label>
                <input
                  id="loc-name"
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="E.g., Conference Room B"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="loc-lat" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Latitude
                  </label>
                  <input
                    id="loc-lat"
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="loc-lng" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Longitude
                  </label>
                  <input
                    id="loc-lng"
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </motion.div>
          )}
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
