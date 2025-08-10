import { Router } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import fs from "fs";
import path from "path";
import { pool } from "../db.js";

const router = Router();
const studentName = "Aniket Soni";

// auth guard
function ensureAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}

// ---- uploads (multer) ----
const uploadsBase = path.resolve("public/uploads");
fs.mkdirSync(path.join(uploadsBase, "videos"), { recursive: true });
fs.mkdirSync(path.join(uploadsBase, "thumbs"), { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, file.fieldname === "video"
      ? path.join(uploadsBase, "videos")
      : path.join(uploadsBase, "thumbs"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const fileFilter = (req, file, cb) => {
  const okVideo = ["video/mp4", "video/quicktime"];
  const okImage = ["image/jpeg", "image/png", "image/webp"];
  if (file.fieldname === "video" && okVideo.includes(file.mimetype)) return cb(null, true);
  if (file.fieldname === "thumb" && okImage.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Unsupported file type"));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 200 * 1024 * 1024 } });

// ---- pages ----
router.get("/", async (req, res) => {
  const [posts] = await pool.execute(
    "SELECT id, title, thumb_path, created_at FROM posts ORDER BY created_at DESC LIMIT 24"
  );
  res.render("home", { title: "Home", helloMessage: `Hello World, I am ${studentName}`, posts });
});

router.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  let posts = [];
  if (q) {
    const like = `%${q}%`;
    const [rows] = await pool.execute(
      "SELECT id, title, thumb_path, created_at FROM posts WHERE title LIKE ? OR description LIKE ? ORDER BY created_at DESC",
      [like, like]
    );
    posts = rows;
  }
  res.render("search", { title: "Search", q, posts });
});

// new post
router.get("/post/new", ensureAuth, (req, res) => res.render("post_new", { title: "Upload" }));
router.post("/post/new",
  ensureAuth,
  upload.fields([{ name: "video", maxCount: 1 }, { name: "thumb", maxCount: 1 }]),
  async (req, res) => {
    try {
      const { title, description } = req.body;
      if (!title || !req.files?.video?.[0]) {
        return res.status(400).render("post_new", { title: "Upload", error: "Title and video are required." });
      }
      const video = req.files.video[0];
      const thumb = req.files.thumb?.[0];
      const video_path = `/uploads/videos/${video.filename}`;
      const thumb_path = thumb ? `/uploads/thumbs/${thumb.filename}` : null;

      const [result] = await pool.execute(
        "INSERT INTO posts (user_id, title, description, video_path, thumb_path) VALUES (?, ?, ?, ?, ?)",
        [req.session.user.id, title, description || null, video_path, thumb_path]
      );
      res.redirect(`/post/${result.insertId}`);
    } catch (e) {
      console.error(e);
      res.status(500).render("post_new", { title: "Upload", error: "Upload failed. Try again." });
    }
  }
);

// view post
router.get("/post/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [[post]] = await pool.execute(
    `SELECT p.id, p.title, p.description, p.video_path, p.thumb_path, p.created_at, u.username
     FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`, [id]
  );
  if (!post) return res.status(404).render("home", { error: "Post not found." });
  res.render("post", { title: post.title, post, likeCount: 0, liked: false, comments: [] });
});

// ---- auth (existing) ----
router.get("/login", (req, res) => res.render("login", { title: "Log in" }));
router.get("/register", (req, res) => res.render("register", { title: "Sign up" }));
router.get("/profile", ensureAuth, (req, res) => res.render("profile", { title: "Your profile" }));
router.get("/logout", (req, res) => { req.session.destroy(() => res.redirect("/")); });

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).render("register", { title: "Sign up", error: "Please fill everything in." });
    if (username.length < 3 || username.length > 24)
      return res.status(400).render("register", { title: "Sign up", error: "Username must be 3–24 chars." });
    if (password.length < 6)
      return res.status(400).render("register", { title: "Sign up", error: "Password must be 6+ chars." });

    const [exists] = await pool.execute("SELECT id FROM users WHERE email = ? OR username = ?", [email, username]);
    if (exists.length)
      return res.status(409).render("register", { title: "Sign up", error: "Email or username already in use." });

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
      [username, email, hash]
    );
    req.session.user = { id: result.insertId, username, email };
    res.redirect("/profile");
  } catch (e) {
    console.error(e);
    res.status(500).render("register", { title: "Sign up", error: "Something went wrong. Try again." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).render("login", { title: "Log in", error: "Please enter email and password." });

    const [rows] = await pool.execute(
      "SELECT id, username, email, password_hash FROM users WHERE email = ?", [email]
    );
    if (!rows.length)
      return res.status(401).render("login", { title: "Log in", error: "Invalid email or password." });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok)
      return res.status(401).render("login", { title: "Log in", error: "Invalid email or password." });

    req.session.user = { id: user.id, username: user.username, email: user.email };
    res.redirect("/profile");
  } catch (e) {
    console.error(e);
    res.status(500).render("login", { title: "Log in", error: "Something went wrong. Try again." });
  }
});

export default router;
