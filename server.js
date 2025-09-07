import express from "express";
import multer from "multer";
import fs from "node:fs";
import fsp from "node:fs/promises";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

const app = express();
const upload = multer({ dest: "/tmp" }); // temp dir on Render
ffmpeg.setFfmpegPath(ffmpegPath);

// POST /mix : send two form-data files named file1 and file2
app.post("/mix", upload.fields([{ name: "file1" }, { name: "file2" }]), async (req, res) => {
  try {
    const f1 = req.files?.file1?.[0]?.path;
    const f2 = req.files?.file2?.[0]?.path;
    if (!f1 || !f2) return res.status(400).json({ error: "Upload two files named file1 and file2" });

    const out = "/tmp/final.mp3";

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(f1)
        .input(f2)
        .complexFilter(['[0:a][1:a]amix=inputs=2:normalize=0[out]'])
        .outputOptions(['-map [out]', '-c:a libmp3lame', '-q:a 2'])
        .on("error", reject)
        .on("end", resolve)
        .save(out);
    });

    const buf = await fsp.readFile(out);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buf.length);
    res.send(buf);

    // best-effort cleanup
    [f1, f2, out].forEach(p => { try { fs.unlinkSync(p); } catch {} });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get("/", (_req, res) => res.send("OK"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("mixer up on " + port));
