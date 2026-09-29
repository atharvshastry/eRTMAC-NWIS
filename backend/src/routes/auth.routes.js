const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const pool = require("../config/db");

async function authRoutes(app) {

  // REGISTER
  app.post("/api/auth/register", async (request, reply) => {
    try {

      const { name, email, password, role } = request.body;

      // Check required fields
      if (!name || !email || !password) {
        return reply.code(400).send({
          success: false,
          message: "Name, email and password are required"
        });
      }

      // Check if user already exists
      const existingUser = await pool.query(
        `
        SELECT id
        FROM users
        WHERE email = $1
        `,
        [email]
      );

      if (existingUser.rows.length > 0) {
        return reply.code(409).send({
          success: false,
          message: "User with this email already exists"
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Allowed roles
      const allowedRoles = [
        "ADMIN",
        "ENGINEER",
        "VIEWER"
      ];

      const userRole = role && allowedRoles.includes(role)
        ? role
        : "VIEWER";

      // Insert user
      const result = await pool.query(
        `
        INSERT INTO users
        (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, role, created_at
        `,
        [
          name,
          email,
          passwordHash,
          userRole
        ]
      );

      return reply.code(201).send({
        success: true,
        message: "User registered successfully",
        user: result.rows[0]
      });

    } catch (error) {

      console.error(error);

      return reply.code(500).send({
        success: false,
        message: "Registration failed"
      });
    }
  });

    // LOGIN
  app.post("/api/auth/login", async (request, reply) => {
    try {

      const { email, password } = request.body;

      // Check required fields
      if (!email || !password) {
        return reply.code(400).send({
          success: false,
          message: "Email and password are required"
        });
      }

      // Find user
      const result = await pool.query(
        `
        SELECT
          id,
          name,
          email,
          password_hash,
          role
        FROM users
        WHERE email = $1
        `,
        [email]
      );

      if (result.rows.length === 0) {
        return reply.code(401).send({
          success: false,
          message: "Invalid email or password"
        });
      }

      const user = result.rows[0];

      // Compare password
      const passwordMatch = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!passwordMatch) {
        return reply.code(401).send({
          success: false,
          message: "Invalid email or password"
        });
      }

      // Create JWT
      const token = jwt.sign(
        {
          userId: user.id,
          role: user.role
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h"
        }
      );

      return {
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      };

    } catch (error) {

      console.error(error);

      return reply.code(500).send({
        success: false,
        message: "Login failed"
      });
    }
  });

}

module.exports = authRoutes;