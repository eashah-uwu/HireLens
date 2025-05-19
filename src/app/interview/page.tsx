"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../utils/supabase/client";
import VideoRecorder from "../../components/VideoRecorder";
import { interviewQuestions } from "@/src/lib/questions";
import { redirect } from "next/navigation";
import { Mic, Timer, Video } from "lucide-react";
import { cn } from "@/lib/utils";

export default function InterviewPage() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isUploading, setIsUploading] = useState(false);
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<
    Record<number, boolean>
  >({});

  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        redirect("/sign-in");
      }
      setUserId(user.id);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      setTimeLeft(60);
      interval = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const checkTranscriptionStatus = async (questionNumber: number) => {
    try {
      if (!userId) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/transcription-status/${userId}/${questionNumber}`
      );
      const data = await response.json();

      if (data.status === "completed") {
        setProcessingStatus((prev) => ({
          ...prev,
          [questionNumber]: true,
        }));
      } else {
        // Check again in 5 seconds
        setTimeout(() => checkTranscriptionStatus(questionNumber), 5000);
      }
    } catch (error) {
      console.error("Error checking transcription status:", error);
    }
  };

  const startProcessing = async (questionNumber: number) => {
    try {
      if (!userId) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/process-video`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            video_path: `${userId}/question_${questionNumber + 1}.webm`,
            question_number: questionNumber + 1,
          }),
        }
      );

      if (response.ok) {
        // Start polling for status
        checkTranscriptionStatus(questionNumber + 1);
      }
    } catch (error) {
      console.error("Error starting video processing:", error);
    }
  };

  const handleRecordingComplete = async (videoBlob: Blob) => {
    try {
      if (!userId) return;
      setIsUploading(true);

      const fileName = `${userId}/question_${currentQuestionIndex + 1}.webm`;
      const { error } = await supabase.storage
        .from("interview-videos")
        .upload(fileName, videoBlob);

      if (error) throw error;

      // Start processing the uploaded video
      await startProcessing(currentQuestionIndex);

      if (currentQuestionIndex === interviewQuestions.length - 1) {
        setIsInterviewComplete(true);
      } else {
        setCurrentQuestionIndex((prev) => prev + 1);
        setTimeLeft(60);
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      alert("Failed to upload video. Please try again.");
    } finally {
      setIsUploading(false);
      setIsRecording(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
      <div className="w-full space-y-8">
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              Question {currentQuestionIndex + 1}
              <span className="text-muted-foreground text-lg font-normal">
                {" "}
                of {interviewQuestions.length}
              </span>
            </h2>
            <div className="flex items-center gap-4">
              {/* Show processing status for previous questions */}
              {currentQuestionIndex > 0 && (
                <div className="flex items-center gap-2">
                  {Array.from({ length: currentQuestionIndex }, (_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-2 rounded-full ${
                        processingStatus[i + 1]
                          ? "bg-green-500"
                          : "bg-yellow-500 animate-pulse"
                      }`}
                      title={`Question ${i + 1} ${
                        processingStatus[i + 1] ? "processed" : "processing"
                      }`}
                    />
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-muted-foreground" />
                <span
                  className={cn(
                    "font-mono text-lg",
                    timeLeft <= 10 &&
                      isRecording &&
                      "text-destructive animate-pulse"
                  )}
                >
                  {Math.floor(timeLeft / 60)}:
                  {(timeLeft % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${
                  ((currentQuestionIndex + 1) / interviewQuestions.length) * 100
                }%`,
              }}
            ></div>
          </div>
        </div>

        <div className="bg-card p-8 rounded-lg shadow-sm border space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-medium mb-4">Interview Question</h3>
                <p className="text-lg leading-relaxed">
                  {interviewQuestions[currentQuestionIndex]}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t">
            <div className="flex items-center gap-2 mb-4">
              <Video className="h-5 w-5 text-primary" />
              <h3 className="font-medium">Your Response</h3>
            </div>
            {isInterviewComplete ? (
              <div className="bg-card p-8 rounded-lg shadow-sm border text-center space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-primary">
                  Interview Complete!
                </h3>
                <p className="text-muted-foreground">
                  Thank you for completing the interview. Your responses have
                  been recorded and will be analyzed by our AI system.
                </p>
              </div>
            ) : (
              <>
                {isUploading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2 text-sm text-muted-foreground">
                      Uploading response...
                    </span>
                  </div>
                ) : (
                  <VideoRecorder
                    onRecordingComplete={handleRecordingComplete}
                    isRecording={isRecording}
                    setIsRecording={setIsRecording}
                    maxDuration={60}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
