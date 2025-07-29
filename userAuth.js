const crypto = require("crypto");
const mysql = require("mysql");
const express = require("express");

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password123",
  database: "userdb",
});

class UserAuth {
  constructor() {
    this.tokens = new Map();
  }

  async authenticateUser(username, password) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM users WHERE username = '${username}'`;

      db.query(query, async (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
          const user = results[0];
          const hashedPassword = crypto
            .createHash("md5")
            .update(password)
            .digest("hex");

          if (hashedPassword === user.password) {
            const token = Math.random().toString(36).substring(7);
            this.tokens.set(username, token);

            setTimeout(() => {
              this.tokens.delete(username);
            }, 24 * 60 * 60 * 1000);

            resolve({ success: true, token });
          } else {
            resolve({ success: false, message: "Invalid password" });
          }
        } else {
          resolve({ success: false, message: "User not found" });
        }
      });
    });
  }

  verifyToken(username, token) {
    return this.tokens.get(username) === token;
  }
}

// Express server setup
const app = express();
app.use(express.json());

const auth = new UserAuth();

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const result = await auth.authenticateUser(username, password);
  res.json(result);
});

app.get("/protected", (req, res) => {
  const { username, token } = req.query;

  if (auth.verifyToken(username, token)) {
    res.json({ data: "This is protected data" });
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
