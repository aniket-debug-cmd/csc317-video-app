import express from "express";
import session from "express-session";
import { engine } from "express-handlebars";
import path from "path";
import dotenv from "dotenv";
import indexRouter from "./routes/index.js";

dotenv.config();
const app = express();

app.engine("hbs", engine({ extname: ".hbs", defaultLayout: "main" }));
app.set("view engine", "hbs");
app.set("views", path.resolve("src/views"));

app.use(express.static(path.resolve("public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// expose current year for footer
app.use((req, res, next) => { res.locals.year = new Date().getFullYear(); next(); });

app.use(session({
  secret: process.env.SESSION_SECRET || "dev_secret_change_me",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 2 }
}));

app.use("/", indexRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
