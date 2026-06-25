"use client"

import { useState, useRef, useEffect } from "react"
import Logo from "./components/logo"

type AppState = "idle" | "processing" | "done" | "error"

interface Person {
  name: string
  role: string | null
  affiliation: string | null
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

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle")
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobResult, setJobResult] = useState<JobResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  return (
    <main style={{
      maxWidth: "680px",
      margin: "0 auto",
      padding: "4rem 1.5rem 2rem",
    }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <Logo size={22} />
      </div>

      {appState === "idle" && (
        <UploadSection
          onProcessingStart={(id) => {
            setJobId(id)
            setAppState("processing")
          }}
          onError={(msg) => {
            setErrorMessage(msg)
            setAppState("error")
          }}
        />
      )}

      {appState === "processing" && jobId && (
        <ProcessingSection
          jobId={jobId}
          onDone={(result) => {
            setJobResult(result)
            setAppState("done")
          }}
          onError={(msg) => {
            setErrorMessage(msg)
            setAppState("error")
          }}
        />
      )}

      {appState === "done" && jobResult?.result && (
        <ResultsSection result={jobResult.result} onReset={() => {
          setAppState("idle")
          setJobId(null)
          setJobResult(null)
          setErrorMessage(null)
        }} />
      )}

      {appState === "error" && (
        <div style={{
          border: "0.5px solid #F0BDB5",
          borderRadius: "12px",
          padding: "1.5rem",
          background: "#FDF4F2",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#993C1D", marginBottom: "8px" }}>
            Something went wrong
          </div>
          <div style={{ fontSize: "13px", color: "#5A7872", marginBottom: "1.25rem" }}>
            {errorMessage}
          </div>
          <button
            onClick={() => {
              setAppState("idle")
              setJobId(null)
              setJobResult(null)
              setErrorMessage(null)
            }}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              border: "none",
              background: "#1D9E75",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke={isRecording ? "#993C1D" : "#1D9E75"}
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            const file = e.dataTransfer.files[0]
            if (file) setAudioFile(file)
          }}
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
              : <><span>Drop your audio file here or </span><span style={{ color: "#1D9E75" }}>browse</span></>
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

function ProcessingSection({ jobId, onDone, onError }: {
  jobId: string
  onDone: (result: JobResult) => void
  onError: (message: string) => void
}) {
  const [status, setStatus] = useState("pending")

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/jobs/${jobId}`)
        const data: JobResult = await res.json()
        setStatus(data.status)
        if (data.status === "completed") {
          clearInterval(interval)
          onDone(data)
        } else if (data.status === "failed") {
          clearInterval(interval)
          onError(data.error_message || "Processing failed. Please try again.")
        }
      } catch {
        clearInterval(interval)
        onError("Could not reach the server. Please try again.")
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [jobId, onDone, onError])

  const steps = ["pending", "transcribing", "processing", "completed"]
  const stepLabels = ["Uploading", "Transcribing", "Extracting", "Done"]
  const currentIndex = steps.indexOf(status)

  return (
    <div style={{
      border: "0.5px solid #C8DAD6",
      borderRadius: "12px",
      padding: "1.5rem",
      background: "#fff",
    }}>
      <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F2420", marginBottom: "1.25rem" }}>
        Processing your memo
      </div>

      <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
        {stepLabels.map((label, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < stepLabels.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: i <= currentIndex ? "#1D9E75" : "#C8DAD6",
                flexShrink: 0, transition: "background 0.3s",
              }}/>
              <span style={{
                fontSize: "12px",
                color: i === currentIndex ? "#0F2420" : "#8AADA6",
                fontWeight: i === currentIndex ? 500 : 400,
                whiteSpace: "nowrap",
              }}>{label}</span>
            </div>
            {i < stepLabels.length - 1 && (
              <div style={{
                flex: 1, height: "0.5px", margin: "0 8px",
                background: i < currentIndex ? "#1D9E75" : "#C8DAD6",
                transition: "background 0.3s",
              }}/>
            )}
          </div>
        ))}
      </div>

      <div style={{ height: "3px", background: "#EDF4F2", borderRadius: "99px", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${(currentIndex / (steps.length - 1)) * 100}%`,
          background: "#1D9E75",
          borderRadius: "99px",
          transition: "width 0.5s ease",
        }}/>
      </div>

      <div style={{ fontSize: "12px", color: "#5A7872", marginTop: "12px", textAlign: "center" }}>
        {status === "pending" && "Getting started..."}
        {status === "transcribing" && "Transcribing your audio..."}
        {status === "processing" && "Extracting tasks and decisions..."}
      </div>
    </div>
  )
}

function ResultsSection({ result, onReset }: {
  result: NonNullable<JobResult["result"]>
  onReset: () => void
}) {
  const typeColors: Record<string, { bg: string; color: string; label: string }> = {
    work:      { bg: "#EEEDFE", color: "#3C3489", label: "Work" },
    health:    { bg: "#E1F5EE", color: "#085041", label: "Health" },
    personal:  { bg: "#FAEEDA", color: "#633806", label: "Personal" },
    self_help: { bg: "#FAE7F5", color: "#6B1F5A", label: "Self help" },
  }

  return (
    <div>
      <div style={{
        border: "0.5px solid #C8DAD6",
        borderRadius: "12px",
        padding: "1rem 1.25rem",
        background: "#fff",
        marginBottom: "1rem",
      }}>
        <div style={{
          fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "#8AADA6", marginBottom: "0.75rem",
        }}>Summary</div>
        <ul style={{ listStyle: "none" }}>
          {result.summary_points.map((point, i) => (
            <li key={i} style={{
              fontSize: "13px", color: "#5A7872",
              padding: "4px 0", display: "flex", gap: "8px",
            }}>
              <span style={{ color: "#1D9E75", flexShrink: 0 }}>—</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div style={{
        fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "#8AADA6",
        marginBottom: "1rem", marginTop: "1.5rem",
        paddingBottom: "0.4rem", borderBottom: "0.5px solid #C8DAD6",
      }}>Tasks</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "1.5rem" }}>
        {result.tasks.length === 0 && (
          <div style={{ fontSize: "13px", color: "#8AADA6", gridColumn: "span 2" }}>No tasks found.</div>
        )}
        {result.tasks.map((task, i) => {
          const tc = typeColors[task.type] || typeColors.personal
          return (
            <div key={i} style={{
              border: "0.5px solid #C8DAD6",
              borderRadius: "12px",
              padding: "1rem 1.25rem",
              background: "#fff",
            }}>
              <span style={{
                display: "inline-block", fontSize: "11px", fontWeight: 500,
                padding: "2px 8px", borderRadius: "99px",
                background: tc.bg, color: tc.color, marginBottom: "8px",
              }}>{tc.label}</span>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F2420", marginBottom: "4px" }}>
                {task.title}
              </div>
              <div style={{ fontSize: "12px", color: "#5A7872", lineHeight: 1.5, marginBottom: "10px" }}>
                {task.description}
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {task.deadline_iso && (
                  <span style={{
                    fontSize: "11px", color: "#5A7872",
                    border: "0.5px solid #C8DAD6", borderRadius: "99px", padding: "2px 8px",
                  }}>📅 {task.deadline_iso}</span>
                )}
                {task.timeline_raw && (
                  <span style={{
                    fontSize: "11px", color: "#5A7872",
                    border: "0.5px solid #C8DAD6", borderRadius: "99px", padding: "2px 8px",
                  }}>🕐 {task.timeline_raw}</span>
                )}
                {task.priority && (
                  <span style={{
                    fontSize: "11px", color: "#5A7872",
                    border: "0.5px solid #C8DAD6", borderRadius: "99px", padding: "2px 8px",
                  }}>{task.priority}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{
        fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "#8AADA6",
        marginBottom: "1rem", paddingBottom: "0.4rem", borderBottom: "0.5px solid #C8DAD6",
      }}>Decisions</div>

      <div style={{ marginBottom: "1.5rem" }}>
        {result.decisions.length === 0 && (
          <div style={{ fontSize: "13px", color: "#8AADA6" }}>No decisions recorded.</div>
        )}
        {result.decisions.map((d, i) => (
          <div key={i} style={{
            border: "0.5px solid #C8DAD6", borderRadius: "12px",
            padding: "1rem 1.25rem", background: "#fff", marginBottom: "10px",
          }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F2420", marginBottom: "4px" }}>
              {d.title}
            </div>
            {d.description && (
              <div style={{ fontSize: "12px", color: "#5A7872", lineHeight: 1.5 }}>
                {d.description}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "#8AADA6",
        marginBottom: "1rem", paddingBottom: "0.4rem", borderBottom: "0.5px solid #C8DAD6",
      }}>People</div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "2rem" }}>
        {result.people.length === 0 && (
          <div style={{ fontSize: "13px", color: "#8AADA6" }}>No people mentioned.</div>
        )}
        {result.people.map((p, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: "8px",
            border: "0.5px solid #C8DAD6", borderRadius: "8px",
            padding: "8px 12px", background: "#fff",
          }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              background: "#E1F5EE", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "11px", fontWeight: 500, color: "#085041",
            }}>
              {p.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F2420" }}>{p.name}</div>
              <div style={{ fontSize: "11px", color: "#8AADA6" }}>
                {p.role || p.affiliation || "Not mentioned"}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onReset}
        style={{
          width: "100%", padding: "10px", borderRadius: "8px",
          border: "0.5px solid #C8DAD6", background: "transparent",
          color: "#5A7872", fontSize: "14px", fontWeight: 500, cursor: "pointer",
        }}
      >
        Process another memo
      </button>
    </div>
  )
}