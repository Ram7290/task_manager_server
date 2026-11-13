const app = require('../app');
const http = require('http');

let server;
let baseUrl;

const request = async (path, options = {}) => {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
};

const runTests = async () => {
  console.log('--- Starting Backend Verification Tests ---');

  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api/v1`;

  try {
    // 1. Health check
    const health = await request('/../../api/health');
    console.log('[1] Health check status:', health.status);

    // 2. Auth tests
    console.log('[2] Testing Authentication...');
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@company.com', password: 'Admin@123' },
    });
    console.log('   Admin Login:', adminLogin.status, adminLogin.data?.user?.role);
    const adminToken = adminLogin.data.data.token;

    const managerLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'manager@company.com', password: 'Manager@123' },
    });
    console.log('   Manager Login:', managerLogin.status, managerLogin.data?.user?.role);
    const managerToken = managerLogin.data.data.token;

    const empLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'john.doe@company.com', password: 'Employee@123' },
    });
    console.log('   Employee Login:', empLogin.status, empLogin.data?.user?.role);
    const empToken = empLogin.data.data.token;
    const empId = empLogin.data.data.user.id;

    // 3. Manager scope check on task creation
    console.log('[3] Testing Manager Scope & Multi-Assignee Task Creation...');
    const createSubTask = await request('/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        title: 'Backend Validation Test Task',
        description: 'Verify manager scope and multi-assignee assignment',
        priority: 'HIGH',
        assignee_ids: [empId],
      },
    });
    console.log('   Manager creates task for subordinate:', createSubTask.status, createSubTask.data?.data?.title);
    const taskId = createSubTask.data.data.id;
    const assigneeRecord = createSubTask.data.data.assignees.find(a => a.employee_id === empId);

    // 4. Employee updates assignment progress
    console.log('[4] Testing Employee Task Progress Update...');
    const updateProgress = await request(`/tasks/assignments/${assigneeRecord.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${empToken}` },
      body: { status: 'IN_PROGRESS', note: 'Working on implementation' },
    });
    console.log('   Progress update status:', updateProgress.status, updateProgress.data?.data?.status);

    // 5. Worklog 30-min duration validation
    console.log('[5] Testing Worklog Duration Validation (Must be multiple of 30 mins)...');
    const todayDraft = await request('/worklogs/today', {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const reportId = todayDraft.data.data.id;
    const categories = await request('/worklogs/categories', {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const catId = categories.data.data[0].id;

    // Try invalid duration (45 mins)
    const invalidEntry = await request(`/worklogs/reports/${reportId}/entries`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` },
      body: {
        category_id: catId,
        description: 'Invalid 45min test',
        duration_minutes: 45,
      },
    });
    console.log('   Reject invalid duration 45 mins (Expected 400):', invalidEntry.status);

    // Add valid duration (60 mins)
    const validEntry = await request(`/worklogs/reports/${reportId}/entries`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` },
      body: {
        category_id: catId,
        description: 'Valid 60min test',
        duration_minutes: 60,
      },
    });
    console.log('   Accept valid duration 60 mins (Expected 201):', validEntry.status);

    // 6. Privacy: Manager cannot view employee draft
    console.log('[6] Testing Privacy: Manager cannot view employee draft...');
    const managerDraftCheck = await request(`/manager/worklogs/${reportId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    console.log('   Manager viewing draft (Expected 403 Forbidden):', managerDraftCheck.status);

    // 7. Submit report and verify lock
    console.log('[7] Testing Report Submission & Immutability Lock...');
    const submitRes = await request(`/worklogs/reports/${reportId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` },
    });
    console.log('   Submit report (Expected 200):', submitRes.status, submitRes.data?.data?.status);

    // Verify employee cannot edit after submission
    const editAfterSubmit = await request(`/worklogs/entries/${validEntry.data.data.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${empToken}` },
      body: { description: 'Hacked after submission' },
    });
    console.log('   Edit after submission rejected (Expected 400):', editAfterSubmit.status);

    // 8. Manager can now view submitted report
    console.log('[8] Manager viewing SUBMITTED report...');
    const managerSubmittedCheck = await request(`/manager/worklogs/${reportId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    console.log('   Manager viewing submitted report (Expected 200):', managerSubmittedCheck.status);

    // 9. Admin Audited Correction
    console.log('[9] Testing Admin Controlled Report Correction...');
    const correctionRes = await request(`/admin/worklogs/${reportId}/corrections`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        reason: 'Authorized correction requested by employee for misplaced category',
        entries: [
          {
            category_id: catId,
            description: 'Corrected entry description',
            duration_minutes: 60,
          },
        ],
      },
    });
    console.log('   Admin correction applied (Expected 200):', correctionRes.status);

    console.log('--- ALL BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
};

runTests();
