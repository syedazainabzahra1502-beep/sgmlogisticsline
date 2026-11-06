import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output } from "ai";
import { z } from "zod";

const s = z.string().nullable();
export const PermitScanSchema = z.object({
  documentType: s, permitNumber: s, expiry: s, corridor: s, cargo: s,
  weightTonnes: z.number().nullable(), lengthM: z.number().nullable(), widthM: z.number().nullable(), heightM: z.number().nullable(),
  blOrContainer: s, eToken: s, customsRef: s, consignee: s, authority: s,
});
export const MulkiyaScanSchema = z.object({
  documentType: s, ownerOrHolder: s, plate: s, documentNumber: s, chassisVin: s, vehicleMake: s, tareKg: z.number().nullable(), expiry: s,
});
export type PermitScan = z.infer<typeof PermitScanSchema>;
export type MulkiyaScan = z.infer<typeof MulkiyaScanSchema>;

const PROMPTS = {
  permit: `Read this UAE logistics document (Dubai RTA ROW / heavy transport NOC, Abu Dhabi permit, DP World delivery order, bill of lading, Dubai Trade e-Token, customs declaration). Extract only values printed on it. Dates as YYYY-MM-DD. Use null for anything not visible. Never guess.`,
  mulkiya: `Read this UAE vehicle registration card (Mulkiya) or driver licence / port gate pass. Extract only printed values. Expiry as YYYY-MM-DD. Use null for anything not visible. Never guess.`,
};

export async function scanDocument(kind: "permit" | "mulkiya", file: string) {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new Error("AI is not configured.");
  const provider = createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
  const isPdf = file.startsWith("data:application/pdf");
  const part = isPdf
    ? { type: "file" as const, filename: "document.pdf", data: file.slice(file.indexOf(",") + 1), mediaType: "application/pdf" }
    : { type: "image" as const, image: new URL(file) };
  const schema = kind === "permit" ? PermitScanSchema : MulkiyaScanSchema;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: PROMPTS[kind],
    messages: [{ role: "user", content: [{ type: "text", text: "Extract the fields from this document." }, part] }],
    output: Output.object({ schema }),
    maxRetries: 0,
    providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", store: false, include: ["reasoning.encrypted_content"] } },
  });
  return (await result.output) as PermitScan | MulkiyaScan;
}
