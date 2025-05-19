from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
from supabase import create_client, Client
import os
from pydantic import BaseModel
from typing import Optional
import tempfile
import asyncio
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

# Initialize OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file")

supabase: Client = create_client(supabase_url, supabase_key)

# Initialize Whisper model
model = WhisperModel("base", device="cpu", compute_type="int8")

# Questions list
INTERVIEW_QUESTIONS = [
    "Tell me about yourself and your background.",
    "What are your greatest strengths and how have you demonstrated them in your work?",
    "Describe a challenging project you worked on. How did you handle it?",
]

class TranscriptionRequest(BaseModel):
    user_id: str
    video_path: str
    question_number: int

async def evaluate_answer(transcript: str, question_number: int) -> dict:
    """Evaluate the answer using OpenAI."""
    try:
        question = INTERVIEW_QUESTIONS[question_number - 1]
        
        prompt = f"""You are an expert interviewer. Evaluate the following interview answer for the question:
        Question: {question}
        Answer: {transcript}
        
        Provide an evaluation with:
        1. Relevance (0-10): How well the answer addresses the question
        2. Clarity (0-10): How clear and well-structured the answer is
        3. Depth (0-10): The level of detail and examples provided
        4. Overall Score (0-10): Combined assessment
        5. Brief Feedback: Key strengths and areas for improvement
        
        Format the response as a JSON object with these exact keys: relevance, clarity, depth, overall_score, feedback"""

        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="gpt-3.5-turbo-0125",
            messages=[
                {"role": "system", "content": "You are an expert interviewer providing structured feedback. Respond only with the requested JSON format."},
                {"role": "user", "content": prompt}
            ]
        )
        
        # Parse the JSON response
        evaluation = response.choices[0].message.content
        return evaluation

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error evaluating answer: {str(e)}")

async def process_video(user_id: str, video_path: str, question_number: int):
    try:
        # Download video from Supabase storage
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, f"question_{question_number}.webm")
        
        with open(temp_path, 'wb+') as f:
            response = supabase.storage.from_("interview-videos").download(video_path)
            f.write(response)

        # Transcribe with Whisper
        segments, info = model.transcribe(temp_path, beam_size=5)
        transcript = " ".join([segment.text for segment in segments])

        # Store transcription in database
        transcription_data = {
            "user_id": user_id,
            "video_path": video_path,
            "transcript": transcript,
        }
        
        transcription_result = supabase.table("transcriptions").insert(transcription_data).execute()

        # Get evaluation from OpenAI
        evaluation = await evaluate_answer(transcript, question_number)
        
        # Store evaluation in database
        evaluation_data = {
            "user_id": user_id,
            "question_number": question_number,
            "transcription_id": transcription_result.data[0]["id"],
            "evaluation": evaluation
        }
        
        await supabase.table("evaluations").insert(evaluation_data).execute()

        # Cleanup
        os.remove(temp_path)
        os.rmdir(temp_dir)

        return {"status": "success", "transcript": transcript, "evaluation": evaluation}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process-video")
async def handle_video_processing(request: TranscriptionRequest):
    try:
        # Create and start the background task
        task = asyncio.create_task(process_video(
            request.user_id,
            request.video_path,
            request.question_number
        ))
        
        return {"status": "processing_started", "message": f"Processing video for question {request.question_number}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/transcription-status/{user_id}/{question_number}")
async def get_transcription_status(user_id: str, question_number: int):
    try:
        # First check evaluations table
        eval_response = supabase.table("evaluations") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("question_number", question_number) \
            .execute()
        
        if eval_response.data:
            return {"status": "completed", "evaluation": eval_response.data[0]}
            
        # If no evaluation yet, check transcriptions
        trans_response = supabase.table("transcriptions") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("video_path", f"{user_id}/question_{question_number}.webm") \
            .execute()
        
        if trans_response.data:
            return {"status": "transcribed", "transcription": trans_response.data[0]}
            
        return {"status": "pending"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
