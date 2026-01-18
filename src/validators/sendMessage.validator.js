import { z } from 'zod';

// Phone number validation (accepts various formats)
const phoneSchema = z.string().regex(/^\d{10,15}$/, 'Phone number must be 10-15 digits');

// Image from URL
const imageUrlSchema = z.object({
  source: z.literal('url'),
  url: z.string().url('Invalid image URL'),
});

// Image from base64
const imageBase64Schema = z.object({
  source: z.literal('base64'),
  data: z.string().min(1, 'Base64 data is required'),
  mimetype: z.string().regex(/^image\//, 'Mimetype must be an image type'),
  filename: z.string().optional(),
});

// Audio from URL
const audioUrlSchema = z.object({
  source: z.literal('url'),
  url: z.string().url('Invalid audio URL'),
});

// Audio from base64
const audioBase64Schema = z.object({
  source: z.literal('base64'),
  data: z.string().min(1, 'Base64 data is required'),
  mimetype: z.string().regex(/^audio\//, 'Mimetype must be an audio type'),
  filename: z.string().optional(),
});

// Text message payload
const textMessageSchema = z.object({
  to: phoneSchema,
  type: z.literal('text'),
  text: z.string().min(1, 'Message text is required'),
});

// Image message payload
const imageMessageSchema = z.object({
  to: phoneSchema,
  type: z.literal('image'),
  caption: z.string().optional(),
  image: z.union([imageUrlSchema, imageBase64Schema]),
});

// Audio message payload
const audioMessageSchema = z.object({
  to: phoneSchema,
  type: z.literal('audio'),
  audio: z.union([audioUrlSchema, audioBase64Schema]),
  asPtt: z.boolean().optional().default(true),
});

// Combined message schema
export const sendMessageSchema = z.discriminatedUnion('type', [
  textMessageSchema,
  imageMessageSchema,
  audioMessageSchema,
]);

// Validate message payload
export function validateSendMessage(payload) {
  const result = sendMessageSchema.safeParse(payload);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return { valid: false, errors };
  }

  return { valid: true, data: result.data };
}
