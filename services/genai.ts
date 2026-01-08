import { GoogleGenAI } from "@google/genai";

export const recognizeMeterReading = async (base64Image: string): Promise<string> => {
  if (!process.env.API_KEY) {
    console.warn("Gemini API Key missing. OCR disabled.");
    return "";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Remove data URL prefix if present
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64,
              },
            },
            {
              text: "Extract ONLY the main numeric reading from this utility meter. Ignore small numbers, decimal points unless clearly part of the main reading, and unit labels. Return only the digits.",
            },
          ],
        },
      ],
    });

    const text = response.text?.trim() || "";
    // Sanitize output to keep only numbers
    return text.replace(/[^0-9]/g, '');
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    return "";
  }
};