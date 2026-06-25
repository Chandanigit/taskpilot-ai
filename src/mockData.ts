import { Task } from './types';

export const INITIAL_TASKS: Task[] = [
  {
    id: 'sample-1',
    title: 'Finalize Slide Deck for Product Launch',
    description: 'Structure slides, include key growth graphics, prepare talk track, and run a full rehearsal with the executive team.',
    priority: 'high',
    deadline: (() => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      return date.toISOString().split('T')[0];
    })(),
    category: 'Work',
    completed: false,
    createdAt: new Date().toISOString(),
    aiAnalysis: {
      urgencyScore: 9,
      importanceScore: 10,
      recommendation: 'Urgent & Important',
      suggestions: [
        'Limit slides to maximum 10-12 key slides focusing on value proposition and growth metrics.',
        'Record a quick 3-minute video rehearsal to check pacing and word-fillers.',
        'Send slides to the tech team ahead of time to verify rendering in the presentation environment.'
      ],
      actionPlan: 'Write down the three core emotional takeaways you want the audience to remember.',
      timeManagementTechnique: 'Pomodoro (50m Focus / 10m Review)',
      estimatedHours: 2.5
    }
  },
  {
    id: 'sample-2',
    title: 'Study Data Science Midterm Course Materials',
    description: 'Review modules 3 to 7, practice covariance questions, write sample python regression models, and complete practice exam.',
    priority: 'medium',
    category: 'Education',
    deadline: (() => {
      const date = new Date();
      date.setDate(date.getDate() + 5);
      return date.toISOString().split('T')[0];
    })(),
    completed: false,
    createdAt: new Date().toISOString(),
    aiAnalysis: {
      urgencyScore: 5,
      importanceScore: 8,
      recommendation: 'Important but Not Urgent',
      suggestions: [
        'Dedicate 60-minute early morning intervals to active recall instead of passive reading.',
        'Focus heavily on module 5 (Linear Regressions) as past midterms weigh it at 35%.',
        'Study in a quiet space like a library study room with phone fully powered down.'
      ],
      actionPlan: 'Outline the 5 major equations from modules 3-7 on a single cheat sheet.',
      timeManagementTechnique: 'Active Recall Study Blocks',
      estimatedHours: 6.0
    }
  },
  {
    id: 'sample-3',
    title: 'Review Monthly Household Budget',
    description: 'Categorize expenses, download transactions, check subscription renewals, and allocate remaining to savings.',
    priority: 'low',
    category: 'Finance',
    deadline: (() => {
      const date = new Date();
      date.setDate(date.getDate() + 3);
      return date.toISOString().split('T')[0];
    })(),
    completed: true,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    aiAnalysis: {
      urgencyScore: 4,
      importanceScore: 5,
      recommendation: 'Urgent but Not Important',
      suggestions: [
        'Automate your transaction downloads using an online budget syncing tool if possible.',
        'Focus on cancelling any subscription you haven’t logged into in the past 60 days.',
        'Create a dedicated high-yield savings account transfer automation to prevent impulse spending.'
      ],
      actionPlan: 'Download and open your credit card statement in a browser window.',
      timeManagementTechnique: '2-Minute Rule / Batching',
      estimatedHours: 1.0
    }
  }
];
