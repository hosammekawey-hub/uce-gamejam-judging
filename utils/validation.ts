
import { z } from 'zod';

// Schema for Creating an Event
export const CreateEventSchema = z.object({
  competitionId: z.string()
    .min(3, "Event ID must be at least 3 characters")
    .max(20, "Event ID must be under 20 characters")
    .regex(/^[a-z0-9-_]+$/, "Event ID can only contain lowercase letters, numbers, and dashes"),
  organizerPass: z.string().min(4, "Organizer Key must be at least 4 characters"),
  judgePass: z.string().min(3, "Judge Key must be at least 3 characters"),
});

// Schema for Contestant Entry
export const ContestantEntrySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  title: z.string().min(2, "Project title must be at least 2 characters"),
  description: z.string().optional(),
  thumbnail: z.string().url("Invalid image URL").or(z.literal('')).optional()
});

// Schema for Rating Submission
// We use a record for scores because keys are dynamic criterion IDs
export const RatingSubmissionSchema = z.object({
  teamId: z.string().min(1, "Team ID is required"),
  judgeId: z.string().min(1, "Judge ID is required"),
  feedback: z.string().max(1000, "Feedback must be under 1000 characters").optional(),
  isDisqualified: z.boolean(),
  scores: z.record(z.string(), z.number().min(1).max(10))
});
