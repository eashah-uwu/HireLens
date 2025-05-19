"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface VideoRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  maxDuration?: number; // Duration in seconds
}

export default function VideoRecorder({
  onRecordingComplete,
  isRecording,
  setIsRecording,
  maxDuration = 60, // defaults to a minute
}: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [error, setError] = useState<string>("");
  const [timer, setTimer] = useState<number>(0);
  const chunks = useRef<Blob[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      setTimer(0);
      interval = setInterval(() => {
        setTimer((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newTime;
        });
      }, 1000);

      timeoutRef.current = setTimeout(() => {
        stopRecording();
      }, maxDuration * 1000);
    }
    return () => {
      clearInterval(interval);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isRecording, maxDuration]);

  const startRecording = async () => {
    try {
      setTimer(0);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunks.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: "video/webm" });
        onRecordingComplete(blob);

        stream.getTracks().forEach((track) => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setTimer(0);
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setError("Could not access camera or microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const timeLeft = maxDuration - timer;

  return (
    <div className="space-y-4">
      <div className="relative aspect-video w-full max-w-2xl mx-auto bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {isRecording && (
          <div
            className={cn(
              "absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-md flex items-center gap-2",
              timeLeft <= 10 && "animate-pulse"
            )}
          >
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="flex justify-center gap-4">
        {!isRecording ? (
          <Button onClick={startRecording} className="bg-primary">
            Start Recording
          </Button>
        ) : (
          <Button onClick={stopRecording} variant="destructive">
            Stop Recording
          </Button>
        )}
      </div>

      {error && <p className="text-red-500 text-center">{error}</p>}
    </div>
  );
}
