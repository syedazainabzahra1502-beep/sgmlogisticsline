import { z } from 'zod';

const nullableText = z.string().nullable();
const nullableMeasurement = z.number().positive().nullable();

/** Only explicit, readable data may populate measurements. Visual estimates stay out of quote fields. */
export const MediaAnalysisSchema = z.object({
  summary: z.string(),
  cargoType: nullableText,
  manufacturer: nullableText,
  model: nullableText,
  serialNumber: nullableText,
  weightTonnes: nullableMeasurement,
  dimensions: z.object({ lengthM: nullableMeasurement, widthM: nullableMeasurement, heightM: nullableMeasurement }),
  readableMarkings: z.array(z.string()),
  conditionObservations: z.array(z.string()),
  securingObservations: z.array(z.string()),
  recommendations: z.array(z.string()),
  missingInformation: z.array(z.string()),
  trailerSuggestion: nullableText,
  confidence: z.enum(['low', 'medium', 'high']),
});
export type MediaAnalysis = z.infer<typeof MediaAnalysisSchema>;

export function quoteFieldsFromMedia(a: MediaAnalysis) {
  return {
    ...(a.cargoType?.trim() ? { cargo: a.cargoType.trim() } : {}),
    ...(a.weightTonnes ? { weight: a.weightTonnes } : {}),
    ...(a.dimensions.lengthM ? { length: a.dimensions.lengthM } : {}),
    ...(a.dimensions.widthM ? { width: a.dimensions.widthM } : {}),
    ...(a.dimensions.heightM ? { height: a.dimensions.heightM } : {}),
  };
}
