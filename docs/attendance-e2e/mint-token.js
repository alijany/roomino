/**
 * Mints a JWT for a seeded persona, skipping the OTP flow.
 * Usage: JWT_SECRET=<dev secret> node mint-token.js <userId> <phone> > /tmp/at_1
 *
 * `jsonwebtoken` is resolved through @nestjs/jwt, which depends on it, so
 * this works with the API's installed packages and nothing else.
 */
const path = require('path');
const api = path.resolve(__dirname, '../../apps/core-api');
const nestJwt = require.resolve('@nestjs/jwt', { paths: [api] });
const jwt = require(require.resolve('jsonwebtoken', { paths: [nestJwt] }));

const [id, phone] = process.argv.slice(2);
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set — export the dev API\'s secret first.');
  process.exit(1);
}

console.log(
  jwt.sign({ username: phone, sub: String(id), isAdmin: false }, process.env.JWT_SECRET, {
    expiresIn: '3h',
  }),
);
