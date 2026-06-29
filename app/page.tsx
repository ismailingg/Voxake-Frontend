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

const SANS = '"Helvetica Neue", Arial, sans-serif'
const SERIF = 'Georgia, "Times New Roman", serif'

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle")
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobResult, setJobResult] = useState<JobResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const reset = () => {
    setAppState("idle")
    setJobId(null)
    setJobResult(null)
    setErrorMessage(null)
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#EDE8DE",
      padding: "32px 16px",
    }}>
      <div style={{
        maxWidth: "760px",
        margin: "0 auto",
        background: "#F5F1E8",
        border: "0.5px solid #D8D0BE",
        minHeight: "80vh",
      }}>
        <div style={{
          padding: "24px 40px",
          borderBottom: "1.5px solid #1A1A17",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        }}>
          <Logo />
          <span style={{
            fontFamily: SANS,
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#8A7F68",
          }}>
            {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>

        {appState === "idle" && (
          <UploadSection
            onProcessingStart={(id) => { setJobId(id); setAppState("processing") }}
            onError={(msg) => { setErrorMessage(msg); setAppState("error") }}
          />
        )}

        {appState === "processing" && jobId && (
          <ProcessingSection
            jobId={jobId}
            onDone={(r) => { setJobResult(r); setAppState("done") }}
            onError={(msg) => { setErrorMessage(msg); setAppState("error") }}
          />
        )}

        {appState === "done" && jobResult?.result && (
          <ResultsSection result={jobResult.result} onReset={reset} />
        )}

        {appState === "error" && (
          <div style={{ padding: "64px 40px", textAlign: "center" }}>
            <div style={{ fontFamily: SANS, fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#A8421E", marginBottom: "14px" }}>
              Stop the press
            </div>
            <div style={{ fontFamily: SERIF, fontSize: "26px", color: "#1A1A17", marginBottom: "12px" }}>
              Something went wrong
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "15px", color: "#6B6354", marginBottom: "28px", maxWidth: "400px", marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
              {errorMessage}
            </div>
            <button onClick={reset} style={{
              padding: "12px 28px", border: "1px solid #1A1A17", background: "transparent",
              color: "#1A1A17", fontFamily: SANS, fontSize: "11px", fontWeight: 600,
              letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
            }}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        setAudioFile(new File([blob], "recording.webm", { type: "audio/webm" }))
        stream.getTracks().forEach((t) => t.stop())
      }
      mr.start()
      setIsRecording(true)
    } catch {
      onError("Microphone access was denied. Allow microphone access and try again.")
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const handleSubmit = async () => {
    if (!audioFile || isSubmitting) return
    setIsSubmitting(true)
    const fd = new FormData()
    fd.append("file", audioFile)
    fd.append("recorded_at", new Date().toISOString())
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transcribe`, { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Upload failed")
      onProcessingStart(data.id)
    } catch (err: unknown) {
      setIsSubmitting(false)
      onError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <div style={{ padding: "40px", maxWidth: "680px", margin: "0 auto" }}>
      <div style={{ fontFamily: SANS, fontSize: "11px", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#A8421E", marginBottom: "14px" }}>
        From spoken word to printed record
      </div>
      <div style={{ fontFamily: SERIF, fontSize: "34px", fontWeight: 400, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#1A1A17", marginBottom: "18px" }}>
        Say it once. We&apos;ll file the rest.
      </div>
      <div style={{ fontFamily: SERIF, fontSize: "16px", lineHeight: 1.6, color: "#4A453A", fontStyle: "italic", paddingBottom: "24px", marginBottom: "28px", borderBottom: "0.5px solid #D8D0BE" }}>
        Record a memo or drop a voice note. Every task, decision, and name is extracted, typed, and set in print — ready to read.
      </div>

      <div style={{ border: "1px solid #1A1A17", background: "#FBF8F1", padding: "32px", textAlign: "center", marginBottom: "8px" }}>
        <button onClick={isRecording ? stopRecording : startRecording} aria-label={isRecording ? "Stop recording" : "Start recording"} style={{
          width: "60px", height: "60px", borderRadius: "50%",
          border: isRecording ? "1px solid #A8421E" : "1px solid #1A1A17",
          background: isRecording ? "#F5E3DC" : "#F5F1E8",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px", cursor: "pointer",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isRecording ? "#A8421E" : "#1A1A17"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3"/>
            <path d="M5 10a7 7 0 0 0 14 0"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="9" y1="22" x2="15" y2="22"/>
          </svg>
        </button>
        <div style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, color: "#1A1A17", marginBottom: "5px" }}>
          {isRecording ? "Recording… tap to stop" : "Record a memo"}
        </div>
        <div style={{ fontFamily: SANS, fontSize: "12px", color: "#8A7F68" }}>
          {isRecording ? "Speak naturally into your mic" : "Tap to begin — speak naturally"}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", margin: "24px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "#D8D0BE" }}/>
          <div style={{ fontFamily: SANS, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#A89E86" }}>or submit a file</div>
          <div style={{ flex: 1, height: "1px", background: "#D8D0BE" }}/>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) setAudioFile(f) }}
          onClick={() => fileInputRef.current?.click()}
          style={{ border: `1px dashed ${isDragging ? "#A8421E" : "#B5AB92"}`, padding: "18px", cursor: "pointer", background: isDragging ? "#F5E3DC" : "transparent" }}
        >
          <div style={{ fontFamily: SANS, fontSize: "12px", color: "#6B6354" }}>
            {audioFile
              ? <>Selected: <span style={{ color: "#A8421E" }}>{audioFile.name}</span></>
              : <>Drop audio here or <span style={{ color: "#A8421E", textDecoration: "underline", textUnderlineOffset: "2px" }}>browse</span></>}
          </div>
          <div style={{ fontFamily: SANS, fontSize: "11px", color: "#A89E86", marginTop: "5px" }}>
            MP3 · M4A · WAV · OGG · WEBM · 20MB max
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setAudioFile(f) }} />
      </div>

      {isSubmitting ? (
        <div style={{
          textAlign: "center",
          padding: "13px",
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: "15px",
          color: "#A8421E",
          letterSpacing: "0.01em",
        }}>
          Sending to press…
        </div>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!audioFile}
          style={{
            width: "100%", padding: "13px", border: "none",
            background: audioFile ? "#1A1A17" : "#B5AB92",
            color: "#F5F1E8", fontFamily: SANS, fontSize: "12px", fontWeight: 600,
            letterSpacing: "0.1em", textTransform: "uppercase",
            cursor: audioFile ? "pointer" : "not-allowed", marginTop: "8px",
          }}
        >
          Set in print →
        </button>
      )}
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
        if (data.status === "completed") { clearInterval(interval); onDone(data) }
        else if (data.status === "failed") { clearInterval(interval); onError(data.error_message || "Processing failed.") }
      } catch { clearInterval(interval); onError("Could not reach the server.") }
    }, 2000)
    return () => clearInterval(interval)
  }, [jobId, onDone, onError])

  const labels: Record<string, string> = {
    pending: "Setting up the press…",
    transcribing: "Transcribing your words…",
    processing: "Sorting into columns…",
  }

  return (
    <div style={{ padding: "80px 40px", textAlign: "center" }}>
      <div style={{ fontFamily: SANS, fontSize: "11px", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#A8421E", marginBottom: "20px" }}>
        Going to print
      </div>
      <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "22px", color: "#1A1A17", marginBottom: "28px" }}>
        {labels[status] || "Working…"}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
        {["pending", "transcribing", "processing"].map((s, i) => {
          const order = ["pending", "transcribing", "processing"]
          const active = order.indexOf(status) >= i
          return <div key={i} style={{ width: "40px", height: "2px", background: active ? "#A8421E" : "#D8D0BE", transition: "background 0.4s" }}/>
        })}
      </div>
    </div>
  )
}

function ResultsSection({ result, onReset }: {
  result: NonNullable<JobResult["result"]>
  onReset: () => void
}) {
  const catColor: Record<string, string> = {
    work: "#3C3489", health: "#0F6E56", personal: "#854F0B", self_help: "#72243E",
  }
  const catLabel: Record<string, string> = {
    work: "Work", health: "Health", personal: "Personal", self_help: "Self help",
  }
  const initials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

  const SecHead = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontFamily: SANS, fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#A8421E", margin: "32px 0 14px" }}>{children}</div>
  )

  return (
    <div style={{ padding: "40px", maxWidth: "680px", margin: "0 auto" }}>
      <div style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#8A7F68", marginBottom: "24px", paddingBottom: "14px", borderBottom: "0.5px solid #D8D0BE" }}>
        Filed {fmtDate(result.recorded_at)} · Transcribed from voice · {result.tasks.length} tasks · {result.decisions.length} decisions · {result.people.length} names
      </div>

      <SecHead>The Memo</SecHead>
      <p style={{ fontFamily: SERIF, fontSize: "16px", lineHeight: 1.65, color: "#2A2620" }}>
        <span style={{ fontSize: "52px", float: "left", lineHeight: 0.82, padding: "4px 8px 0 0", color: "#A8421E" }}>
          {result.transcript.charAt(0)}
        </span>
        {result.transcript.slice(1)}
      </p>

      <SecHead>In Summary</SecHead>
      <ul style={{ listStyle: "none" }}>
        {result.summary_points.map((p, i) => (
          <li key={i} style={{ fontFamily: SERIF, fontSize: "15px", lineHeight: 1.6, color: "#4A453A", padding: "6px 0 6px 20px", position: "relative", borderBottom: "0.5px solid #E5DECF" }}>
            <span style={{ position: "absolute", left: 0, color: "#A8421E", fontStyle: "italic" }}>§</span>{p}
          </li>
        ))}
      </ul>

      <SecHead>Tasks of Record</SecHead>
      {result.tasks.length === 0 && <div style={{ fontFamily: SERIF, fontStyle: "italic", color: "#A89E86", padding: "8px 0" }}>No tasks in this dispatch.</div>}
      {result.tasks.map((t, i) => (
        <div key={i} style={{ borderBottom: "0.5px solid #D8D0BE", padding: "18px 0", display: "flex", gap: "18px" }}>
          <div style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, color: "#A89E86", minWidth: "24px", paddingTop: "2px" }}>{String(i + 1).padStart(2, "0")}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", marginBottom: "4px" }}>
              <div style={{ fontFamily: SERIF, fontSize: "18px", color: "#1A1A17" }}>{t.title}</div>
              <div style={{ fontFamily: SANS, fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: catColor[t.type], whiteSpace: "nowrap" }}>{catLabel[t.type]}</div>
            </div>
            <div style={{ fontFamily: SERIF, fontSize: "14px", lineHeight: 1.55, color: "#6B6354", marginBottom: "8px" }}>{t.description}</div>
            <div style={{ fontFamily: SANS, fontSize: "11px", color: "#8A7F68", letterSpacing: "0.03em" }}>
              {t.characters.length > 0 && <>Assigned <b style={{ color: "#A8421E", fontWeight: 600 }}>{t.characters.map(c => c.name).join(", ")}</b></>}
              {t.characters.length > 0 && (t.deadline_iso || t.timeline_raw || t.priority) && <span style={{ color: "#C5BBA3", margin: "0 8px" }}>·</span>}
              {t.deadline_iso && <>Due <b style={{ color: "#A8421E", fontWeight: 600 }}>{fmtDate(t.deadline_iso)}</b></>}
              {t.timeline_raw && !t.deadline_iso && <>Timed <b style={{ color: "#A8421E", fontWeight: 600 }}>{t.timeline_raw}</b></>}
              {t.priority && (t.deadline_iso || t.timeline_raw) && <span style={{ color: "#C5BBA3", margin: "0 8px" }}>·</span>}
              {t.priority && <>Priority <b style={{ color: "#A8421E", fontWeight: 600 }}>{t.priority}</b></>}
            </div>
          </div>
        </div>
      ))}

      <SecHead>Decisions</SecHead>
      {result.decisions.length === 0 && <div style={{ fontFamily: SERIF, fontStyle: "italic", color: "#A89E86", padding: "8px 0" }}>No decisions were recorded in this dispatch.</div>}
      {result.decisions.map((d, i) => (
        <div key={i} style={{ borderBottom: "0.5px solid #D8D0BE", padding: "16px 0", display: "flex", gap: "18px" }}>
          <div style={{ fontSize: "18px", fontStyle: "italic", color: "#A8421E", minWidth: "24px", lineHeight: 1.2 }}>§</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: SERIF, fontSize: "16px", color: "#1A1A17", marginBottom: "3px" }}>{d.title}</div>
            {d.description && <div style={{ fontFamily: SERIF, fontSize: "14px", lineHeight: 1.55, color: "#6B6354" }}>{d.description}</div>}
          </div>
        </div>
      ))}

      <SecHead>Named Persons</SecHead>
      {result.people.length === 0 && <div style={{ fontFamily: SERIF, fontStyle: "italic", color: "#A89E86", padding: "8px 0" }}>No persons named in this dispatch.</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "18px 28px", marginTop: "8px" }}>
        {result.people.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "11px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "50%", border: "1px solid #1A1A17", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: "12px", fontStyle: "italic", color: "#1A1A17" }}>{initials(p.name)}</div>
            <div>
              <div style={{ fontFamily: SERIF, fontSize: "15px", color: "#1A1A17" }}>{p.name}</div>
              <div style={{ fontFamily: SANS, fontSize: "11px", color: "#8A7F68" }}>{p.role || p.affiliation || "Not specified"}</div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onReset} style={{
        width: "100%", padding: "13px", border: "1px solid #1A1A17", background: "transparent",
        color: "#1A1A17", fontFamily: SANS, fontSize: "11px", fontWeight: 600,
        letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", marginTop: "36px",
      }}>
        File another memo
      </button>
    </div>
  )
}