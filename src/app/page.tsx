"use client";

import { Button } from "@/src/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle, Mic, Video } from "lucide-react";

export default function Home() {
  const router = useRouter();

  const features = [
    {
      title: "Answer Analysis",
      description:
        "Get instant AI-powered feedback on your interview responses",
      icon: <CheckCircle className="h-8 w-8 text-primary" />,
    },
    {
      title: "Voice Confidence",
      description: "Analyze your speaking confidence and vocal clarity",
      icon: <Mic className="h-8 w-8 text-primary" />,
    },
    {
      title: "Video Analysis",
      description: "Receive insights on your body language and presentation",
      icon: <Video className="h-8 w-8 text-primary" />,
    },
  ];

  return (
    <div className="flex flex-col items-center">
      <section className="w-full max-w-5xl px-4 py-12 text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Master Your Interview Skills
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          HireLens uses advanced AI to help you prepare for interviews, analyze
          your responses, and improve your chances of landing your dream job.
        </p>
        <Button
          size="lg"
          className="mt-8"
          onClick={() => router.push("/interview")}
        >
          Start Practice Interview
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </section>

      <section className="w-full bg-muted/50 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Comprehensive Interview Analysis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-background rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
