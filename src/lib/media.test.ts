import { describe, expect, it } from 'vitest';
import { MediaAnalysisSchema, quoteFieldsFromMedia } from './media';

const base = MediaAnalysisSchema.parse({
  summary: 'Review', cargoType: null, manufacturer: null, model: null, serialNumber: null, weightTonnes: null,
  dimensions: { lengthM: null, widthM: null, heightM: null }, readableMarkings: [], conditionObservations: [],
  securingObservations: [], recommendations: [], missingInformation: [], trailerSuggestion: null, confidence: 'low',
});

describe('cargo media extraction safeguards', () => {
  it('does not turn unreadable measurements into quote values', () => {
    expect(quoteFieldsFromMedia(base)).toEqual({});
  });
  it('applies only explicitly extracted positive cargo details', () => {
    const analysis = { ...base, cargoType: 'Transformer', weightTonnes: 64, dimensions: { lengthM: 7.2, widthM: 3.8, heightM: 4.1 } };
    expect(quoteFieldsFromMedia(analysis)).toEqual({ cargo: 'Transformer', weight: 64, length: 7.2, width: 3.8, height: 4.1 });
  });
});
