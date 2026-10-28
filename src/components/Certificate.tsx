"use client";
import { useState } from "react";

/** Draws a branded certificate on a canvas and downloads it as a PNG. */
export function Certificate({ courseTitle, defaultName, lessonCount, avg, finishedAt }: { courseTitle: string; defaultName: string; lessonCount: number; avg: number; finishedAt: number }) {
  const [name, setName] = useState(defaultName);

  const download = async () => {
    if (!name.trim()) return;
    try { await document.fonts.ready; } catch {}
    const W = 1600, H = 1130;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d")!;
    const font = getComputedStyle(document.body).fontFamily;
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#000000"; g.fillRect(0, 0, W, 150);
    g.fillStyle = "#ed1b30"; g.fillRect(0, 150, W, 10);
    g.textBaseline = "middle"; g.fillStyle = "#ffffff";
    g.font = `800 64px ${font}`; g.fillText("MCE", 80, 78);
    g.fillStyle = "#ed1b30"; g.fillRect(232, 46, 4, 64);
    g.fillStyle = "#ffffff"; g.font = `600 26px ${font}`; g.fillText("SALES ACADEMY", 262, 80);
    g.strokeStyle = "#000"; g.lineWidth = 3; g.strokeRect(60, 210, W - 120, H - 270);
    g.textAlign = "center";
    g.fillStyle = "#53585f"; g.font = `700 28px ${font}`; g.fillText("CERTIFICATE OF COMPLETION", W / 2, 320);
    g.font = `400 30px ${font}`; g.fillText("This certifies that", W / 2, 410);
    g.fillStyle = "#1a1a1a"; g.font = `800 92px ${font}`; g.fillText(name.trim(), W / 2, 510, W - 260);
    g.fillStyle = "#ed1b30"; g.fillRect(W / 2 - 360, 572, 720, 4);
    g.fillStyle = "#53585f"; g.font = `400 30px ${font}`; g.fillText("has completed the course", W / 2, 640);
    g.fillStyle = "#000"; g.font = `800 62px ${font}`; g.fillText(courseTitle.toUpperCase(), W / 2, 720, W - 260);
    g.fillStyle = "#53585f"; g.font = `400 26px ${font}`;
    g.fillText(`${lessonCount} lesson${lessonCount === 1 ? "" : "s"} passed  ·  average quiz score ${avg}%`, W / 2, 800);
    g.fillStyle = "#1a1a1a"; g.font = `700 26px ${font}`;
    g.fillText(new Date(finishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }).toUpperCase(), W / 2, 920);
    g.fillStyle = "#6f6f6f"; g.font = `400 20px ${font}`; g.fillText("Date completed", W / 2, 956);
    const a = document.createElement("a");
    a.href = cv.toDataURL("image/png");
    a.download = `Certificate - ${courseTitle} - ${name.trim()}.png`.replace(/[\\/:*?"<>|]/g, "");
    a.click();
  };

  return (
    <div className="card row spread" style={{ borderTop: "4px solid var(--good)" }}>
      <div className="stack" style={{ gap: 6 }}>
        <span className="pill pass" style={{ alignSelf: "flex-start" }}>Course complete</span>
        <b>Download your certificate</b>
        <label className="f" style={{ maxWidth: 300 }}>Name on certificate<input value={name} onChange={(e) => setName(e.target.value)} /></label>
      </div>
      <button className="btn primary" onClick={download} disabled={!name.trim()}>Download certificate</button>
    </div>
  );
}
