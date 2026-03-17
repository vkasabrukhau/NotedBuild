"use client";

import { useEffect, useState } from "react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";

function HomeComponent() {
  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center">
      <div className="text-black text-4xl font-bold">home</div>
    </div>
  );
}

function NoteComponent() {
  return (
    <div className="min-h-screen w-full bg-white">
      <SimpleEditor />
    </div>
  );
}

function FolderComponent() {
  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center">
      <div className="text-black text-4xl font-bold">folder</div>
    </div>
  );
}

export default function ValtestPage() {
  const [view, setView] = useState<"home" | "note" | "folder" | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey) {
        if (e.key === "H" || e.key === "h") {
          e.preventDefault();
          setView("home");
        } else if (e.key === "N" || e.key === "n") {
          e.preventDefault();
          setView("note");
        } else if (e.key === "F" || e.key === "f") {
          e.preventDefault();
          setView("folder");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (view === "home") return <HomeComponent />;
  if (view === "note") return <NoteComponent />;
  if (view === "folder") return <FolderComponent />;

  return (
    <div className="min-h-screen bg-white">
      {/* Test your components here */}
    </div>
  );
}
