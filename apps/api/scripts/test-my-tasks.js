/**
 * API test case: My Tasks returns only tasks assigned to the logged-in user.
 * Requires API running on localhost:4000 and tester@orbito.dev seeded.
 */
const API = process.env.API_URL || 'http://localhost:4000/api';

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log('TEST My Tasks — assignee isolation\n');

  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'tester@orbito.dev',
      password: 'password123',
    }),
  });
  assert(login.status === 200, `Login failed (${login.status}): ${JSON.stringify(login.body)}`);
  assert(login.body.accessToken, 'Missing access token');
  assert(login.body.workspaces?.length > 0, 'Tester has no workspace');

  const token = login.body.accessToken;
  const workspaceId = login.body.workspaces[0].id;
  const userId = login.body.user.id;

  const mine = await request(`/tasks/mine?workspaceId=${workspaceId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(mine.status === 200, `GET /tasks/mine failed (${mine.status})`);
  assert(Array.isArray(mine.body), 'Response is not an array');
  assert(mine.body.length > 0, 'Expected at least one assigned task');

  for (const task of mine.body) {
    assert(
      task.assignee?.id === userId || task.assigneeId === userId,
      `Task "${task.title}" is not assigned to tester`
    );
  }

  console.log('PASS login as tester@orbito.dev');
  console.log(`PASS /tasks/mine returned ${mine.body.length} task(s)`);
  console.log('PASS every task is assigned to the signed-in user');
  console.log('\nAll My Tasks checks passed.');
}

main().catch((err) => {
  console.error('\nFAIL', err.message);
  process.exit(1);
});
