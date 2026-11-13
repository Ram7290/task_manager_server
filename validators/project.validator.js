const { z } = require('zod');

const createProjectSchema = {
  body: z.object({
    name: z.string().min(1, 'Project name is required').max(255),
    description: z.string().optional(),
    status: z.enum(['PLANNING', 'ACTIVE', 'COMPLETED', 'ON_HOLD']).default('ACTIVE'),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    member_ids: z.array(z.string().uuid()).optional(),
  }),
};

const updateProjectSchema = {
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    status: z.enum(['PLANNING', 'ACTIVE', 'COMPLETED', 'ON_HOLD']).optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  }),
};

const addProjectMemberSchema = {
  body: z.object({
    employee_id: z.string().uuid('Valid employee ID is required'),
  }),
};

module.exports = {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
};
