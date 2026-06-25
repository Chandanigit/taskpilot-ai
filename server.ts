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
