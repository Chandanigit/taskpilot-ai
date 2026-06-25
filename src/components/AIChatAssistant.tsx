import React, { useState, useRef, useEffect } from 'react';
import { Task, ChatMessage, UserType } from '../types';
import { Sparkles, Send, Bot, User, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIChatAssistantProps {
  tasks: Task[];
  userType: UserType;
}

export default function AIChatAssistant({ tasks, userType }: AIChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello there! I'm your **TaskPilot Coach**. 🚀\n\nI have reviewed your task schedule for your **${userType}** profile. Ask me anything, or try one of the quick actions below to optimize your daily flow!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Quick prompt questions
  const quickPrompts = [
    { label: '🎯 What to do first?', prompt: 'Analyze my tasks and tell me exactly which task I should start with today and why.' },
    { label: '📊 Workload Bottleneck?', prompt: 'Do you see any deadline bottlenecks or overloads in my schedule? Recommend an optimization plan.' },
    { label: '⌛ Focus Strategy', prompt: 'Give me a brief focus and time management strategy customized to my task priority profile.' },
  ];

  // Helper: Simple Markdown Bold / Bullet Parser
  const parseBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold text-slate-950 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100/50">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const formatMessageText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      let content: React.ReactNode = line;

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletText = line.trim().substring(2);
        content = (
          <span className="flex items-start gap-1.5 pl-1.5 py-0.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
            <span className="text-slate-800 leading-relaxed text-xs sm:text-sm">{parseBoldText(bulletText)}</span>
          </span>
        );
      } else {
        content = <span className="text-slate-800 leading-relaxed text-xs sm:text-sm">{parseBoldText(line)}</span>;
      }

      return (
        <div key={idx} className="min-h-[1.2rem] leading-relaxed">
          {content}
        </div>
      );
    });
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMsg('');
    setIsLoading(true);

    try {
      const payloadMessages = [...messages, userMsg].slice(-8); // send last 8 messages for context window stability

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          tasks,
          userType,
        }),
      });

      if (!response.ok) {
        throw new Error('Coaching assistant server error');
      }

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Failed to get coaching advice', err);
      // Fallback response
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: `I'm having trouble reaching the main pilot engine. Looking at your list of **${tasks.length} tasks**, I recommend starting with any **🔴 HIGH** priority tasks first, specifically checking ones listed in **Urgent & Important**. Let me know once you are ready!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden h-[500px]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-4">
        <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 border border-indigo-100">
          <Bot className="h-5 w-5 animate-bounce" />
        </div>
        <div>
          <h3 className="font-sans font-bold text-slate-900 tracking-tight text-sm">AI Productivity Coach</h3>
          <p className="text-2xs text-slate-500">TaskPilot scheduling strategist</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/20">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-2.5 max-w-[85%] ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl text-xs border ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-3xs'
                    : 'bg-white text-slate-600 border-slate-100 shadow-3xs'
                }`}
              >
                {msg.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Speech bubble */}
              <div className="space-y-1">
                <div
                  className={`rounded-2xl border px-4 py-2.5 text-slate-800 ${
                    msg.sender === 'user'
                      ? 'bg-indigo-50 border-indigo-100 rounded-tr-none'
                      : 'bg-white border-slate-150 rounded-tl-none shadow-3xs'
                  }`}
                >
                  <div className="space-y-1.5">{formatMessageText(msg.text)}</div>
                </div>
                <p className={`text-3xs text-slate-400 font-mono px-1 ${msg.sender === 'user' ? 'text-right' : ''}`}>
                  {msg.timestamp}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <div className="flex items-start gap-2.5 max-w-[85%]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 border border-slate-100 shadow-3xs">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-2.5 shadow-3xs">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Panel */}
      <div className="border-t border-slate-100 px-4 py-2.5 flex items-center gap-2 overflow-x-auto bg-white whitespace-nowrap scrollbar-none">
        <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider select-none">Quick Coaching:</span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p.prompt)}
            disabled={isLoading}
            className="rounded-full bg-slate-50 border border-slate-200/60 px-3 py-1 text-2xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputMsg);
        }}
        className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 bg-white"
      >
        <input
          type="text"
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          disabled={isLoading}
          placeholder="Ask TaskPilot (e.g., 'What is my highest impact task?')"
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!inputMsg.trim() || isLoading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
