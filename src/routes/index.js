import { Router } from "express";
const router = Router();

const studentName = "Aniket Soni";

router.get("/", (req, res) => {
  res.render("home", { title: "Home", helloMessage: `Hello World, I am ${studentName}` });
});

router.get("/login", (req, res) => {
  res.render("login", { title: "Sign in" });
});

router.get("/register", (req, res) => {
  res.render("register", { title: "Create account" });
});

// temporary stubs (we'll wire DB in Milestone 3)
router.post("/login", (req, res) => {
  res.send("Login submitted. We'll hook this up in Milestone 3.");
});
router.post("/register", (req, res) => {
  res.send("Registration submitted. We'll save this in Milestone 3.");
});

export default router;
