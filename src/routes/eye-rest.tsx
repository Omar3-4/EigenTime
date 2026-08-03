import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export const Route = createFileRoute("/eye-rest")({
  component: EyeRest,
});

function EyeRest() {
  const [timeLeft, setTimeLeft] = useState(20);

  useEffect(() => {
    if (timeLeft <= 0) {
      // Auto close after 20 seconds
      invoke("close_eye_rest");
      return;
    }
    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-black/90 text-white backdrop-blur-3xl">
      <div className="absolute top-8 text-center text-white/50 text-sm tracking-widest uppercase">
        20-20-20 Rule
      </div>
      
      <h1 className="text-4xl font-light mb-8 max-w-lg text-center leading-relaxed">
        Look at something 20 feet away to rest your eyes.
      </h1>
      
      <div className="flex items-center justify-center relative">
        <svg className="w-64 h-64 transform -rotate-90">
          <circle
            cx="128"
            cy="128"
            r="120"
            className="stroke-white/10"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="128"
            cy="128"
            r="120"
            className="stroke-primary"
            strokeWidth="8"
            fill="none"
            strokeDasharray={120 * 2 * Math.PI}
            strokeDashoffset={(120 * 2 * Math.PI) * (1 - timeLeft / 20)}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <span className="absolute text-7xl font-light tabular-nums">
          {timeLeft}
        </span>
      </div>

      <button
        onClick={() => invoke("close_eye_rest")}
        className="mt-16 text-white/40 hover:text-white/80 transition-colors"
      >
        Skip (Not Recommended)
      </button>
    </div>
  );
}
