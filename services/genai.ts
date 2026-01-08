import { GoogleGenAI } from "@google/genai";

/**
 * Recognizes utility meter readings from an image using Gemini 3 Flash.
 * This model is optimized for high-speed, accurate visual recognition.
 */
export const recognizeMeterReading = async (base64Image: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Remove the data:image/xxx;base64, prefix if present
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
              text: 'Extract the numerical reading from this utility meter image. Return only the number. If there are multiple meters, return the primary one. If no clear number is found, return an empty string. Ignore non-digit symbols except for the decimal point.',
            },
          ],
        },
      ],
      config: {
        temperature: 0.1, // Low temperature for high precision
      },
    });

    const resultText = response.text || "";
    // Sanitize the result to ensure it's just a number string
    const sanitized = resultText.trim().replace(/[^\d.]/g, '');
    
    return sanitized;
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    return "";
  }
};