import { z } from 'zod';

// Form schema for Border Bridge Intake Process
// This schema defines the structure for the multi-step form
// Used for frontend state management and validation

export const intakeFormSchema = z.object({
  // Section 1: Core Identity (The QR Data)
  // Basic personal information that will be encoded in the QR code
  fullName: z.string().min(1, 'Full name is required'), // Required: Primary name for identification
  nativeScriptNames: z.string().optional(), // Optional: Original language spelling for cultural accuracy
  dateOfBirth: z.string().optional(), // Date or estimated age for age verification
  gender: z.enum(['Male', 'Female', 'Non-binary', 'Prefer not to say']), // Gender selection for demographic tracking
  nationality: z.string().min(1, 'Nationality is required'), // Country of origin for refugee status
  preferredLanguage: z.string().min(1, 'Preferred Language is required'), // Language preference for communication (i18n ready)

  // Section 2: The Narrative (AI Input)
  // Voice-recorded story for AI processing
  voiceNarrative: z.string().optional(), // Large text area for speech-to-text transcription
  translatedNarrative: z.string().optional(), // The English translation of the story

  // Section 3: Family & Relationships (The Matching Logic)
  // Information for family reunification and matching
  isTravelingAlone: z.boolean().default(false), // Toggle: Whether traveling without family
  familyMembers: z.array(z.object({ value: z.string() })).default([]), // Dynamic array: Names of relatives present
  missingRelatives: z.array(z.object({ value: z.string() })).default([]), // Dynamic array: Names for matching search

  // Section 4: Service Tracking (The Anti-Redundancy Flags)
  // Flags for service prioritization and status tracking
  urgentNeeds: z.array(z.enum(['Medical', 'Food', 'Shelter', 'Legal', 'Protection'])).default([]), // Multi-select: Immediate needs
  initialScreeningStatus: z.boolean().default(true), // Boolean: Screening completion status
  vulnerabilityMarker: z.enum(['Low', 'Medium', 'High']).default('Low'), // Select: Vulnerability level (AI-updatable)
});