import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output } from "ai";
import { z } from "zod";

export const ReadinessSchema = z.object({
  status: z.enum(["ready", "needs_info", "blocked"]),
  summary: z.string(),
  missing: z.array(z.object({ field: z.string(), why: z.string() })),
  risks: z.array(z.string()),
});
export type Readiness = z.infer<typeof ReadinessSchema>;

const INSTRUCTIONS = `You are a dispatch readiness officer for SGM Global Line Logistics (UAE heavy-lift).
Review the dispatcher's shipment details, cargo specs and notes. Write a short plain-language readiness summary (3-5 sentences, no jargon).
Flag missing or unclear information needed to dispatch in the UAE: origin/destination, pickup date/time, cargo weight, dimensions (L/W/H),
consignee, container/BL number, Dubai Trade e-Token for Jebel Ali Gate 4, RTA Right-of-Way permit if over 60t / 3.5m wide / 4.0m high
(oversize moves only 00:00-06:00), Abu Dhabi DoT permit if going to Abu Dhabi, JAFZA/Dubai Customs manifest, escort, hazardous class.
status: "ready" if nothing material is missing, "needs_info" if details are missing, "blocked" if a rule is clearly violated. Never invent values.`;

export async function assessReadiness(input: { shipment: string; cargo: string; notes: string }) {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new Error("AI is not configured.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: INSTRUCTIONS,
    messages: [{ role: "user", content: `SHIPMENT DETAILS:\n${input.shipment}\n\nCARGO SPECIFICATIONS:\n${input.cargo}\n\nTRANSPORT NOTES:\n${input.notes}` }],
    output: Output.object({ schema: ReadinessSchema }),
    maxRetries: 0,
    providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", store: false, include: ["reasoning.encrypted_content"] } },
  });
  return (await result.output) as Readiness;
}
