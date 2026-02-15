import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

/**
 * Authentication middleware
 * Expects Authorization header: "Bearer <token>"
 * Sets req.user with decoded user information
 * Verifies JWT token and sets user in request
 */
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Missing authorization header',
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization header format',
      });
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    try {
      // Verify and decode JWT token
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        id: decoded.userId,
      };
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
}

export default authMiddleware;

