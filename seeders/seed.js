const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
  Department,
  ManagerEmployeeAccess,
  Project,
  ProjectMember,
  Task,
  TaskAssignee,
  TaskStatusHistory,
  WorklogCategory,
  DailyReport,
  DailyWorklog,
  CompanyOffDay,
  AttendanceException,
} = require('../models');

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database. Syncing tables...');
    await sequelize.sync({ force: true });
    console.log('Tables synced.');

    // 1. Seed Categories
    console.log('Seeding Worklog Categories...');
    const categories = await WorklogCategory.bulkCreate([
      { name: 'Development', description: 'Software engineering, feature coding, bug fixing' },
      { name: 'Testing', description: 'Manual testing, QA automation, test plans' },
      { name: 'Meeting', description: 'Daily standup, sprint planning, client calls' },
      { name: 'Support', description: 'Production incident response, client bug triage' },
      { name: 'Research', description: 'Architecture spikes, tech evaluation' },
      { name: 'Documentation', description: 'API docs, user guides, internal knowledge base' },
      { name: 'Code Review', description: 'Reviewing pull requests from peers' },
      { name: 'Other', description: 'Miscellaneous tasks' },
    ]);

    // 2. Seed Departments
    console.log('Seeding Departments...');
    const engineeringDept = await Department.create({
      name: 'Engineering',
      description: 'Software development, infrastructure, and QA',
    });
    const productDept = await Department.create({
      name: 'Product & Design',
      description: 'UI/UX design and product roadmap management',
    });

    // 3. Seed Users
    console.log('Seeding Users...');
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const managerPassword = await bcrypt.hash('Manager@123', 10);
    const employeePassword = await bcrypt.hash('Employee@123', 10);

    const admin = await User.create({
      first_name: 'System',
      last_name: 'Administrator',
      email: 'admin@company.com',
      password_hash: adminPassword,
      role: 'ADMIN',
      department_id: engineeringDept.id,
      is_active: true,
    });

    const manager = await User.create({
      first_name: 'Sarah',
      last_name: 'Connor',
      email: 'manager@company.com',
      password_hash: managerPassword,
      role: 'MANAGER',
      department_id: engineeringDept.id,
      is_active: true,
    });

    const employee1 = await User.create({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@company.com',
      password_hash: employeePassword,
      role: 'EMPLOYEE',
      department_id: engineeringDept.id,
      is_active: true,
    });

    const employee2 = await User.create({
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@company.com',
      password_hash: employeePassword,
      role: 'EMPLOYEE',
      department_id: engineeringDept.id,
      is_active: true,
    });

    // 4. Seed Manager-Employee Scope
    console.log('Seeding Manager-Employee Access Scope...');
    await ManagerEmployeeAccess.bulkCreate([
      { manager_id: manager.id, employee_id: employee1.id },
      { manager_id: manager.id, employee_id: employee2.id },
    ]);

    // 5. Seed Projects
    console.log('Seeding Projects...');
    const projectA = await Project.create({
      name: 'Alpha Enterprise Portal',
      description: 'Enterprise task management and worklog system',
      status: 'ACTIVE',
      start_date: '2026-11-01',
      end_date: '2026-12-31',
      created_by: manager.id,
    });

    const projectB = await Project.create({
      name: 'Mobile App v2',
      description: 'Next generation cross-platform mobile client',
      status: 'ACTIVE',
      start_date: '2026-11-10',
      end_date: '2027-02-28',
      created_by: manager.id,
    });

    await ProjectMember.bulkCreate([
      { project_id: projectA.id, employee_id: employee1.id, added_by: manager.id },
      { project_id: projectA.id, employee_id: employee2.id, added_by: manager.id },
      { project_id: projectB.id, employee_id: employee1.id, added_by: manager.id },
    ]);

    // 6. Seed Tasks & Multi-Assignees
    console.log('Seeding Tasks & Assignees...');
    const task1 = await Task.create({
      title: 'Implement REST Authentication & JWT Flow',
      description: 'Build backend token verification, password hashing, and user roles.',
      project_id: projectA.id,
      priority: 'HIGH',
      start_date: '2026-11-12',
      due_date: '2026-11-20',
      estimated_minutes: 240,
      created_by: manager.id,
    });

    const assignee1 = await TaskAssignee.create({
      task_id: task1.id,
      employee_id: employee1.id,
      assigned_by: manager.id,
      status: 'IN_PROGRESS',
    });

    await TaskStatusHistory.create({
      task_assignee_id: assignee1.id,
      old_status: 'TODO',
      new_status: 'IN_PROGRESS',
      changed_by: employee1.id,
      change_note: 'Started work on JWT middleware',
    });

    // Multi-assignee task
    const task2 = await Task.create({
      title: 'Responsive UI Design & Component System',
      description: 'Create reusable shadcn-styled buttons, modals, and navigation bar.',
      project_id: projectA.id,
      priority: 'MEDIUM',
      start_date: '2026-11-13',
      due_date: '2026-11-25',
      estimated_minutes: 360,
      created_by: manager.id,
    });

    const a2_1 = await TaskAssignee.create({
      task_id: task2.id,
      employee_id: employee1.id,
      assigned_by: manager.id,
      status: 'IN_PROGRESS',
    });

    const a2_2 = await TaskAssignee.create({
      task_id: task2.id,
      employee_id: employee2.id,
      assigned_by: manager.id,
      status: 'TODO',
    });

    // 7. Seed Sample Worklog Draft for John Doe (Today)
    const today = new Date().toISOString().split('T')[0];
    const draftReport = await DailyReport.create({
      employee_id: employee1.id,
      report_date: today,
      status: 'DRAFT',
    });

    const devCategory = categories.find(c => c.name === 'Development');
    const meetingCategory = categories.find(c => c.name === 'Meeting');

    await DailyWorklog.create({
      daily_report_id: draftReport.id,
      task_id: task1.id,
      task_assignee_id: assignee1.id,
      category_id: devCategory.id,
      project_id: projectA.id,
      description: 'Wrote token verification middleware and tests',
      duration_minutes: 90, // 1h 30m
    });

    await DailyWorklog.create({
      daily_report_id: draftReport.id,
      task_id: null, // unplanned entry
      task_assignee_id: null,
      category_id: meetingCategory.id,
      project_id: projectA.id,
      description: 'Daily team sync and sprint backlog discussion',
      duration_minutes: 30, // 30m
    });

    // 8. Seed Yesterday's Submitted Report for Jane Smith (Submitted)
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const testCategory = categories.find(c => c.name === 'Testing');

    const submittedReport = await DailyReport.create({
      employee_id: employee2.id,
      report_date: yesterday,
      status: 'SUBMITTED',
      submitted_at: new Date(Date.now() - 80000000),
    });

    await DailyWorklog.create({
      daily_report_id: submittedReport.id,
      task_id: null,
      task_assignee_id: null,
      category_id: testCategory.id,
      project_id: projectA.id,
      description: 'Executed manual regression tests for user profile endpoints',
      duration_minutes: 120, // 2h
    });

    await DailyWorklog.create({
      daily_report_id: submittedReport.id,
      task_id: null,
      task_assignee_id: null,
      category_id: devCategory.id,
      project_id: projectB.id,
      description: 'Investigated test automation frameworks',
      duration_minutes: 90, // 1.5h
    });

    // 9. Seed Company Off Days (Sundays this month + 2 Saturdays + 1 holiday)
    console.log('Seeding Company Off Days & Attendance...');

    const sundaysInMonth = (year, month) => {
      const days = [];
      const d = new Date(year, month - 1, 1);
      while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
      while (d.getMonth() === month - 1) {
        days.push(d.toISOString().split('T')[0]);
        d.setDate(d.getDate() + 7);
      }
      return days;
    };

    const now = new Date();
    const yr = now.getFullYear();
    const mo = now.getMonth() + 1;

    const sundayEntries = sundaysInMonth(yr, mo).map(date => ({
      date, type: 'SUNDAY', reason: 'Weekly off', created_by: admin.id,
    }));

    // Find 1st and 3rd Saturday of this month
    const satEntries = (() => {
      const sats = [];
      const d = new Date(yr, mo - 1, 1);
      while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
      if (d.getMonth() === mo - 1) {
        sats.push({ date: d.toISOString().split('T')[0], type: 'SATURDAY', reason: '1st Saturday off', created_by: admin.id });
        const third = new Date(d); third.setDate(third.getDate() + 14);
        if (third.getMonth() === mo - 1) {
          sats.push({ date: third.toISOString().split('T')[0], type: 'SATURDAY', reason: '3rd Saturday off', created_by: admin.id });
        }
      }
      return sats;
    })();

    // Sample public holiday 10 days from now
    const holidayDate = new Date(); holidayDate.setDate(holidayDate.getDate() + 10);
    const holiday = { date: holidayDate.toISOString().split('T')[0], type: 'PUBLIC_HOLIDAY', reason: 'National Holiday', created_by: admin.id };

    await CompanyOffDay.bulkCreate([...sundayEntries, ...satEntries, holiday], { ignoreDuplicates: true });

    // 10. Seed sample attendance exceptions
    const yesterday2 = new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0];
    await AttendanceException.bulkCreate([
      { employee_id: employee1.id, date: yesterday2, type: 'ABSENT', reason: 'Unplanned absence (sample)', marked_by: admin.id },
      { employee_id: employee2.id, date: yesterday,  type: 'LEAVE',  reason: 'Medical leave (sample)',   marked_by: admin.id },
    ], { ignoreDuplicates: true });

    console.log('----------------------------------------------------');
    console.log('Seeding completed successfully!');
    console.log('Credentials:');
    console.log('  Admin:    admin@company.com     / Admin@123');
    console.log('  Manager:  manager@company.com   / Manager@123');
    console.log('  Employee: john.doe@company.com  / Employee@123');
    console.log('  Employee: jane.smith@company.com / Employee@123');
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seed();
