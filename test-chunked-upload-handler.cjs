const assert = require('assert');
const { Readable } = require('stream');
const jobRoutes = require('./server/routes/jobRoutes.ts').default;

// Mock request and response objects
const mockRequest = (headers, body) => {
  const req = new Readable();
  req.headers = headers;
  req.body = body;
  req.params = { jobId: '123' };
  req.file = {
    buffer: Buffer.from('chunk'),
    originalname: 'test-file.txt',
    mimetype: 'text/plain',
    size: 5,
  };
  req._read = () => {};
  req.push(JSON.stringify(body));
  req.push(null);
  return req;
};

const mockResponse = () => {
  const res = {
    statusCode: 0,
    headers: {},
    body: null,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
    },
  };
  return res;
};

// Test cases
const runTests = async () => {
  // Test case 1: Single chunk upload
  let req = mockRequest(
    {
      'content-range': 'bytes 0-4/5',
      'x-file-name': 'test-file.txt',
    },
    {}
  );
  let res = mockResponse();
  await jobRoutes.stack.find(layer => layer.route.path === '/:jobId/upload-file-chunk').route.stack[0].handle(req, res, () => {});
  assert.strictEqual(res.statusCode, 200, 'Test Case 1 Failed: Status code should be 200');
  assert.ok(res.body.success, 'Test Case 1 Failed: Success should be true');

  console.log('All tests passed!');
};

runTests();
