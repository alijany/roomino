/**
 * Mints a JWT for one of the seeded test users, so the suites can call the API
 * as four different roles without going through the OTP flow.
 *
 * Usage: node mint-token.js <userId> <phone> <isAdmin> > /tmp/t_emp
 *
 * JWT_SECRET must match the running API's. There is no shortcut here on
 * purpose — this only works against a dev instance whose secret you already
 * have.
 */
const path = require('path');
const jwt = require(require.resolve('jsonwebtoken', {
  paths: [path.resolve(__dirname, '../../apps/core-api')],
}));

const [id, phone, isAdmin] = process.argv.slice(2);
const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error('JWT_SECRET is not set — export the dev API\'s secret first.');
  process.exit(1);
}

console.log(
  jwt.sign(
    { username: phone, sub: String(id), isAdmin: isAdmin === 'true' },
    secret,
    { expiresIn: '3h' },
  ),
);
