import assert from 'node:assert/strict';
import { test } from 'node:test';

// Test response handling without making paid network requests.
process.env.GEMINI_API_KEY = 'test-only';
const { ai, analyzeAccessibilityHazard } = await import('../server/geminiService');
const input = { imagePart: { mimeType: 'image/png', data: 'actual-image-bytes' } };
let response: unknown;
let calls = 0;
ai.models.generateContent = async (request: any) => {
  calls++;
  assert.equal(request.contents.parts[0].inlineData.data, input.imagePart.data);
  if (response instanceof Error) throw response;
  return { text: JSON.stringify(response) } as any;
};

const base = { imageClarity: 'clear', hazardType: 'none', severity: 'low',
  summary: 'An empty paved path.', confidence: 0.92, hazards: [] };

test('image results use visible evidence and failures never create fallback hazards', async () => {
  response = base;
  const clear = await analyzeAccessibilityHazard(input);
  assert.equal(clear.hazardType, 'none');
  assert.deepEqual(clear.hazards, []);
  assert.equal(clear.alternativeRoute, '');
  assert.equal(clear.maximumSlope, '');
  assert.equal(clear.buildingId, '');

  response = { ...base, imageClarity: 'unclear', hazardType: 'pothole' };
  const unclear = await analyzeAccessibilityHazard(input);
  assert.equal(unclear.summary, 'The image is unclear.');
  assert.equal(unclear.hazardType, 'unclear');
  assert.deepEqual(unclear.hazards, []);
  assert.equal(unclear.confidence, 0);

  response = { ...base, hazardType: 'blocked_walkway', summary: 'A bin blocks the path.',
    hazards: [{ hazardType: 'blocked_walkway', severity: 'medium',
      summary: 'A bin blocks the path.', confidence: 0.8 }] };
  const hazard = await analyzeAccessibilityHazard(input);
  assert.equal(hazard.hazards[0].summary, 'A bin blocks the path.');

  response = {};
  await assert.rejects(analyzeAccessibilityHazard(input), /incomplete/);
  response = new Error('Network unavailable');
  await assert.rejects(analyzeAccessibilityHazard(input), /High Demand \/ Service Busy/);
  assert.equal(calls, 5); // Each new image analysis makes its own model call.
  await assert.rejects(analyzeAccessibilityHazard({}), /uploaded image is required/);
});
