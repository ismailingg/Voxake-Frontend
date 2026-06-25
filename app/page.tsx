"use client"
import { useState, useRef } from "react"
import Logo from "./components/logo"
type AppState = "idle" | "processing" | "done" | "error"

interface JobResult {
  id: string
  status: string
  error_message: string | null
  result: {
    recorded_at: string
    transcript: string
    summary_points: string[]
    tasks: Task[]
    decisions: Decision[]
    people: Person[]
  } | null
}

interface Task {
  title: string
  description: string
  type: "personal" | "work" | "health" | "self_help"
  characters: Person[]
  deadline_iso: string | null
  timeline_raw: string | null
  priority: "high" | "medium" | "low" | null
}

interface Decision {
  title: string
  description: string | null
}

interface Person {
  name: string
  role: string | null
  affiliation: string | null
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle")
  const [jobResult, setJobResult] = useState<JobResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  return (
    <main style={{
      maxWidth: "680px",
      margin: "0 auto",
      padding: "2rem 1.5rem",
    }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <Logo size={22} />
      </div>

      {appState === "idle" && (
        <UploadSection
          onProcessingStart={(id) => {
            setAppState("processing")
          }}
          onError={(msg) => {
            setErrorMessage(msg)
            setAppState("error")
          }}
        />
      )}

      {appState === "processing" && (
        <div>Processing...</div>
      )}

      {appState === "done" && jobResult?.result && (
        <div>Results go here</div>
      )}

      {appState === "error" && (
        <div style={{ color: "red" }}>{errorMessage}</div>
      )}
    </main>
  )
}

function UploadSection({
  onProcessingStart,
  onError,
}: {
  onProcessingStart: (jobId: string) => void
  onError: (message: string) => void
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        const file = new File([blob], "recording.webm", { type: "audio/webm" })
        setAudioFile(file)
        stream.getTracks().forEach((t) => t.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      onError("Microphone access denied. Please allow microphone access and try again.")
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) setAudioFile(file)
  }

  const handleSubmit = async () => {
    if (!audioFile) return
    const formData = new FormData()
    formData.append("file", audioFile)
    formData.append("recorded_at", new Date().toISOString())

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/transcribe`,
        { method: "POST", body: formData }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Upload failed")
      onProcessingStart(data.id)
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <div>
      <div style={{
        border: "0.5px solid #C8DAD6",
        borderRadius: "12px",
        padding: "2.5rem 2rem",
        textAlign: "center",
        background: "#fff",
        marginBottom: "1rem",
      }}>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            border: isRecording ? "0.5px solid #993C1D" : "0.5px solid #C8DAD6",
            background: isRecording ? "#FAECE7" : "#EDF4F2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
            cursor: "pointer",
          }}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isRecording ? "#993C1D" : "#1D9E75"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3"/>
            <path d="M5 10a7 7 0 0 0 14 0"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="9" y1="22" x2="15" y2="22"/>
          </svg>
        </button>

        <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F2420", marginBottom: "4px" }}>
          {isRecording ? "Recording... tap to stop" : "Record a memo"}
        </div>
        <div style={{ fontSize: "13px", color: "#5A7872" }}>
          {isRecording ? "Speak clearly into your mic" : "Tap to start recording"}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "1.5rem 0" }}>
          <div style={{ flex: 1, height: "0.5px", background: "#C8DAD6" }}/>
          <div style={{ fontSize: "12px", color: "#8AADA6" }}>or upload a file</div>
          <div style={{ flex: 1, height: "0.5px", background: "#C8DAD6" }}/>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `0.5px dashed ${isDragging ? "#1D9E75" : "#C8DAD6"}`,
            borderRadius: "8px",
            padding: "1.5rem",
            textAlign: "center",
            background: isDragging ? "#EDF4F2" : "#F4F7F6",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          <div style={{ fontSize: "13px", color: "#5A7872" }}>
            {audioFile
              ? `✓ ${audioFile.name}`
              : <>Drop your audio file here or <span style={{ color: "#1D9E75" }}>browse</span></>
            }
          </div>
          <div style={{ fontSize: "12px", color: "#8AADA6", marginTop: "4px" }}>
            MP3, M4A, WAV, OGG, WEBM up to 20MB
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) setAudioFile(file)
          }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!audioFile}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "8px",
          border: "none",
          background: audioFile ? "#1D9E75" : "#C8DAD6",
          color: "#fff",
          fontSize: "14px",
          fontWeight: 500,
          cursor: audioFile ? "pointer" : "not-allowed",
          transition: "background 0.15s",
        }}
      >
        Process memo
      </button>
    </div>
  )
}