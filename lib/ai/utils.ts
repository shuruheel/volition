import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

/**
 * Generate a concise summary of content using GPT-4o-mini
 */
export async function generateSummary(
  content: string,
  context?: string
): Promise<string> {
  try {
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: `Summarize the following content concisely:\n\n${context ? `Context: ${context}\n\n` : ''}${content}`,
      temperature: 0.3,
    });
    
    return result.text;
  } catch (error) {
    console.error('Summary generation error:', error);
    throw error;
  }
}

/**
 * Extract structured data from text using GPT-4o
 */
export async function extractStructuredData<T>(
  text: string,
  schema: any,
  instructions?: string
): Promise<T> {
  try {
    const result = await generateText({
      model: openai('gpt-4o'),
      prompt: `${instructions || 'Extract structured data from the following text:'}\n\n${text}`,
      temperature: 0,
    });
    
    // Parse the result as JSON
    return JSON.parse(result.text) as T;
  } catch (error) {
    console.error('Structured data extraction error:', error);
    throw error;
  }
}

