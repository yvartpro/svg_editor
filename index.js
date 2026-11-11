import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = process.env.PORT || 3001;

const app = express();

// nginx sits in front of the app.
app.set("trust proxy", 1);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            // The editor positions overlays with style attributes, and opened
            // SVG files carry their own inline styles.
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com"],
            // data: for PNG export, https: for images referenced by opened SVGs.
            "img-src": ["'self'", "data:", "blob:", "https:"],
            "upgrade-insecure-requests": null
        }
    }
}));

// The whole editor runs in the browser; the server only hands out the files.
app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));

app.use((req, res) => {
    res.status(404).type("text").send("Not found");
});

app.listen(PORT, () => {
    console.log(`SVG Editor running on port ${PORT}`);
});
