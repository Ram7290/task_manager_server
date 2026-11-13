const { z } = require('zod');

const addWorklogEntrySchema = {
  body: z.object({
    category_id: z.string().uuid('Valid category is required'),
    description: z.string().min(3, 'Work description must be at least 3 characters'),
    duration_minutes: z.number().int().min(30, 'Duration must be at least 30 minutes').refine(
      (val) => val % 30 === 0,
      { message: 'Duration must be a multiple of 30 minutes (30, 60, 90, 120...)' }
    ),
    task_id: z.string().uuid().nullable().optional(),
    project_id: z.string().uuid().nullable().optional(),
  }),
};

const updateWorklogEntrySchema = {
  body: z.object({
    category_id: z.string().uuid().optional(),
    description: z.string().min(3).optional(),
    duration_minutes: z.number().int().min(30).refine(
      (val) => val % 30 === 0,
      { message: 'Duration must be a multiple of 30 minutes' }
    ).optional(),
    task_id: z.string().uuid().nullable().optional(),
    project_id: z.string().uuid().nullable().optional(),
  }),
};

const reportCorrectionSchema = {
  body: z.object({
    reason: z.string().min(5, 'Correction reason must be at least 5 characters and clearly state the justification'),
    entries: z.array(z.object({
      id: z.string().uuid().optional(),
      category_id: z.string().uuid(),
      description: z.string().min(3),
      duration_minutes: z.number().int().min(30).refine((v) => v % 30 === 0),
      task_id: z.string().uuid().nullable().optional(),
      project_id: z.string().uuid().nullable().optional(),
    })).min(1, 'At least one worklog entry must be present'),
  }),
};

module.exports = {
  addWorklogEntrySchema,
  updateWorklogEntrySchema,
  reportCorrectionSchema,
};
