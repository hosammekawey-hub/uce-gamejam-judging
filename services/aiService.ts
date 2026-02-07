import { GoogleGenAI, Type } from "@google/genai";
import { Criterion } from "../types";

export const AIService = {
  async generateRubric(description: string): Promise<Criterion[]> {
    // API key must be obtained exclusively from process.env.API_KEY
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing");
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Create a comprehensive judging rubric for a competition described as: "${description}".
      
      The rubric should have between 3 and 5 criteria.
      The sum of all weights must equal 1.0 (or very close).
      Each criterion must have 4 guidelines (ranges: 1-3, 4-6, 7-8, 9-10).
      
      Examples of descriptions: "A Spicy Food Eating Contest", "A Hackathon for Climate Change", "A High School Science Fair".
      Tailor the criteria names and descriptions specifically to the event type provided.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "Short unique key (camelCase, no spaces)" },
                name: { type: Type.STRING },
                weight: { type: Type.NUMBER, description: "Decimal between 0 and 1" },
                description: { type: Type.STRING },
                guidelines: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      range: { type: Type.STRING, description: "e.g. '1-3'" },
                      label: { type: Type.STRING, description: "e.g. 'Low'" },
                      text: { type: Type.STRING }
                    },
                    required: ["range", "label", "text"]
                  }
                }
              },
              required: ["id", "name", "weight", "description", "guidelines"]
            }
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as Criterion[];
      }
      return [];
    } catch (e) {
      console.error("AI Generation failed", e);
      throw e;
    }
  }
};