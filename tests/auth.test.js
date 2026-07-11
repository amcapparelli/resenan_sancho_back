 
process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const { verifyToken } = require('../lib/auth');

// verifyToken's jwt.verify runs its callback asynchronously, so let the
// event loop tick before asserting on next()/res.json().
const tick = () => new Promise((resolve) => setImmediate(resolve));

function mockRes() {
  return { json: jest.fn() };
}

describe('verifyToken middleware', () => {
  test('rejects a request with no token', async () => {
    const req = { cookies: {}, headers: {} };
    const res = mockRes();
    const next = jest.fn();

    verifyToken()(req, res, next);
    await tick();

    expect(res.json).toHaveBeenCalledWith({ message: 'authorizationFailed' });
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next and attaches authData for a valid token (cookie)', async () => {
    const token = jwt.sign({ user: { _id: 'u1', email: 'a@b.com' } }, process.env.JWT_SECRET);
    const req = { cookies: { token }, headers: {} };
    const res = mockRes();
    const next = jest.fn();

    verifyToken()(req, res, next);
    await tick();

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.json).not.toHaveBeenCalled();
    expect(req.authData.user._id).toBe('u1');
  });

  test('accepts the token from the access-token header', async () => {
    const token = jwt.sign({ user: { _id: 'u2' } }, process.env.JWT_SECRET);
    const req = { cookies: {}, headers: { 'access-token': token } };
    const res = mockRes();
    const next = jest.fn();

    verifyToken()(req, res, next);
    await tick();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.authData.user._id).toBe('u2');
  });

  test('rejects an invalid/forged token', async () => {
    const req = { cookies: { token: 'not-a-real-token' }, headers: {} };
    const res = mockRes();
    const next = jest.fn();

    verifyToken()(req, res, next);
    await tick();

    expect(res.json).toHaveBeenCalledWith({ message: 'unexpectedTokenFailure' });
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects a token signed with a non-HS256 algorithm (alg pinning)', async () => {
    // Same secret, but a different algorithm than verifyToken accepts.
    const token = jwt.sign({ user: { _id: 'u1' } }, process.env.JWT_SECRET, { algorithm: 'HS384' });
    const req = { cookies: { token }, headers: {} };
    const res = mockRes();
    const next = jest.fn();

    verifyToken()(req, res, next);
    await tick();

    expect(res.json).toHaveBeenCalledWith({ message: 'unexpectedTokenFailure' });
    expect(next).not.toHaveBeenCalled();
  });
});
