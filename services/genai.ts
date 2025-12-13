// OCR Service disabled - Gemini API integration reverted

export const recognizeMeterReading = async (base64Image: string): Promise<string> => {
  // Simulate a short delay to mimic processing
  await new Promise(resolve => setTimeout(resolve, 800));
  
  console.log("OCR functionality is currently disabled.");
  
  // Return empty string to indicate no value found
  return "";
};