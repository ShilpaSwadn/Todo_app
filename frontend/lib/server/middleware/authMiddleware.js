import jwt from 'jsonwebtoken'

// Next.js API route authentication middleware
export const authenticate = (handler) => {
  return async (req, res) => {
    try {
      // Get token from header
      const authHeader = req.headers.authorization
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'No token provided. Access denied.'
        })
      }

      const token = authHeader.substring(7) // Remove 'Bearer ' prefix

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      
      // Add userId to request object
      req.userId = decoded.userId
      
      // Call the handler with authenticated request
      return handler(req, res)
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        })
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        })
      }
      return res.status(500).json({
        success: false,
        message: 'Token verification failed'
      })
    }
  }
}

// Helper function to get userId from token (for use in Next.js API routes)
// Next.js uses Web API Request object, not Express req
export const getUserIdFromToken = (request) => {
  try {
    // Next.js Request object uses headers.get() method
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return decoded.userId
  } catch (error) {
    return null
  }
}
