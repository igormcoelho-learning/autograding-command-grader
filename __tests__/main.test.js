const process = require('process');
const cp = require('child_process');
const path = require('path');

const np = process.execPath;
const ip = path.join(__dirname, '..', 'src', 'main.js');
const options = {
    env: process.env,
    encoding: 'utf-8'
};

test('test runs', () => {
    process.env['INPUT_TEST-NAME'] = 'Test 1';
    process.env['INPUT_COMMAND'] = 'echo Hello, World!';
    process.env['INPUT_TIMEOUT'] = '5'; //minutes
    const child = cp.spawnSync(np, [ip], options);
    const stdout = child.stdout.toString();
    const encodedResult = stdout.split('::set-output name=result::')[1].trim();

    const result = JSON.parse(atob(encodedResult));

    // Asserting on specific properties of the result
    expect(result.status).toBe('pass');
    expect(result.tests[0].name).toBe('Test 1');
    expect(result.tests[0].status).toBe('pass');
    expect(result.tests[0].message).toContain('Hello, World!\n');
});

test('awards score if provided', () => {
    process.env['INPUT_TEST-NAME'] = 'Test 1';
    process.env['INPUT_COMMAND'] = 'echo Hello, World!';
    process.env['INPUT_TIMEOUT'] = '5'; //minutes
    process.env['INPUT_MAX-SCORE'] = '100';
    const child = cp.spawnSync(np, [ip], options);
    const stdout = child.stdout.toString();
    const encodedResult = stdout.split('::set-output name=result::')[1].trim();

    const result = JSON.parse(atob(encodedResult));

    expect(result.max_score).toBe(100);
    expect(result.tests[0].score).toBe(100);
});

test('falls back to 0 points if none provided', () => {
    process.env['INPUT_TEST-NAME'] = 'Test 1';
    process.env['INPUT_COMMAND'] = 'echo Hello, World!';
    process.env['INPUT_TIMEOUT'] = '5'; //minutes
    const child = cp.spawnSync(np, [ip], options);
    const stdout = child.stdout.toString();
    const encodedResult = stdout.split('::set-output name=result::')[1].trim();

    const result = JSON.parse(atob(encodedResult));

    expect(result.max_score).toBe(0);
    expect(result.tests[0].score).toBe(0);
});

test('test fails on bad logic', () => {
    process.env['INPUT_TEST-NAME'] = 'Test 2';
    process.env['INPUT_COMMAND'] = 'node -e "process.exit(1);"';
    process.env['INPUT_TIMEOUT'] = '5'; //minutes
    const child = cp.spawnSync(np, [ip], options);
    const stdout = child.stdout.toString();
    const encodedResult = stdout.split('::set-output name=result::')[1].trim();
    const result = JSON.parse(atob(encodedResult));

    expect(result.status).toBe('fail');
    expect(result.tests[0].name).toBe('Test 2');
    expect(result.tests[0].status).toBe('fail');
    expect(result.tests[0].message).toContain('failed with exit code 1');
});

test('awards no points if test fails', () => {
    process.env['INPUT_TEST-NAME'] = 'Test 2';
    process.env['INPUT_COMMAND'] = 'node -e "process.exit(1);"';
    process.env['INPUT_TIMEOUT'] = '5'; //minutes
    process.env['INPUT_MAX-SCORE'] = '100';
    const child = cp.spawnSync(np, [ip], options);
    const stdout = child.stdout.toString();
    const encodedResult = stdout.split('::set-output name=result::')[1].trim();
    const result = JSON.parse(atob(encodedResult));

    expect(result.max_score).toBe(100);
    expect(result.tests[0].score).toBe(0);
});

test('test fails on bad code', () => {
    process.env['INPUT_TEST-NAME'] = 'Test 3';
    process.env['INPUT_COMMAND'] = 'node -e "console.log(a);"';
    process.env['INPUT_TIMEOUT'] = '5'; //minutes
    const child = cp.spawnSync(np, [ip], options);
    const stdout = child.stdout.toString();
    const encodedResult = stdout.split('::set-output name=result::')[1].trim();
    const result = JSON.parse(atob(encodedResult));

    // Asserting on specific properties of the result
    expect(result.status).toBe('fail');
    expect(result.tests[0].name).toBe('Test 3');
    expect(result.tests[0].status).toBe('fail');
    expect(result.tests[0].message).toContain('failed with exit code 1');
});

test('test fails on non-existent executable', () => {
    process.env['INPUT_TEST-NAME'] = 'Test 4';
    process.env['INPUT_COMMAND'] = 'nonexistentcommand';
    process.env['INPUT_TIMEOUT'] = '5'; //minutes
    const child = cp.spawnSync(np, [ip], options);
    const stdout = child.stdout.toString();
    const encodedResult = stdout.split('::set-output name=result::')[1].trim();
    const result = JSON.parse(atob(encodedResult));

    expect(result.status).toBe('fail');
    expect(result.tests[0].name).toBe('Test 4');
    expect(result.tests[0].status).toBe('fail');
    expect(result.tests[0].message).toContain('Unable to locate executable file: nonexistentcommand');
});

test('test fails on command timeout', () => {
    process.env['INPUT_TEST-NAME'] = 'Timeout Test';
    process.env['INPUT_COMMAND'] = 'sleep 3';
    process.env['INPUT_TIMEOUT'] = '0.01'; // ~ 1 second
    const child = cp.spawnSync(np, [ip], options);
    const stdout = child.stdout.toString();
    const encodedResult = stdout.split('::set-output name=result::')[1].trim();
    const result = JSON.parse(atob(encodedResult));

    expect(result.status).toBe('fail');
    expect(result.tests[0].name).toBe('Timeout Test');
    expect(result.tests[0].status).toBe('fail');
    expect(result.tests[0].message).toContain('Command timed out');
});

test('test passes when command completes before timeout', () => {
    process.env['INPUT_TEST-NAME'] = 'Timeout Success Test';
    process.env['INPUT_COMMAND'] = 'sleep 2';
    process.env['INPUT_TIMEOUT'] = '5'; //minutes
    const child = cp.spawnSync(np, [ip], options);
    const stdout = child.stdout.toString();
    const encodedResult = stdout.split('::set-output name=result::')[1].trim();
    const result = JSON.parse(atob(encodedResult));

    expect(result.status).toBe('pass');
    expect(result.tests[0].name).toBe('Timeout Success Test');
    expect(result.tests[0].status).toBe('pass');
});

test('test fails on setup command timeout', () => {
    process.env['INPUT_TEST-NAME'] = 'Setup Timeout Test';
    process.env['INPUT_SETUP-COMMAND'] = 'sleep 3';
    process.env['INPUT_COMMAND'] = 'echo Hello, World!';
    process.env['INPUT_TIMEOUT'] = '0.01'; // ~ 1 second
    const child = cp.spawnSync(np, [ip], options);
    const stdout = child.stdout.toString();
    const encodedResult = stdout.split('::set-output name=result::')[1].trim();
    const result = JSON.parse(atob(encodedResult));

    expect(result.status).toBe('fail');
    expect(result.tests[0].name).toBe('Setup Timeout Test');
    expect(result.tests[0].status).toBe('fail');
    expect(result.tests[0].message).toContain('Command timed out');
});

function atob(str) {
    return Buffer.from(str, 'base64').toString('utf8');
}
