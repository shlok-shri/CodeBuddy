import { GoogleGenAI } from '@google/genai';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';

let ai; // ✅ Singleton for Gemini instance

export const generateContent = async (prompt) => {
  if (!ai) {
    const credentialsJSON = Buffer.from(process.env.GEMINI_CREDS_BASE64, 'base64').toString('utf-8');
    const auth = new GoogleAuth({
      credentials: JSON.parse(credentialsJSON),
      scopes: ['https://www.googleapis.com/auth/generative-language'],
    });

    const client = await auth.getClient();

    ai = new GoogleGenAI({
      authClient: client,
    });
  }

  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: "application/json",
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `
⚠️ Important: Return ONLY a valid JSON object.
- No markdown, no extra commentary.
- For multi-file codebases (like full-stack MERN apps), use the format shown in system instructions (include "text", "FileTree", "buildCommands", "startCommands", (FileTree should further be an object with keys as fileName and its value as another object with key as "file" stricly with its value being a object again, this object has "contents" key with the file content as its value)).
- For simple replies or one-file code, return just a JSON with "text".
- Follow the provided system instructions very strictly.

Prompt: ${prompt}
            `.trim(),
          },
        ],
      },
    ],
    systemInstruction: `
You are a senior MERN stack developer with 10+ years of experience.

You must:
- Always write scalable, modular, and efficient code.
- Never miss edge cases.
- Include understandable comments.
- Maintain existing functionality.
- Organize multi-file codebases using a proper file tree.
- Handle errors gracefully in every function.

Always respond in strict JSON format.

📦 Format for multi-file code responses:
{
  "text": "<Short description>",
  "FileTree": {
    "<filePath>": {
      "file": {
        "contents": "<fileContent>"
      }
    }
  },
  "buildCommands": {
    "mainItem": "<tool like npm>",
    "commands": ["install"]
  },
  "startCommands": {
    "mainItem": "<tool like node>",
    "commands": ["app.js"]
  }
}

💬 Format for short responses:
{
  "text": "<message>"
}

📌 Example 1:
User: @ai create a simple express server with a single route
Response: {
  "text": "Sure! Here's a basic Express server...",
  "FileTree": {
    "app.js": {
      "file": {
        "contents": "const express = require('express');\nconst app = express();\n\napp.get('/', (req, res) => {\n  res.send('Hello World!');\n});\n\napp.listen(3000, () => {\n  console.log('Server is running on port 3000');\n});"
      }
    },
    ...
  },
  "buildCommands": {
    "mainItem": "npm",
    "commands": ["install"]
  },
  "startCommands": {
    "mainItem": "node",
    "commands": ["app.js"]
  }
}

📌 Example 2:
User: @ai Hello, how are you?
Response: {
  "text": "Hey Shlok! I'm doing great—charged up and ready to roll 😄 How about you?"
}
    `.trim(),
  });

  let raw = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!raw) throw new Error("No response text received from Gemini API");

  // 🔧 Clean potential markdown wrappers
  if (raw.startsWith('```json') || raw.startsWith('```')) {
    raw = raw.replace(/```json|```/g, '').trim();
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error("❌ Failed to parse Gemini response as JSON:\n", raw);
    throw new Error("Gemini response was not valid JSON");
  }
};
