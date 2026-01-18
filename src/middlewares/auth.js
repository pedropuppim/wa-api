// Session-based authentication middleware for dashboard routes

export function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }

  // For AJAX requests, return 401
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // For browser requests, redirect to login
  return res.redirect('/login');
}
