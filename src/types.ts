export type Priority = 'low' | 'medium' | 'high';

export type Category = 'Work' | 'Personal' | 'Education' | 'Health' | 'Finance' | 'Other';

export type EisenhowerCategory =
  | 'Urgent & Important'
  | 'Important but Not Urgent'
  | 'Urgent but Not Important'
  | 'Not Urgent & Not Important';

export type UserType = 'professional' | 'student' | 'entrepreneur' | 'general';

export interface AIAnalysis {
  urgencyScore: number; // 1-10
  importanceScore: number; // 1-10
  recommendation: EisenhowerCategory;
  suggestions: string[];
  actionPlan: string;
  timeManagementTechnique: string;
  estimatedHours: number;
  // Upgraded real Gemini analysis properties
  suggestedPriority?: Priority;
  suggestedCategory?: string;
  subtasks?: string[];
  productivityTips?: string[];
  aiInsightsCard?: string;
  aiRecommendationText?: string;
}

export interface TaskLocation {
  name: string;
  lat: number;
  lng: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  deadline: string; // YYYY-MM-DD
  category: Category;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  aiAnalysis?: AIAnalysis;
  location?: TaskLocation;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}
