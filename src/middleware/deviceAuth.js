function deviceAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: 'Missing device authorization.',
    });
  }

  const [type, token] = authHeader.split(' ');

  if (
    type !== 'Bearer' ||
    !token ||
    token !== process.env.DEVICE_API_KEY
  ) {
    return res.status(401).json({
      message: 'Invalid device API key.',
    });
  }

  next();
}

module.exports = deviceAuth;