function authorizeRoles(...allowedRoles) {

  return async (request, reply) => {

    if (!request.user) {
      return reply.code(401).send({
        success: false,
        message: "Authentication required"
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.code(403).send({
        success: false,
        message: "You do not have permission to access this resource"
      });
    }

  };

}

module.exports = authorizeRoles;