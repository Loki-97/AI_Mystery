import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const cookie = (req.headers.cookie || '').split(';').map(part=>part.trim()).find(part=>part.startsWith('casefile_session='));
    const token = cookie ? decodeURIComponent(cookie.slice('casefile_session='.length)) : header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Sign in to access this case.', error: { code: 'UNAUTHORIZED' } });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub).select('_id name email');
    if (!user) return res.status(401).json({ success: false, message: 'Your session is no longer valid.', error: { code: 'UNAUTHORIZED' } });
    req.user = user;
    next();
  } catch { return res.status(401).json({ success: false, message: 'Your session is no longer valid.', error: { code: 'UNAUTHORIZED' } }); }
}
