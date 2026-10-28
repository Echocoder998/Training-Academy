"use client";
import Link from "next/link";
import { useState } from "react";
import { markWatched } from "@/app/actions";

export function LessonVideo({ lessonId, videoUrl, videoLink, watched, isAdmin }: { lessonId: string; videoUrl: string | null; videoLink: string | null; watched: boolean; isAdmin: boolean }) {
  const [done, setDone] = useState(watched);
  const mark = async () => { if (!done) { setDone(true); await markWatched(lessonId); } };

  if (videoUrl) return <video className="video" controls preload="metadata" src={videoUrl} onEnded={mark} />;
  if (videoLink && /^https:\/\//.test(videoLink)) {
    return (
      <div className="novideo"><div className="stack" style={{ alignItems: "center" }}>
        <b>This lesson&apos;s video is hosted elsewhere.</b>
        <a className="btn" href={videoLink} target="_blank" rel="noopener noreferrer">Open the video</a>
        <button className="btn sm" onClick={mark} disabled={done}>{done ? "Marked as watched" : "I watched it"}</button>
      </div></div>
    );
  }
  return (
    <div className="novideo"><div>No video for this lesson yet.{" "}
      {isAdmin ? <Link className="link" href={`/admin/content/lessons/${lessonId}`}>Add one</Link> : "Read the key points below, then take the quiz."}
    </div></div>
  );
}
