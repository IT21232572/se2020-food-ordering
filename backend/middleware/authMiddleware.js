const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Get token from the header
  const token = req.header('Authorization');

  // Check if no token exists
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // The token usually comes as "Bearer <token>". We split it to get just the token string.
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    
    // Add user from payload
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};