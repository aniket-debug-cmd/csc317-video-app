import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";

const router = Router();
const studentName = "Aniket Soni";

function ensureAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}

router.get("/", (req, res) => {
  res.render("home", { title: "Home", helloMessage: `Hello World, I am ${studentName}` });
});

router.get("/login", (req, res) => res.render("login", { title: "Sign in" }));
router.get("/register", (req, res) => res.render("register", { title: "Create account" }));
router.get("/profile", ensureAuth, (req, res) => res.render("profile", { title: "Your profile" }));
router.get("/logout", (req, res) => { req.session.destroy(() => res.redirect("/")); });

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).render("register", { title: "Create account", error: "Please fill everything in." });
    if (username.length < 3 || username.length > 24)
      return res.status(400).render("register", { title: "Create account", error: "Username must be 3–24 chars." });
    if (password.length < 6)
      return res.status(400).render("register", { title: "Create account", error: "Password must be 6+ chars." });

    const [exists] = await pool.execute("SELECT id FROM users WHERE email = ? OR username = ?", [email, username]);
    if (exists.length)
      return res.status(409).render("register", { title: "Create account", error: "Email or username already in use." });

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
      [username, email, hash]
    );

    req.session.user = { id: result.insertId, username, email };
    res.redirect("/profile");
  } catch (e) {
    console.error(e);
    res.status(500).render("register", { title: "Create account", error: "Something went wrong. Try again." });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).render("login", { title: "Sign in", error: "Please enter email and password." });

    const [rows] = await pool.execute(
      "SELECT id, username, email, password_hash FROM users WHERE email = ?",
      [email]
    );
    if (!rows.length)
      return res.status(401).render("login", { title: "Sign in", error: "Invalid email or password." });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok)
      return res.status(401).render("login", { title: "Sign in", error: "Invalid email or password." });

    req.session.user = { id: user.id, username: user.username, email: user.email };
    res.redirect("/profile");
  } catch (e) {
    console.error(e);
    res.status(500).render("login", { title: "Sign in", error: "Something went wrong. Try again." });
  }
});

export default router;
