import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [signingIn, setSigningIn] = useState(false)
  const [jobs, setJobs] = useState([])
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [loading, setLoading] = useState(false)

  const assigneeOptions = [
    "Ed",
    "Rodney",
    "Ricky",
    "Jose",
    "Pope",
    "Josh",
    "Tom",
    "Phil",
    "Xavier",
    "Efrain"
  ]

  useEffect(() => {
    async function initializeAuth() {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession()

      setSession(currentSession)
      setAuthLoading(false)

      if (currentSession) {
        loadJobs()
      }
    }

    initializeAuth()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthError("")

      if (nextSession) {
        loadJobs()
      } else {
        setJobs([])
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function loadJobs() {
    const { data, error } = await supabase
      .from("work_orders")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.log("LOAD ERROR:", error)
    }

    setJobs(data || [])
  }

  function generateJobNumber() {
    return "JOB-" + Date.now()
  }

  function dmsToDecimal(degrees, minutes, seconds, direction) {
    const deg = Number(degrees)
    const min = Number(minutes)
    const sec = Number(seconds)

    if ([deg, min, sec].some(Number.isNaN)) return null

    let decimal = deg + min / 60 + sec / 3600
    if (direction === "S" || direction === "W") {
      decimal *= -1
    }

    return decimal
  }

  function parseCoordinates(value) {
    if (!value) return null

    const trimmed = value.trim()

    // Accept: 31.74786, -109.70128
    const decimalMatch = trimmed.match(
      /^([+-]?\d+(?:\.\d+)?)\s*[, ]\s*([+-]?\d+(?:\.\d+)?)$/
    )

    if (decimalMatch) {
      const lat = Number(decimalMatch[1])
      const lng = Number(decimalMatch[2])

      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { lat, lng }
      }
    }

    // Accept: 31°44'52.3"N 109°42'04.6"W
    const dmsMatch = trimmed.match(
      /(\d{1,3})\D+(\d{1,2})\D+(\d{1,2}(?:\.\d+)?)\D*([NS])\D+(\d{1,3})\D+(\d{1,2})\D+(\d{1,2}(?:\.\d+)?)\D*([EW])/i
    )

    if (!dmsMatch) return null

    const lat = dmsToDecimal(
      dmsMatch[1],
      dmsMatch[2],
      dmsMatch[3],
      dmsMatch[4].toUpperCase()
    )
    const lng = dmsToDecimal(
      dmsMatch[5],
      dmsMatch[6],
      dmsMatch[7],
      dmsMatch[8].toUpperCase()
    )

    if (lat == null || lng == null) return null

    return { lat, lng }
  }

  function buildMapLinks(locationValue) {
    if (!locationValue) return null

    const parsed = parseCoordinates(locationValue)

    if (parsed) {
      const query = `${parsed.lat},${parsed.lng}`
      return {
        apple: `https://maps.apple.com/?q=${encodeURIComponent(query)}`,
        google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      }
    }

    const encoded = encodeURIComponent(locationValue)
    return {
      apple: `https://maps.apple.com/?q=${encoded}`,
      google: `https://www.google.com/maps/search/?api=1&query=${encoded}`
    }
  }

  async function addJob() {
    if (!title) return

    setLoading(true)

    const { data, error } = await supabase
      .from("work_orders")
      .insert([
        {
          title: title,
          location: location,
          assigned_to: assignedTo || null,
          status: "Scheduled",
          job_number: generateJobNumber(),
          notes: ""
          // DO NOT send created_at unless your DB requires it
        }
      ])
      .select()

    if (error) {
      console.log("INSERT ERROR:", error)
    } else {
      console.log("INSERT SUCCESS:", data)
      setTitle("")
      setLocation("")
      setAssignedTo("")
      loadJobs()
    }

    setLoading(false)
  }

  async function signIn() {
    if (!email || !password) {
      setAuthError("Email and password are required.")
      return
    }

    setSigningIn(true)
    setAuthError("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setAuthError(error.message)
    }

    setSigningIn(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  if (authLoading) {
    return (
      <div style={{ padding: 20, fontFamily: "Arial" }}>
        <h1>Field Work Orders</h1>
        <p>Checking session...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div style={{ padding: 20, fontFamily: "Arial", maxWidth: 420 }}>
        <h1>Field Work Orders</h1>
        <h3>Sign In Required</h3>

        <div style={{ display: "grid", gap: 10 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={signIn} disabled={signingIn}>
            {signingIn ? "Signing in..." : "Sign In"}
          </button>

          {authError ? (
            <p style={{ color: "#b00020", margin: 0 }}>{authError}</p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Field Work Orders</h1>
      <p style={{ marginBottom: 10 }}>
        Signed in as {session.user.email}
        <button onClick={signOut} style={{ marginLeft: 10 }}>
          Sign Out
        </button>
      </p>

      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Job title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          placeholder={"Location (address or GPS like 31°44'52.3\"N 109°42'04.6\"W)"}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={{ marginLeft: 10, minWidth: 380 }}
        />

        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          style={{ marginLeft: 10 }}
        >
          <option value="">Assigned to</option>
          {assigneeOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <button
          onClick={addJob}
          disabled={loading}
          style={{ marginLeft: 10 }}
        >
          {loading ? "Adding..." : "+ New Job"}
        </button>
      </div>

      {jobs.length === 0 ? (
        <p>No jobs yet in database</p>
      ) : (
        jobs.map((job) => (
          <div key={job.id} style={{ marginBottom: 15 }}>
            {(() => {
              const links = buildMapLinks(job.location)

              return (
                <>
            <h3>{job.title}</h3>
            <p>Status: {job.status}</p>
            <p>Job #: {job.job_number}</p>
            <p>Assigned to: {job.assigned_to || "Unassigned"}</p>
            {job.location ? <p>Location: {job.location}</p> : null}
            {links ? (
              <p>
                Maps: <a href={links.apple} target="_blank" rel="noreferrer">Apple Maps</a>{" "}
                | <a href={links.google} target="_blank" rel="noreferrer">Google Maps</a>
              </p>
            ) : null}
                </>
              )
            })()}
          </div>
        ))
      )}
    </div>
  )
}