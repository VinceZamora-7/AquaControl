import { apiPost } from './client';
import { ENV } from '../config/environment';
import { AIAnalysisResponse } from '../types/sensor';

export async function analyzeWaterQuality(
  question = 'Analyze the current water condition.'
): Promise<AIAnalysisResponse> {
  return apiPost<AIAnalysisResponse>(
    '/api/v1/ai/analyze',
    {
      device_id: ENV.DEVICE_ID,
      question,
    }
  );
}