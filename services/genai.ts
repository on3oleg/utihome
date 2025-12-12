import { GoogleGenAI } from "@google/genai";

// Initialize the client with the API key from the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const recognizeMeterReading = async (base64Image: string): Promise<string> => {
  try {
    // Clean the base64 string if it contains the data URL header
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, "");

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: "Analyze this image of a utility meter (water, gas, or electricity). Extract the numeric reading shown on the counter. Return ONLY the number. If there are decimal digits (often in red or a separate dial), include them with a decimal point. Do not include units or text. If unreadable, return empty string."
          }
        ]
      }
    });

    const text = response.text || "";
    // Clean up result: remove non-numeric chars except dot
    return text.replace(/[^0-9.]/g, '');
  } catch (error) {
    console.error("GenAI Error:", error);
    throw new Error("Failed to recognize image");
  }
};