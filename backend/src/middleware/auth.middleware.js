const jwt = require("jsonwebtoken");

async function authenticate(request, reply) {

  try {

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.code(401).send({
        success: false,
        message: "Authorization token is required"
      });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return reply.code(401).send({
        success: false,
        message: "Invalid authorization format"
      });
    }

    const token = parts[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    request.user = decoded;

  } catch (error) {

    return reply.code(401).send({
      success: false,
      message: "Invalid or expired token"
    });

  }
}

module.exports = authenticate;