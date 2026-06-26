import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;

// Lazy initialize Gemini AI client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required to analyze tasks.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Endpoint: Analyze individual task
  app.post("/api/analyze-task", async (req, res) => {
    try {
      const { title, description, priority, deadline, category, userType, currentDate } = req.body;

      if (!title) {
        return res.status(400).json({ error: "Task title is required." });
      }

      const client = getGeminiClient();

      const prompt = `Analyze this task to provide productivity insights, time estimation, and priority analysis:
- Task Title: ${title}
- Description: ${description || "No description provided."}
- User Priority Rating: ${priority || "medium"}
- Target Deadline: ${deadline || "No deadline"}
- Category: ${category || "Other"}
- User Profile: ${userType || "general"}
- Current Date/Time of Context: ${currentDate || "today"}

Determine its placement on the Eisenhower Matrix ('Urgent & Important', 'Important but Not Urgent', 'Urgent but Not Important', or 'Not Urgent & Not Important') and score its urgency and importance from 1 to 10 based on the deadline, user type, and task nature. Provide 3 highly actionable, concrete focus suggestions, a suggested starting step (actionPlan), a recommended time management technique, and estimated effort in hours.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: `You are TaskPilot AI, an elite schedule coach. You analyze a task's priority, urgency, and description to categorize it into one of the 4 Eisenhower matrix quadrants:
1. 'Urgent & Important' (Do first - tasks with close deadlines or high-stakes impact)
2. 'Important but Not Urgent' (Schedule - tasks that build long-term value but have ample time or no strict immediate deadline)
3. 'Urgent but Not Important' (Delegate - tasks that demand immediate attention but don't contribute heavily to long-term goals)
4. 'Not Urgent & Not Important' (Eliminate / Delay - tasks that are trivial or can easily be deferred)

Always return the response in strict JSON matching the requested schema. Do not include markdown formatting or wrapper other than the schema itself.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              urgencyScore: {
                type: Type.INTEGER,
                description: "Urgency score from 1 to 10 based on deadline distance and category."
              },
              importanceScore: {
                type: Type.INTEGER,
                description: "Importance score from 1 to 10 based on impact, priority, and description."
              },
              recommendation: {
                type: Type.STRING,
                description: "Eisenhower category. Must be one of: 'Urgent & Important', 'Important but Not Urgent', 'Urgent but Not Important', 'Not Urgent & Not Important'."
              },
              suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 highly actionable, concrete productivity suggestions or preparation tips tailored for this specific task."
              },
              actionPlan: {
                type: Type.STRING,
                description: "A short, one-sentence first step to get started immediately (e.g., 'Eat the Frog' first micro-step)."
              },
              timeManagementTechnique: {
                type: Type.STRING,
                description: "A recommended time management technique (e.g., 'Pomodoro (25m focus / 5m break)', 'Time Blocking', 'Eat the Frog First', '90-Minute Focus Blocks') with a brief 10-word explanation of why it fits this task."
              },
              estimatedHours: {
                type: Type.NUMBER,
                description: "Estimated focus time required to complete this task (e.g., 1.5, 3, 0.5)."
              }
            },
            required: [
              "urgencyScore",
              "importanceScore",
              "recommendation",
              "suggestions",
              "actionPlan",
              "timeManagementTechnique",
              "estimatedHours"
            ]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response received from Gemini.");
      }

      const parsedAnalysis = JSON.parse(responseText.trim());
      res.json(parsedAnalysis);
    } catch (error: any) {
      console.error("Error in /api/analyze-task:", error);
      res.status(500).json({ error: error.message || "Failed to analyze task using Gemini AI." });
    }
  });

  // API Endpoint: AI Schedule Assistant Chatbot
  app.post("/api/assistant", async (req, res) => {
    try {
      const { messages, tasks, userType } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Conversation messages are required." });
      }

      const client = getGeminiClient();

      // System instruction embedded with context
      const systemInstruction = `You are TaskPilot AI, an elite personal productivity coach and schedule optimizer.
You are advising a user who is configured as a "${userType || 'general'}" productivity persona.

Here is the list of their current tasks, including priorities, deadlines, completion statuses, and any existing AI analyses:
${JSON.stringify(tasks || [], null, 2)}

Provide brief, motivating, and extremely specific coaching advice. When they ask about their tasks, priorities, or what to do next, reference the list directly and provide suggestions. Use bold text for key terms or tasks, but keep the responses concise (under 150 words) to fit beautifully inside a chat window. If they have no tasks, encourage them to add some so you can help them navigate their day!`;

      // Translate client messages list to gemini contents format
      const formattedContents = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const text = response.text || "I apologize, I could not process that request. Let's look back at your schedule!";
      res.json({ text });
    } catch (error: any) {
      console.error("Error in /api/assistant:", error);
      res.status(500).json({ error: error.message || "Failed to get coaching advice from Gemini AI." });
    }
  });

  // API Endpoint: AI Location Insights
  app.post("/api/analyze-locations", async (req, res) => {
    try {
      const { tasks, userLocation } = req.body;

      if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ error: "At least one mapped task is required for analysis." });
      }

      // Pre-calculate geographic metadata to ground the Gemini prompt
      const getDist = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => {
        const R = 6371; // Earth radius in km
        const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
        const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((p1.lat * Math.PI) / 180) *
            Math.cos((p2.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      // Calculate distance between all pairs of tasks
      const distancePairs: Array<{ t1: string; t2: string; d: number }> = [];
      const highPriorityFarApart: Array<{ t1: string; t2: string; d: number }> = [];

      for (let i = 0; i < tasks.length; i++) {
        for (let j = i + 1; j < tasks.length; j++) {
          const t1 = tasks[i];
          const t2 = tasks[j];
          if (t1.location && t2.location) {
            const d = getDist(t1.location, t2.location);
            distancePairs.push({ t1: t1.title, t2: t2.title, d });

            if (t1.priority === "high" && t2.priority === "high" && d > 5) {
              highPriorityFarApart.push({ t1: t1.title, t2: t2.title, d });
            }
          }
        }
      }

      // Group nearby tasks (e.g., within 2km)
      const nearbyGroupings: Record<string, string[]> = {};
      tasks.forEach((t) => {
        if (!t.location) return;
        const neighbors = tasks
          .filter((other) => other.id !== t.id && other.location && getDist(t.location!, other.location) <= 2)
          .map((other) => other.title);
        if (neighbors.length > 0) {
          nearbyGroupings[t.title] = neighbors;
        }
      });

      const client = getGeminiClient();

      const prompt = `Analyze these mapped tasks to provide geographic productivity insights, clusters, routing sequence suggestions, high-priority separation warnings, and travel efficiency scores:
- Mapped Tasks: ${JSON.stringify(tasks, null, 2)}
- User Location: ${userLocation ? JSON.stringify(userLocation) : "Not available"}
- Pre-calculated Distance Pairs (km): ${JSON.stringify(distancePairs.map(p => `${p.t1} to ${p.t2}: ${p.d.toFixed(2)}km`))}
- High-Priority far apart (>5km): ${JSON.stringify(highPriorityFarApart.map(p => `${p.t1} & ${p.t2} are separated by ${p.d.toFixed(2)}km`))}
- Proximity Groupings (within 2km): ${JSON.stringify(nearbyGroupings)}

Analyze this spatial distribution and return the result in strict compliance with the response schema.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: `You are TaskPilot GIS AI, an elite spatial logistics planner. Your job is to analyze active mapped tasks and provide geographic insights:
1. Detect task clusters based on proximity (usually tasks within 2-3km are in the same cluster). Give each cluster a human-friendly name (e.g., "Exhibition Road Hub", "Fraser Road Business District") and assign the matching task IDs.
2. Suggest the best sequence to complete the tasks logically, starting from the User Location (if available) or the most critical task. Sequence should minimize backtrack travel while respecting priority.
3. Warn if two high-priority tasks are far apart (>5km) to help the user avoid running across town twice.
4. Calculate a travel productivity score (1-100) based on transit efficiency:
   - 90-100: Tasks are highly concentrated or in a single cluster. Minimal travel needed.
   - 70-89: Tasks are grouped into 2 distinct clusters with clear travel paths.
   - 45-69: Moderate dispersion. Tasks are scattered but logical routing is possible.
   - <45: Highly scattered tasks. High transit overhead.
Provide clear explanation and constructive suggestions for improving their travel path.

Always return the response in strict JSON matching the requested schema. Do not include markdown formatting or wrapper other than the schema itself.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clusters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Descriptive name for this cluster." },
                    taskIds: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of task IDs belonging to this cluster."
                    },
                    description: { type: Type.STRING, description: "A brief, one-sentence description explaining why these tasks are grouped." }
                  },
                  required: ["name", "taskIds", "description"]
                }
              },
              suggestedSequence: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    taskId: { type: Type.STRING },
                    reason: { type: Type.STRING, description: "Logistical reason for doing this task in this order." }
                  },
                  required: ["taskId", "reason"]
                }
              },
              warnings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: "The category of warning, e.g., 'HIGH_PRIORITY_GAP', 'SCATTERED_WORKLOAD', or 'OPTIMAL_DENSITY'." },
                    message: { type: Type.STRING, description: "User-facing warning message." }
                  },
                  required: ["type", "message"]
                }
              },
              productivityScore: {
                type: Type.INTEGER,
                description: "Productivity score from 1 to 100 based on transit efficiency."
              },
              efficiencyExplanation: {
                type: Type.STRING,
                description: "A summary explaining the score and offering spatial advice."
              }
            },
            required: ["clusters", "suggestedSequence", "warnings", "productivityScore", "efficiencyExplanation"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response received from Gemini.");
      }

      const parsedAnalysis = JSON.parse(responseText.trim());
      res.json(parsedAnalysis);
    } catch (error: any) {
      console.error("Error in /api/analyze-locations:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI Location Insights." });
    }
  });

  // Serve static files and integrate Vite dev middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TaskPilot AI] Server is running on http://localhost:${PORT}`);
  });
}

startServer();
