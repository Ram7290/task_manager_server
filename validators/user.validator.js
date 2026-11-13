const { z } = require('zod');

const createUserSchema = {
  body: z.object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
    department_id: z.string().uuid().nullable().optional(),
  }),
};

const updateUserSchema = {
  body: z.object({
    first_name: z.string().min(1).optional(),
    last_name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
    department_id: z.string().uuid().nullable().optional(),
    is_active: z.boolean().optional(),
  }),
};

const setManagerTeamSchema = {
  body: z.object({
    employee_ids: z.array(z.string().uuid()),
  }),
};

const createDepartmentSchema = {
  body: z.object({
    name: z.string().min(2, 'Department name is required'),
    description: z.string().optional(),
  }),
};

module.exports = {
  createUserSchema,
  updateUserSchema,
  setManagerTeamSchema,
  createDepartmentSchema,
};
