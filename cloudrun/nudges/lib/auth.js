/**
 * cloudrun/nudges/lib/auth.js
 * Firebase ID token verification middleware.
 * Attaches req.uid = uid on success.
 */
'use strict';

const { getAuth } = require('firebase-admin/auth');

module.exports = async function verifyToken(req, res, next) {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }
  const idToken = header.slice(7);
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    req.uid = decoded.uid;
    next();
  } catch (err) {
    console.warn('Token verification failed:', err.code);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
