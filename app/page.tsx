"use client"

import { useState } from "react"

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
      <div style={{
        fontSize: "22px",
        fontWeight: 500,
        letterSpacing: "-0.03em",
        marginBottom: "2.5rem",
        color: "#0F2420",
      }}>
        vox<span style={{ color: "#1D9E75" }}>ake</span>
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
  return (
    <div>Upload section coming next</div>
  )
}