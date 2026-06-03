import { useEffect, useRef, useState } from "react"
import { supabase } from "./supabaseClient"
import "./App.css"

const DOCUMENT_BUCKET = "work-order-documents"
const WORK_ORDER_EVENTS_TABLE = "work_order_events"
const TIME_OFF_REQUESTS_TABLE = "employee_time_off_requests"
const TIME_OFF_NOTES_BUCKET = "time-off-notes"
const ADMIN_NOTIFICATION_EVENT_TYPES = ["employee_note_added", "status_changed"]
const NOTIFICATION_READ_STORAGE_PREFIX = "field-app:notification-read"
const EMPLOYEE_ROLE_CACHE_STORAGE_PREFIX = "field-app:employee-role-cache"
const DISPATCH_STATUS_LANES = ["Scheduled", "In Progress", "On Hold", "Paused", "Completed"]
const JOB_TEMPLATES = [
  {
    id: "video-survey",
    label: "Video Survey",
    title: "Video Survey",
    description: "Perform full video survey and capture anomalies.",
    checklist: [
      "Safety briefing completed",
      "Camera system checked and calibrated",
      "Full line survey recorded",
      "Anomalies documented with timestamp",
      "Before/During/After photos attached"
    ]
  },
  {
    id: "wash-well",
    label: "Wash Well",
    title: "Wash Well",
    description: "Wash well and verify flow and pressure conditions.",
    checklist: [
      "Safety setup complete",
      "Wash cycle completed",
      "Pressure readings logged",
      "Final inspection complete",
      "Before/During/After photos attached"
    ]
  },
  {
    id: "pump-service",
    label: "Pump Service",
    title: "Pump Service",
    description: "Service pump system and verify operation.",
    checklist: [
      "Lockout/tagout complete",
      "Pump components inspected",
      "Repairs/replacements recorded",
      "Function test passed",
      "Before/During/After photos attached"
    ]
  }
]
const CHECKIN_ACTIONS = {
  START_SHIFT: "Start Shift",
  ARRIVE_ON_SITE: "Arrive On Site",
  LEAVE_SITE: "Leave Site",
  COMPLETE_JOB: "Complete Job"
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [userRole, setUserRole] = useState(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [loginIdentifier, setLoginIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [signingIn, setSigningIn] = useState(false)
  const [forgotPasswordSending, setForgotPasswordSending] = useState(false)
  const [forgotPasswordNotice, setForgotPasswordNotice] = useState({ type: "", message: "" })
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(() => {
    if (typeof window === "undefined") return false
    const raw = `${window.location.hash || ""} ${window.location.search || ""}`.toLowerCase()
    return raw.includes("type=recovery")
  })
  const [resetPasswordValue, setResetPasswordValue] = useState("")
  const [resetPasswordConfirmValue, setResetPasswordConfirmValue] = useState("")
  const [resetPasswordSaving, setResetPasswordSaving] = useState(false)
  const [resetPasswordNotice, setResetPasswordNotice] = useState({ type: "", message: "" })
  const [firstLoginPasswordValue, setFirstLoginPasswordValue] = useState("")
  const [firstLoginPasswordConfirmValue, setFirstLoginPasswordConfirmValue] = useState("")
  const [firstLoginPasswordSaving, setFirstLoginPasswordSaving] = useState(false)
  const [firstLoginPasswordNotice, setFirstLoginPasswordNotice] = useState({
    type: "",
    message: ""
  })
  const [jobs, setJobs] = useState([])
  const [title, setTitle] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [notes, setNotes] = useState("")
  const [createFiles, setCreateFiles] = useState([])
  const [createFileInputKey, setCreateFileInputKey] = useState(0)
  const [createDocsNotice, setCreateDocsNotice] = useState({ type: "", message: "" })
  const [location, setLocation] = useState("")
  const [assignedTo, setAssignedTo] = useState([])
  const [scheduledDate, setScheduledDate] = useState("")
  const [createPhasesEnabled, setCreatePhasesEnabled] = useState(false)
  const [createPhaseRows, setCreatePhaseRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState("dashboard")
  const [dashboardFilter, setDashboardFilter] = useState("all")
  const [homeSearch, setHomeSearch] = useState("")
  const [selectedJobTemplateId, setSelectedJobTemplateId] = useState("")
  const [dispatchBoardMode, setDispatchBoardMode] = useState("status")
  const [dispatchShowMapPanel, setDispatchShowMapPanel] = useState(true)
  const [dispatchSelectedMapJobId, setDispatchSelectedMapJobId] = useState("")
  const [dispatchDraggingJobId, setDispatchDraggingJobId] = useState("")
  const [dispatchSavingJobId, setDispatchSavingJobId] = useState("")
  const [dispatchNotice, setDispatchNotice] = useState({ type: "", message: "" })
  const [completedSearch, setCompletedSearch] = useState("")
  const [billingStartDate, setBillingStartDate] = useState("")
  const [billingEndDate, setBillingEndDate] = useState("")
  const [expandedBillingEmployee, setExpandedBillingEmployee] = useState("")
  const [calendarAnchorDate, setCalendarAnchorDate] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), today.getDate())
  })
  const [calendarRange, setCalendarRange] = useState("week")
  const [calendarSearchDate, setCalendarSearchDate] = useState("")
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState("")
  const [calendarAssignJobId, setCalendarAssignJobId] = useState("")
  const [calendarAssigning, setCalendarAssigning] = useState(false)
  const [calendarAssignNotice, setCalendarAssignNotice] = useState({
    type: "",
    message: ""
  })
  const [timeOffRequests, setTimeOffRequests] = useState([])
  const [timeOffLoading, setTimeOffLoading] = useState(false)
  const [timeOffDate, setTimeOffDate] = useState("")
  const [timeOffReason, setTimeOffReason] = useState("")
  const [timeOffType, setTimeOffType] = useState("Day Off")
  const [showTimeOffForm, setShowTimeOffForm] = useState(false)
  const [doctorNoteFile, setDoctorNoteFile] = useState(null)
  const [doctorNoteFileName, setDoctorNoteFileName] = useState("")
  const [timeOffSaving, setTimeOffSaving] = useState(false)
  const [timeOffNotice, setTimeOffNotice] = useState({ type: "", message: "" })
  const [adminTimeOffRequests, setAdminTimeOffRequests] = useState([])
  const [adminTimeOffLoading, setAdminTimeOffLoading] = useState(false)
  const [adminNotifications, setAdminNotifications] = useState([])
  const [adminNotificationsLoading, setAdminNotificationsLoading] = useState(false)
  const [adminNotificationsNotice, setAdminNotificationsNotice] = useState({
    type: "",
    message: ""
  })
  const [showAdminNotifications, setShowAdminNotifications] = useState(false)
  const [showAllNotifications, setShowAllNotifications] = useState(false)
  const [adminNotificationHistory, setAdminNotificationHistory] = useState([])
  const [adminNotificationHistoryLoading, setAdminNotificationHistoryLoading] = useState(false)
  const [openedAdminNotificationIds, setOpenedAdminNotificationIds] = useState([])
  const [lastViewedNotificationAt, setLastViewedNotificationAt] = useState("")
  const [showEmployeeNotifications, setShowEmployeeNotifications] = useState(false)
  const [openedEmployeeNotificationIds, setOpenedEmployeeNotificationIds] = useState([])
  const [lastViewedEmployeeNotificationAt, setLastViewedEmployeeNotificationAt] = useState("")
  const [timeOffActionId, setTimeOffActionId] = useState("")
  const [openingDoctorNoteId, setOpeningDoctorNoteId] = useState("")
  const [approvedTimeOffRequests, setApprovedTimeOffRequests] = useState([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("")
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [editingJobId, setEditingJobId] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingJob, setDeletingJob] = useState(false)
  const [clockNow, setClockNow] = useState(Date.now())
  const [editNotice, setEditNotice] = useState({ type: "", message: "" })
  const [timerNotice, setTimerNotice] = useState({ type: "", message: "" })
  const [timerSaving, setTimerSaving] = useState(false)
  const [employeeJobNote, setEmployeeJobNote] = useState("")
  const [voiceListeningTarget, setVoiceListeningTarget] = useState("")
  const [voiceNotice, setVoiceNotice] = useState({ type: "", message: "" })
  const [employeeJobActionSaving, setEmployeeJobActionSaving] = useState(false)
  const [employeeJobActionNotice, setEmployeeJobActionNotice] = useState({
    type: "",
    message: ""
  })
  const [documents, setDocuments] = useState([])
  const [jobEvents, setJobEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [docsLoading, setDocsLoading] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [documentActionId, setDocumentActionId] = useState("")
  const [replacingDocumentId, setReplacingDocumentId] = useState("")
  const [docsNotice, setDocsNotice] = useState({ type: "", message: "" })
  const [nextPhaseAssignees, setNextPhaseAssignees] = useState([])
  const [nextPhaseSaving, setNextPhaseSaving] = useState(false)
  const [nextPhaseNotice, setNextPhaseNotice] = useState({ type: "", message: "" })
  const [assigningJobId, setAssigningJobId] = useState(null)
  const [employeeAssignNotice, setEmployeeAssignNotice] = useState({ type: "", message: "" })
  const [employees, setEmployees] = useState([])
  const [employeeLoading, setEmployeeLoading] = useState(false)
  const [newEmployeeName, setNewEmployeeName] = useState("")
  const [newEmployeeEmail, setNewEmployeeEmail] = useState("")
  const [newEmployeePhone, setNewEmployeePhone] = useState("")
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false)
  const [expandedEmployeeId, setExpandedEmployeeId] = useState("")
  const [editingInlineEmployeeId, setEditingInlineEmployeeId] = useState("")
  const [inlineEmployeeName, setInlineEmployeeName] = useState("")
  const [inlineEmployeeEmail, setInlineEmployeeEmail] = useState("")
  const [inlineEmployeePhone, setInlineEmployeePhone] = useState("")
  const [editingEmployeeName, setEditingEmployeeName] = useState("")
  const [editingEmployeeEmail, setEditingEmployeeEmail] = useState("")
  const [editingEmployeePhone, setEditingEmployeePhone] = useState("")
  const [employeeManageSaving, setEmployeeManageSaving] = useState(false)
  const [employeeManageNotice, setEmployeeManageNotice] = useState({
    type: "",
    message: ""
  })
  const [employeeAuthNotice, setEmployeeAuthNotice] = useState({
    type: "",
    message: ""
  })
  const [employeeRoleNotice, setEmployeeRoleNotice] = useState({
    type: "",
    message: ""
  })
  const [employeeRoleByEmail, setEmployeeRoleByEmail] = useState({})
  const [employeeRoleSaving, setEmployeeRoleSaving] = useState(false)
  const [sendingEmployeeAuthForId, setSendingEmployeeAuthForId] = useState("")
  const [sendLoginOnCreate, setSendLoginOnCreate] = useState(true)
  const [accountNameInput, setAccountNameInput] = useState("")
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountNotice, setAccountNotice] = useState({ type: "", message: "" })
  const voiceRecognitionRef = useRef(null)
  const [editForm, setEditForm] = useState({
    title: "",
    job_description: "",
    location: "",
    assigned_to: [],
    scheduled_date: "",
    status: "Scheduled",
    notes: ""
  })

  useEffect(() => {
    async function initializeAuth() {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession()

      setSession(currentSession)
      setAuthLoading(false)

      if (currentSession) {
        loadUserRole(currentSession.user.id)
        loadJobs()
        loadEmployees()
      } else {
        setUserRole(null)
        setRoleLoading(false)
      }
    }

    initializeAuth()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((authEvent, nextSession) => {
      setSession(nextSession)
      setAuthError("")

      if (authEvent === "PASSWORD_RECOVERY") {
        setPasswordRecoveryMode(true)
        setResetPasswordNotice({ type: "", message: "" })
      }

      if (authEvent === "SIGNED_OUT") {
        setPasswordRecoveryMode(false)
        setResetPasswordValue("")
        setResetPasswordConfirmValue("")
      }

      if (nextSession) {
        loadUserRole(nextSession.user.id)
        loadJobs()
        loadEmployees()
      } else {
        setJobs([])
        setEmployees([])
        setUserRole(null)
        setRoleLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const hasRunningTimers = jobs.some((job) => isTimerRunning(job))

    if (!hasRunningTimers) {
      return
    }

    const intervalId = window.setInterval(() => {
      setClockNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [jobs])

  useEffect(() => {
    return () => {
      if (voiceRecognitionRef.current) {
        try {
          voiceRecognitionRef.current.stop()
        } catch {
          // no-op
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!session) return

    const signedInEmailLocal = String(session.user?.email || "").toLowerCase().trim()
    const currentEmployeeProfileLocal = employees.find(
      (employee) => String(employee.email || "").toLowerCase().trim() === signedInEmailLocal
    )
    const isExplicitAdmin = userRole === "admin"
    const isExplicitEmployee = userRole === "employee"
    const isEmployeeUserLocal = isExplicitEmployee || Boolean(currentEmployeeProfileLocal)
    const appRoleLocal = isExplicitAdmin ? "admin" : "employee"

    if (appRoleLocal === "employee") {
      loadTimeOffRequests(signedInEmailLocal)
      loadApprovedTimeOffRequests()
      return
    }

    loadAdminTimeOffRequests()
    loadApprovedTimeOffRequests()
  }, [session, userRole, employees])

  useEffect(() => {
    if (!session) {
      setAdminNotifications([])
      return
    }

    const signedInEmailLocal = String(session.user?.email || "").toLowerCase().trim()
    const currentEmployeeProfileLocal = employees.find(
      (employee) => String(employee.email || "").toLowerCase().trim() === signedInEmailLocal
    )
    const isExplicitAdmin = userRole === "admin"
    const isExplicitEmployee = userRole === "employee"
    const isEmployeeUserLocal = isExplicitEmployee || Boolean(currentEmployeeProfileLocal)
    const appRoleLocal = isExplicitAdmin ? "admin" : "employee"

    if (appRoleLocal !== "admin") {
      setAdminNotifications([])
      return
    }

    loadAdminNotifications()

    const intervalId = window.setInterval(() => {
      loadAdminNotifications()
    }, 30000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [session, userRole, employees])

  useEffect(() => {
    const signedInEmail = normalizeEmployeeEmail(session?.user?.email)

    if (!signedInEmail) {
      setOpenedAdminNotificationIds([])
      setOpenedEmployeeNotificationIds([])
      return
    }

    const adminKey = `${NOTIFICATION_READ_STORAGE_PREFIX}:admin:${signedInEmail}`
    const employeeKey = `${NOTIFICATION_READ_STORAGE_PREFIX}:employee:${signedInEmail}`

    try {
      const storedAdmin = JSON.parse(window.localStorage.getItem(adminKey) || "[]")
      const storedEmployee = JSON.parse(window.localStorage.getItem(employeeKey) || "[]")

      setOpenedAdminNotificationIds(
        Array.isArray(storedAdmin) ? [...new Set(storedAdmin.map((id) => String(id)))] : []
      )
      setOpenedEmployeeNotificationIds(
        Array.isArray(storedEmployee)
          ? [...new Set(storedEmployee.map((id) => String(id)))]
          : []
      )
    } catch {
      setOpenedAdminNotificationIds([])
      setOpenedEmployeeNotificationIds([])
    }
  }, [session?.user?.id])

  useEffect(() => {
    const signedInEmail = normalizeEmployeeEmail(session?.user?.email)
    if (!signedInEmail) return

    const adminKey = `${NOTIFICATION_READ_STORAGE_PREFIX}:admin:${signedInEmail}`
    window.localStorage.setItem(adminKey, JSON.stringify(openedAdminNotificationIds))
  }, [session?.user?.id, session?.user?.email, openedAdminNotificationIds])

  useEffect(() => {
    const signedInEmail = normalizeEmployeeEmail(session?.user?.email)
    if (!signedInEmail) return

    const employeeKey = `${NOTIFICATION_READ_STORAGE_PREFIX}:employee:${signedInEmail}`
    window.localStorage.setItem(employeeKey, JSON.stringify(openedEmployeeNotificationIds))
  }, [session?.user?.id, session?.user?.email, openedEmployeeNotificationIds])

  useEffect(() => {
    const signedInEmail = normalizeEmployeeEmail(session?.user?.email)

    if (!signedInEmail) {
      setEmployeeRoleByEmail({})
      return
    }

    const roleCacheKey = `${EMPLOYEE_ROLE_CACHE_STORAGE_PREFIX}:${signedInEmail}`

    try {
      const stored = JSON.parse(window.localStorage.getItem(roleCacheKey) || "{}")
      if (stored && typeof stored === "object") {
        setEmployeeRoleByEmail(stored)
      } else {
        setEmployeeRoleByEmail({})
      }
    } catch {
      setEmployeeRoleByEmail({})
    }
  }, [session?.user?.id])

  useEffect(() => {
    const signedInEmail = normalizeEmployeeEmail(session?.user?.email)
    if (!signedInEmail) return

    const roleCacheKey = `${EMPLOYEE_ROLE_CACHE_STORAGE_PREFIX}:${signedInEmail}`
    window.localStorage.setItem(roleCacheKey, JSON.stringify(employeeRoleByEmail))
  }, [session?.user?.id, session?.user?.email, employeeRoleByEmail])

  async function loadJobs() {
    const { data, error } = await supabase
      .from("work_orders")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.log("LOAD ERROR:", error)
    }

    setJobs(data || [])

    if ((data || []).length > 0) {
      setSelectedJobId((current) => {
        if (current && (data || []).some((job) => job.id === current)) {
          return current
        }

        return data[0].id
      })
    } else {
      setSelectedJobId(null)
      setViewMode("dashboard")
    }
  }

  async function loadEmployees() {
    setEmployeeLoading(true)

    const { data, error } = await supabase
      .from("employees")
      .select("id, name, email, phone, created_at")
      .order("name", { ascending: true })

    if (error) {
      console.log("EMPLOYEE LOAD ERROR:", error)
      setEmployeeManageNotice({
        type: "error",
        message:
          "Could not load employees. Confirm table employees exists and RLS allows select/insert/update/delete."
      })
      setEmployees([])
      setEmployeeLoading(false)
      return
    }

    setEmployees(data || [])
    setEmployeeLoading(false)
  }

  async function loadUserRole(userId) {
    if (!userId) {
      setUserRole(null)
      setRoleLoading(false)
      return
    }

    setRoleLoading(true)

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      console.log("ROLE LOAD ERROR:", error)
      setUserRole(null)
      setRoleLoading(false)
      return
    }

    setUserRole(data?.role || null)
    setRoleLoading(false)
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

    const decimalMatch = trimmed.match(
      /^([+-]?\d+(?:\.\d+)?)\s*[, ]\s*([+-]?\d+(?:\.\d+)?)$/
    )

    if (decimalMatch) {
      const lat = Number(decimalMatch[1])
      const lng = Number(decimalMatch[2])

      if (
        !Number.isNaN(lat) &&
        !Number.isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        return { lat, lng }
      }
    }

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

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

    return { lat, lng }
  }

  function buildMapLinks(locationValue) {
    const normalizedLocation = String(locationValue || "")
      .trim()
      .replace(/\s+/g, " ")

    if (!normalizedLocation) return null

    const parsed = parseCoordinates(normalizedLocation)

    if (parsed) {
      const query = `${parsed.lat},${parsed.lng}`
      return {
        apple: `https://maps.apple.com/?q=${encodeURIComponent(query)}`,
        google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      }
    }

    const encoded = encodeURIComponent(normalizedLocation)
    return {
      apple: `https://maps.apple.com/?address=${encoded}&q=${encoded}`,
      google: `https://www.google.com/maps/search/?api=1&query=${encoded}`
    }
  }

  function buildMapEmbedUrl(locationValue) {
    const normalizedLocation = String(locationValue || "").trim()
    if (!normalizedLocation) return ""

    const parsed = parseCoordinates(normalizedLocation)
    const query = parsed ? `${parsed.lat},${parsed.lng}` : normalizedLocation
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
  }

  function buildTemplateChecklistText(template) {
    if (!template) return ""
    return template.checklist.map((item, index) => `${index + 1}. ${item}`).join("\n")
  }

  function applyJobTemplate(templateId) {
    const template = JOB_TEMPLATES.find((item) => item.id === templateId)
    setSelectedJobTemplateId(templateId)

    if (!template) return

    setTitle(template.title || "")
    setJobDescription(template.description || "")
    setNotes(`Template Checklist:\n${buildTemplateChecklistText(template)}`)
  }

  function startVoiceCapture(target) {
    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionApi) {
      setVoiceNotice({
        type: "error",
        message: "Voice capture is not supported in this browser."
      })
      return
    }

    if (voiceRecognitionRef.current) {
      try {
        voiceRecognitionRef.current.stop()
      } catch {
        // no-op
      }
      voiceRecognitionRef.current = null
    }

    const recognition = new SpeechRecognitionApi()
    recognition.lang = "en-US"
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript || "").trim()
      if (!transcript) return

      if (target === "create") {
        setNotes((current) => (current ? `${current}\n${transcript}` : transcript))
      } else if (target === "employee") {
        setEmployeeJobNote((current) => (current ? `${current}\n${transcript}` : transcript))
      }
    }

    recognition.onerror = (event) => {
      setVoiceNotice({
        type: "error",
        message: `Voice capture error: ${event.error || "Unknown error"}`
      })
      setVoiceListeningTarget("")
      voiceRecognitionRef.current = null
    }

    recognition.onend = () => {
      setVoiceListeningTarget("")
      voiceRecognitionRef.current = null
    }

    setVoiceNotice({ type: "", message: "" })
    setVoiceListeningTarget(target)
    voiceRecognitionRef.current = recognition
    recognition.start()
  }

  function stopVoiceCapture() {
    if (!voiceRecognitionRef.current) {
      setVoiceListeningTarget("")
      return
    }

    try {
      voiceRecognitionRef.current.stop()
    } catch {
      // no-op
    }

    voiceRecognitionRef.current = null
    setVoiceListeningTarget("")
  }

  function formatScheduledDate(value) {
    if (!value) return "Not set"

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return value
    }

    return parsed.toLocaleDateString()
  }

  function formatDateTime(value) {
    if (!value) return "Not set"
    const parsed = new Date(value)

    if (Number.isNaN(parsed.getTime())) {
      return value
    }

    return parsed.toLocaleString()
  }

  function formatEventLabel(event) {
    const metadata = event?.metadata || {}
    const type = String(event?.event_type || "")

    if (event?.event_label) return event.event_label

    if (type === "status_changed") {
      return `Status changed: ${metadata.from || "Unknown"} -> ${metadata.to || "Unknown"}`
    }

    if (type === "assignees_changed") {
      return `Assignees changed: ${metadata.to || "Unassigned"}`
    }

    if (type === "schedule_changed") {
      return `Schedule changed to ${metadata.to || "Not set"}`
    }

    return type ? type.replaceAll("_", " ") : "Event"
  }

  function parseTimeOffReasonDetails(value) {
    const raw = String(value || "").trim()
    const typeMatch = raw.match(/\[TYPE:([^\]]+)\]/i)
    const noteMatch = raw.match(/\[DOCTOR_NOTE:([^\]]+)\]/i)

    const cleaned = raw
      .replace(/\[TYPE:[^\]]+\]/gi, "")
      .replace(/\[DOCTOR_NOTE:[^\]]+\]/gi, "")
      .trim()

    return {
      type: typeMatch?.[1]?.trim() || "Day Off",
      doctorNotePath: noteMatch?.[1]?.trim() || "",
      displayReason: cleaned
    }
  }

  async function uploadDoctorNoteForTimeOff(employeeEmail, file) {
    if (!file) return ""

    const safeEmail = String(employeeEmail || "employee")
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "_")
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${safeEmail}/${Date.now()}-${safeName}`

    const { error } = await supabase.storage
      .from(TIME_OFF_NOTES_BUCKET)
      .upload(path, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream"
      })

    if (error) {
      throw new Error(error.message)
    }

    return path
  }

  async function openTimeOffDoctorNote(storagePath, requestId) {
    if (!storagePath) return

    setOpeningDoctorNoteId(requestId || "")

    const { data, error } = await supabase.storage
      .from(TIME_OFF_NOTES_BUCKET)
      .createSignedUrl(storagePath, 3600)

    if (error || !data?.signedUrl) {
      setTimeOffNotice({
        type: "error",
        message: `Could not open doctor note: ${error?.message || "Unknown error"}`
      })
      setOpeningDoctorNoteId("")
      return
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer")
    setOpeningDoctorNoteId("")
  }

  function parseCheckInEvents(notesValue) {
    const events = {
      START_SHIFT: "",
      ARRIVE_ON_SITE: "",
      LEAVE_SITE: "",
      COMPLETE_JOB: ""
    }

    const lines = String(notesValue || "").split("\n")

    lines.forEach((line) => {
      const match = line.match(
        /^\[CHECKIN:(START_SHIFT|ARRIVE_ON_SITE|LEAVE_SITE|COMPLETE_JOB)\]\s+(.+?)\s+\|/
      )

      if (!match) return
      events[match[1]] = match[2].trim()
    })

    return events
  }

  function extractUserNotes(notesValue) {
    return String(notesValue || "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("[CHECKIN:"))
      .join("\n")
      .trim()
  }

  function parseUserNoteEntries(notesValue) {
    const visibleNotes = extractUserNotes(notesValue)

    if (!visibleNotes) return []

    return visibleNotes
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const match = line.match(/^\[([^\]]+)\]\s*([^:]+):\s*(.+)$/)

        if (match) {
          return {
            id: `note-${index}-${match[1]}`,
            timestamp: match[1].trim(),
            author: match[2].trim(),
            text: match[3].trim()
          }
        }

        return {
          id: `note-${index}`,
          timestamp: "",
          author: "",
          text: line
        }
      })
  }

  function normalizeDateInput(value) {
    if (!value) return ""
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ""

    const year = parsed.getFullYear()
    const month = String(parsed.getMonth() + 1).padStart(2, "0")
    const day = String(parsed.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
  }

  function getLocalDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }

  function parseAssignees(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    }

    if (!value) return []

    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  function getJobPhaseInfo(job) {
    const rawJobNumber = String(job?.job_number || "").trim()
    const jobNumberMatch = rawJobNumber.match(/^(.*?)-P(\d+)$/i)
    const rootJobNumber = jobNumberMatch?.[1] || rawJobNumber || `JOB-${Date.now()}`
    const currentPhase = Number(jobNumberMatch?.[2] || 1)

    const rawTitle = String(job?.title || "Work Order")
    const baseTitle = rawTitle.replace(/\s*-\s*Phase\s+\d+\s*$/i, "").trim() || "Work Order"

    return {
      rootJobNumber,
      currentPhase,
      baseTitle
    }
  }

  function toggleNextPhaseAssignee(name) {
    setNextPhaseAssignees((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    )
  }

  function normalizeEmployeeName(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
  }

  function normalizeNameForComparison(value) {
    return normalizeEmployeeName(value).toLowerCase()
  }

  function normalizeLooseName(value) {
    return normalizeEmployeeName(value)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
  }

  function getEmployeeNameMatchCandidates(value) {
    const normalized = normalizeEmployeeName(value)
    if (!normalized) return []

    const noSuffix = normalized.replace(/\s*\([^)]*\)\s*$/g, "").trim()
    return Array.from(new Set([normalized, noSuffix].filter(Boolean).map(normalizeNameForComparison)))
  }

  function normalizeEmployeeEmail(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
  }

  function normalizeUsername(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
  }

  function getUsernameCandidatesForEmployee(employee) {
    const emailLocalPart = String(employee?.email || "")
      .toLowerCase()
      .split("@")[0]
    const normalizedName = normalizeEmployeeName(employee?.name || "")
    const compactName = normalizedName.replace(/\s+/g, "")

    return Array.from(
      new Set(
        [emailLocalPart, compactName, normalizedName]
          .map((value) => normalizeUsername(value))
          .filter(Boolean)
      )
    )
  }

  async function resolveLoginEmail(identifierValue) {
    const rawValue = String(identifierValue || "").trim()
    if (!rawValue) return { email: "", source: "missing" }

    const normalizedEmail = normalizeEmployeeEmail(rawValue)
    if (normalizedEmail.includes("@")) {
      return { email: normalizedEmail, source: "email" }
    }

    const targetUsername = normalizeUsername(rawValue)
    if (!targetUsername) {
      return { email: "", source: "invalid_username" }
    }

    const localMatch = employees.find((employee) => {
      const candidates = getUsernameCandidatesForEmployee(employee)
      return candidates.includes(targetUsername)
    })

    if (localMatch?.email) {
      return { email: normalizeEmployeeEmail(localMatch.email), source: "username_local" }
    }

    const rpcLookup = await supabase.rpc("lookup_login_email_by_username", {
      input_username: targetUsername
    })

    if (!rpcLookup.error && rpcLookup.data) {
      const rpcEmail = normalizeEmployeeEmail(String(rpcLookup.data || ""))
      if (rpcEmail && isValidEmail(rpcEmail)) {
        return { email: rpcEmail, source: "username_rpc" }
      }
    }

    const { data, error } = await supabase
      .from("employees")
      .select("email, name")
      .not("email", "is", null)

    if (error) {
      return { email: "", source: "username_lookup_failed", error }
    }

    const lookupMatch = (data || []).find((employee) => {
      const candidates = getUsernameCandidatesForEmployee(employee)
      return candidates.includes(targetUsername)
    })

    if (!lookupMatch?.email) {
      return { email: "", source: "username_not_found" }
    }

    return { email: normalizeEmployeeEmail(lookupMatch.email), source: "username_remote" }
  }

  function normalizeEmployeePhone(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
  }

  function isValidEmail(value) {
    if (!value) return true
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  function isAssignedToConstraintViolation(error) {
    const message = String(error?.message || "").toLowerCase()
    const details = String(error?.details || "").toLowerCase()
    const constraint = String(error?.constraint || "").toLowerCase()

    return (
      String(error?.code || "") === "23514" &&
      (message.includes("work_orders_assigned_to_check") ||
        details.includes("work_orders_assigned_to_check") ||
        constraint.includes("work_orders_assigned_to_check"))
    )
  }

  function normalizeRedirectBaseUrl(value) {
    const raw = String(value || "").trim()
    if (!raw) return ""

    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

    try {
      const parsed = new URL(withProtocol)
      return parsed.origin
    } catch {
      return ""
    }
  }

  function isLocalhostHostname(hostname) {
    const value = String(hostname || "").trim().toLowerCase()
    return value === "localhost" || value === "127.0.0.1" || value === "::1"
  }

  function getAuthRedirectUrl() {
    const configured =
      normalizeRedirectBaseUrl(import.meta.env.VITE_AUTH_REDIRECT_URL) ||
      normalizeRedirectBaseUrl(import.meta.env.VITE_APP_URL) ||
      normalizeRedirectBaseUrl(import.meta.env.VITE_PUBLIC_APP_URL) ||
      normalizeRedirectBaseUrl(import.meta.env.VITE_VERCEL_PROJECT_PRODUCTION_URL) ||
      normalizeRedirectBaseUrl(import.meta.env.VITE_VERCEL_URL)

    if (configured) return configured

    const currentOrigin = normalizeRedirectBaseUrl(window.location.origin)
    if (!currentOrigin) return ""

    try {
      const currentHost = new URL(currentOrigin).hostname
      if (isLocalhostHostname(currentHost)) {
        return ""
      }
    } catch {
      return ""
    }

    return currentOrigin
  }

  async function sendEmployeeLoginLink(email, employeeName = "Employee") {
    const normalizedEmail = normalizeEmployeeEmail(email)

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setEmployeeAuthNotice({
        type: "error",
        message: "Please set a valid employee email before sending a login link."
      })
      return false
    }

    const authRedirectUrl = getAuthRedirectUrl()
    if (!authRedirectUrl) {
      setEmployeeAuthNotice({
        type: "error",
        message:
          "Login link not sent. Configure VITE_AUTH_REDIRECT_URL (or VITE_APP_URL) to your deployed app URL so links do not use localhost."
      })
      return false
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: authRedirectUrl,
        shouldCreateUser: true,
        data: {
          needs_password_setup: true
        }
      }
    })

    if (error) {
      setEmployeeAuthNotice({
        type: "error",
        message: `Could not send login link: ${error.message}`
      })
      return false
    }

    setEmployeeAuthNotice({
      type: "success",
      message: `Login link sent to ${employeeName} (${normalizedEmail}). Redirect: ${authRedirectUrl}`
    })
    return true
  }

  async function changeEmployeeRoleByEmail(employee, targetRole) {
    if (!employee || employee.isLegacy) {
      setEmployeeRoleNotice({
        type: "error",
        message: "Create a real employee record before changing role."
      })
      return
    }

    const normalizedEmail = normalizeEmployeeEmail(employee.email)
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setEmployeeRoleNotice({
        type: "error",
        message: "Set a valid employee email before changing role."
      })
      return
    }

    if (!["admin", "employee"].includes(targetRole)) {
      setEmployeeRoleNotice({
        type: "error",
        message: "Unsupported role selection."
      })
      return
    }

    setEmployeeRoleSaving(true)
    setEmployeeRoleNotice({ type: "", message: "" })

    const { error } = await supabase.rpc("set_user_role_by_email", {
      target_email: normalizedEmail,
      target_role: targetRole
    })

    if (error) {
      const functionMissing =
        error.code === "PGRST202" ||
        String(error.message || "").toLowerCase().includes("set_user_role_by_email")

      if (functionMissing) {
        setEmployeeRoleNotice({
          type: "error",
          message:
            "Role update function is not installed yet. Ask setup to run SQL for RPC set_user_role_by_email."
        })
      } else {
        setEmployeeRoleNotice({
          type: "error",
          message: `Could not update role: ${error.message}`
        })
      }

      setEmployeeRoleSaving(false)
      return
    }

    setEmployeeRoleNotice({
      type: "success",
      message: `${employee.name} is now ${targetRole}.`
    })

    setEmployeeRoleByEmail((current) => ({
      ...current,
      [normalizedEmail]: targetRole
    }))

    const signedInEmail = normalizeEmployeeEmail(session?.user?.email)
    if (signedInEmail && signedInEmail === normalizedEmail && session?.user?.id) {
      await loadUserRole(session.user.id)
    }

    setEmployeeRoleSaving(false)
  }

  function getEmployeeRoleLabel(employee, signedInEmail, signedInRole) {
    if (!employee || employee.isLegacy) return "legacy"

    const employeeEmail = normalizeEmployeeEmail(employee.email)
    if (!employeeEmail) return "employee"

    const cachedRole = String(employeeRoleByEmail[employeeEmail] || "").trim().toLowerCase()
    if (cachedRole === "admin" || cachedRole === "employee") {
      return cachedRole
    }

    if (employeeEmail === signedInEmail) {
      const normalizedSignedInRole = String(signedInRole || "").trim().toLowerCase()
      if (normalizedSignedInRole === "admin" || normalizedSignedInRole === "employee") {
        return normalizedSignedInRole
      }
    }

    return "employee"
  }

  async function addEmployeeOption() {
    const normalized = normalizeEmployeeName(newEmployeeName)
    const normalizedEmail = normalizeEmployeeEmail(newEmployeeEmail)
    const normalizedPhone = normalizeEmployeePhone(newEmployeePhone)

    if (!normalized) {
      setEmployeeManageNotice({
        type: "error",
        message: "Employee name is required."
      })
      return
    }

    if (!isValidEmail(normalizedEmail)) {
      setEmployeeManageNotice({
        type: "error",
        message: "Please enter a valid email address."
      })
      return
    }

    const nameExists = employees.some(
      (employee) => String(employee.name || "").toLowerCase() === normalized.toLowerCase()
    )

    if (nameExists) {
      setEmployeeManageNotice({
        type: "error",
        message: "Employee name already exists."
      })
      return
    }

    const emailExists =
      normalizedEmail &&
      employees.some(
        (employee) =>
          String(employee.email || "").toLowerCase() === normalizedEmail.toLowerCase()
      )

    if (emailExists) {
      setEmployeeManageNotice({
        type: "error",
        message: "Employee email already exists."
      })
      return
    }

    setEmployeeManageSaving(true)

    const { error } = await supabase.from("employees").insert([
      {
        name: normalized,
        email: normalizedEmail || null,
        phone: normalizedPhone || null
      }
    ])

    if (error) {
      setEmployeeManageNotice({
        type: "error",
        message: `Could not add employee: ${error.message}`
      })
      setEmployeeManageSaving(false)
      return
    }

    await loadEmployees()

    if (sendLoginOnCreate && normalizedEmail) {
      await sendEmployeeLoginLink(normalizedEmail, normalized)
    }

    setNewEmployeeName("")
    setNewEmployeeEmail("")
    setNewEmployeePhone("")
    setEmployeeManageNotice({
      type: "success",
      message: `${normalized} added successfully.`
    })
    setEmployeeManageSaving(false)
  }

  async function createEmployeeRecordFromLegacy(legacyName) {
    const normalized = normalizeEmployeeName(legacyName)
    if (!normalized) return

    const exists = employees.some(
      (employee) => String(employee.name || "").toLowerCase() === normalized.toLowerCase()
    )

    if (exists) {
      setEmployeeManageNotice({
        type: "error",
        message: `${normalized} already exists as an employee.`
      })
      return
    }

    setEmployeeManageSaving(true)
    setEmployeeManageNotice({ type: "", message: "" })

    const { data, error } = await supabase
      .from("employees")
      .insert([
        {
          name: normalized,
          email: null,
          phone: null
        }
      ])
      .select()
      .maybeSingle()

    if (error) {
      setEmployeeManageNotice({
        type: "error",
        message: `Could not create employee record: ${error.message}`
      })
      setEmployeeManageSaving(false)
      return
    }

    await loadEmployees()
    await loadJobs()

    if (data?.id) {
      setExpandedEmployeeId(data.id)
      startInlineEmployeeEdit({
        id: data.id,
        name: normalized,
        email: "",
        phone: ""
      })
    }

    setEmployeeManageNotice({
      type: "success",
      message: `${normalized} is now a real employee record and can be edited.`
    })
    setEmployeeManageSaving(false)
  }

  async function renameEmployeeOption() {
    const success = await updateEmployeeById(selectedEmployeeId, {
      name: editingEmployeeName,
      email: editingEmployeeEmail,
      phone: editingEmployeePhone
    })

    if (success) {
      const normalizedName = normalizeEmployeeName(editingEmployeeName)
      const normalizedEmail = normalizeEmployeeEmail(editingEmployeeEmail)
      const normalizedPhone = normalizeEmployeePhone(editingEmployeePhone)
      setEditingEmployeeName(normalizedName)
      setEditingEmployeeEmail(normalizedEmail)
      setEditingEmployeePhone(normalizedPhone)
    }
  }

  async function removeEmployeeOption() {
    const success = await removeEmployeeById(selectedEmployeeId)
    if (!success) return

    setSelectedEmployeeId("")
    setEditingEmployeeName("")
    setEditingEmployeeEmail("")
    setEditingEmployeePhone("")
  }

  async function updateEmployeeById(employeeId, nextValues) {
    const targetEmployee = employees.find((employee) => employee.id === employeeId)
    if (!targetEmployee) return

    const normalizedName = normalizeEmployeeName(nextValues?.name)
    const normalizedEmail = normalizeEmployeeEmail(nextValues?.email)
    const normalizedPhone = normalizeEmployeePhone(nextValues?.phone)

    if (!normalizedName) {
      setEmployeeManageNotice({ type: "error", message: "Employee name is required." })
      return false
    }

    if (!isValidEmail(normalizedEmail)) {
      setEmployeeManageNotice({
        type: "error",
        message: "Please enter a valid email address."
      })
      return false
    }

    const duplicateName = employees.some(
      (employee) =>
        employee.id !== employeeId &&
        String(employee.name || "").toLowerCase() === normalizedName.toLowerCase()
    )

    if (duplicateName) {
      setEmployeeManageNotice({ type: "error", message: "Employee name already exists." })
      return false
    }

    const duplicateEmail =
      normalizedEmail &&
      employees.some(
        (employee) =>
          employee.id !== employeeId &&
          String(employee.email || "").toLowerCase() === normalizedEmail.toLowerCase()
      )

    if (duplicateEmail) {
      setEmployeeManageNotice({ type: "error", message: "Employee email already exists." })
      return false
    }

    setEmployeeManageSaving(true)

    const previousName = String(targetEmployee.name || "")

    const { error: employeeError } = await supabase
      .from("employees")
      .update({
        name: normalizedName,
        email: normalizedEmail || null,
        phone: normalizedPhone || null
      })
      .eq("id", employeeId)

    if (employeeError) {
      setEmployeeManageNotice({
        type: "error",
        message: `Could not update employee: ${employeeError.message}`
      })
      setEmployeeManageSaving(false)
      return false
    }

    if (previousName.toLowerCase() !== normalizedName.toLowerCase()) {
      const jobsToUpdate = jobs.filter((job) =>
        parseAssignees(job.assigned_to).some(
          (name) => name.toLowerCase() === previousName.toLowerCase()
        )
      )

      for (const job of jobsToUpdate) {
        const updatedAssignees = parseAssignees(job.assigned_to).map((name) =>
          name.toLowerCase() === previousName.toLowerCase() ? normalizedName : name
        )

        const { error: jobUpdateError } = await supabase
          .from("work_orders")
          .update({ assigned_to: serializeAssignees(updatedAssignees) })
          .eq("id", job.id)

        if (jobUpdateError) {
          setEmployeeManageNotice({
            type: "error",
            message: `Employee updated but job assignment rename failed: ${jobUpdateError.message}`
          })
          setEmployeeManageSaving(false)
          await loadEmployees()
          await loadJobs()
          return false
        }
      }
    }

    await loadEmployees()
    await loadJobs()
    setEmployeeManageNotice({ type: "success", message: "Employee updated successfully." })
    setEmployeeManageSaving(false)
    return true
  }

  async function removeEmployeeById(employeeId) {
    const targetEmployee = employees.find((employee) => employee.id === employeeId)
    if (!targetEmployee) return false

    const confirmed = window.confirm(
      `Remove ${targetEmployee.name}? This will also unassign this employee from all work orders.`
    )

    if (!confirmed) return false

    setEmployeeManageSaving(true)

    const targetName = String(targetEmployee.name || "")
    const jobsToUpdate = jobs.filter((job) =>
      parseAssignees(job.assigned_to).some(
        (name) => name.toLowerCase() === targetName.toLowerCase()
      )
    )

    for (const job of jobsToUpdate) {
      const updatedAssignees = parseAssignees(job.assigned_to).filter(
        (name) => name.toLowerCase() !== targetName.toLowerCase()
      )

      const { error: jobUpdateError } = await supabase
        .from("work_orders")
        .update({ assigned_to: serializeAssignees(updatedAssignees) })
        .eq("id", job.id)

      if (jobUpdateError) {
        setEmployeeManageNotice({
          type: "error",
          message: `Could not unassign from work orders: ${jobUpdateError.message}`
        })
        setEmployeeManageSaving(false)
        return false
      }
    }

    const { error } = await supabase.from("employees").delete().eq("id", employeeId)

    if (error) {
      setEmployeeManageNotice({
        type: "error",
        message: `Could not remove employee: ${error.message}`
      })
      setEmployeeManageSaving(false)
      return false
    }

    await loadEmployees()
    await loadJobs()
    setEmployeeManageNotice({ type: "success", message: "Employee removed successfully." })
    setEmployeeManageSaving(false)
    return true
  }

  function startInlineEmployeeEdit(employee) {
    setEmployeeManageNotice({ type: "", message: "" })
    setEditingInlineEmployeeId(employee.id)
    setInlineEmployeeName(employee.name || "")
    setInlineEmployeeEmail(employee.email || "")
    setInlineEmployeePhone(employee.phone || "")
  }

  function cancelInlineEmployeeEdit() {
    setEditingInlineEmployeeId("")
    setInlineEmployeeName("")
    setInlineEmployeeEmail("")
    setInlineEmployeePhone("")
  }

  async function saveInlineEmployeeOption(employeeId) {
    const success = await updateEmployeeById(employeeId, {
      name: inlineEmployeeName,
      email: inlineEmployeeEmail,
      phone: inlineEmployeePhone
    })

    if (success) {
      cancelInlineEmployeeEdit()
    }
  }

  async function removeInlineEmployeeOption(employeeId) {
    const success = await removeEmployeeById(employeeId)
    if (!success) return

    if (editingInlineEmployeeId === employeeId) {
      cancelInlineEmployeeEdit()
    }

    if (expandedEmployeeId === employeeId) {
      setExpandedEmployeeId("")
    }
  }

  async function sendLoginForSelectedEmployee() {
    if (!selectedEmployeeSummary || selectedEmployeeSummary.isLegacy) {
      setEmployeeAuthNotice({
        type: "error",
        message: "Create a real employee record first to send a login link."
      })
      return
    }

    setSendingEmployeeAuthForId(selectedEmployeeSummary.id)
    await sendEmployeeLoginLink(selectedEmployeeSummary.email, selectedEmployeeSummary.name)
    setSendingEmployeeAuthForId("")
  }

  function isAllowedDocumentType(file) {
    if (!file || !file.type) return false
    return file.type === "application/pdf" || file.type.startsWith("image/")
  }

  function serializeAssignees(values) {
    const cleaned = parseAssignees(values)
    return cleaned.length > 0 ? cleaned.join(", ") : null
  }

  function formatAssignees(value) {
    const names = parseAssignees(value)
    return names.length > 0 ? names.join(", ") : "Unassigned"
  }

  function getStatusPillClass(status) {
    const normalized = String(status || "").trim().toLowerCase()

    if (normalized === "on hold") return "status-pill--on-hold"
    if (normalized === "in progress") return "status-pill--in-progress"
    if (normalized === "paused") return "status-pill--paused"
    if (normalized === "completed") return "status-pill--completed"

    return "status-pill--scheduled"
  }

  function getTimerAccumulatedSeconds(job) {
    const value = Number(job?.timer_accumulated_seconds || 0)
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
  }

  function isTimerRunning(job) {
    return Boolean(job?.timer_is_running)
  }

  function getTimerStartedAtMs(job) {
    if (!job?.timer_started_at) return null
    const parsed = new Date(job.timer_started_at).getTime()
    return Number.isNaN(parsed) ? null : parsed
  }

  function getElapsedSeconds(job, nowMs = Date.now()) {
    const base = getTimerAccumulatedSeconds(job)
    if (!isTimerRunning(job)) return base

    const startedAt = getTimerStartedAtMs(job)
    if (!startedAt) return base

    const extra = Math.max(0, Math.floor((nowMs - startedAt) / 1000))
    return base + extra
  }

  function formatDuration(totalSeconds) {
    const safe = Math.max(0, Math.floor(Number(totalSeconds || 0)))
    const hours = Math.floor(safe / 3600)
    const minutes = Math.floor((safe % 3600) / 60)
    const seconds = safe % 60

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  function formatJobOptionLabel(job) {
    const title = String(job.title || "Work Order")
    const shortTitle = title.length > 22 ? `${title.slice(0, 22)}...` : title
    const jobNumber = job.job_number || "No #"
    return `${jobNumber} - ${shortTitle}`
  }

  function sameAssignees(a, b) {
    const normalizedA = parseAssignees(a).sort().join("|")
    const normalizedB = parseAssignees(b).sort().join("|")
    return normalizedA === normalizedB
  }

  function toggleCreateAssignee(name) {
    setAssignedTo((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    )
  }

  function toggleEditAssignee(name) {
    setEditForm((current) => ({
      ...current,
      assigned_to: current.assigned_to.includes(name)
        ? current.assigned_to.filter((item) => item !== name)
        : [...current.assigned_to, name]
    }))
  }

  function addCreatePhaseRow() {
    setCreatePhaseRows((current) => [
      ...current,
      {
        id: `phase-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: "",
        assignees: [],
        scheduledDate: ""
      }
    ])
  }

  function removeCreatePhaseRow(phaseId) {
    setCreatePhaseRows((current) => current.filter((phase) => phase.id !== phaseId))
  }

  function updateCreatePhaseRow(phaseId, field, value) {
    setCreatePhaseRows((current) =>
      current.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              [field]: value
            }
          : phase
      )
    )
  }

  function toggleCreatePhaseAssignee(phaseId, name) {
    setCreatePhaseRows((current) =>
      current.map((phase) => {
        if (phase.id !== phaseId) return phase

        return {
          ...phase,
          assignees: phase.assignees.includes(name)
            ? phase.assignees.filter((item) => item !== name)
            : [...phase.assignees, name]
        }
      })
    )
  }

  function startEditing(job) {
    setEditNotice({ type: "", message: "" })
    setEditingJobId(job.id)
    setEditForm({
      title: job.title || "",
      job_description: job.job_description || "",
      location: job.location || "",
      assigned_to: parseAssignees(job.assigned_to),
      scheduled_date: normalizeDateInput(job.scheduled_date),
      status: job.status || "Scheduled",
      notes: job.notes || ""
    })
  }

  async function loadDocuments(jobId) {
    if (!jobId) {
      setDocuments([])
      return
    }

    setDocsLoading(true)

    const { data, error } = await supabase
      .from("work_order_documents")
      .select("*")
      .eq("work_order_id", jobId)
      .order("created_at", { ascending: false })

    if (error) {
      console.log("LOAD DOCUMENTS ERROR:", error)
      setDocsNotice({
        type: "error",
        message:
          "Could not load documents. Confirm table work_order_documents exists and RLS allows select."
      })
      setDocuments([])
    } else {
      setDocuments(data || [])
    }

    setDocsLoading(false)
  }

  async function loadJobEvents(jobId) {
    if (!jobId) {
      setJobEvents([])
      return
    }

    setEventsLoading(true)

    const { data, error } = await supabase
      .from(WORK_ORDER_EVENTS_TABLE)
      .select("*")
      .eq("work_order_id", jobId)
      .order("created_at", { ascending: false })

    if (error) {
      console.log("LOAD EVENTS ERROR:", error)
      setJobEvents([])
      setEventsLoading(false)
      return
    }

    setJobEvents(data || [])
    setEventsLoading(false)
  }

  async function logWorkOrderEvent({
    workOrderId,
    eventType,
    eventLabel,
    metadata = {}
  }) {
    if (!workOrderId || !eventType) return

    const actorName = currentEmployeeName || session?.user?.email || "System"
    const actorEmail = session?.user?.email || null

    const { error } = await supabase.from(WORK_ORDER_EVENTS_TABLE).insert([
      {
        work_order_id: workOrderId,
        event_type: eventType,
        event_label: eventLabel || null,
        actor_name: actorName,
        actor_email: actorEmail,
        metadata
      }
    ])

    if (error) {
      console.log("LOG EVENT ERROR:", error)
      return
    }

    if (selectedJobId === workOrderId) {
      await loadJobEvents(workOrderId)
    }
  }

  function cancelEditing() {
    setEditingJobId(null)
    setEditForm({
      title: "",
      job_description: "",
      location: "",
      assigned_to: [],
      scheduled_date: "",
      status: "Scheduled",
      notes: ""
    })
  }

  function openJobDetails(jobId) {
    if (appRole === "employee") {
      const job = jobs.find((item) => item.id === jobId)
      const isAssignedToCurrentEmployee = isAssignedToCurrentUser(job?.assigned_to)

      if (!isAssignedToCurrentEmployee) {
        return
      }
    }

    setSelectedJobId(jobId)
    setEmployeeJobNote("")
    setEmployeeJobActionNotice({ type: "", message: "" })
    setNextPhaseAssignees([])
    setNextPhaseNotice({ type: "", message: "" })
    setViewMode("details")
    setDocsNotice({ type: "", message: "" })
    loadDocuments(jobId)
    loadJobEvents(jobId)
  }

  function goBackToDashboard() {
    setEditNotice({ type: "", message: "" })
    setDocsNotice({ type: "", message: "" })
    cancelEditing()
    setEmployeeJobNote("")
    setEmployeeJobActionNotice({ type: "", message: "" })
    setNextPhaseAssignees([])
    setNextPhaseNotice({ type: "", message: "" })
    setJobEvents([])
    setViewMode("dashboard")
  }

  function openCreateView() {
    setCreatePhasesEnabled(false)
    setCreatePhaseRows([])
    setViewMode("create")
  }

  function openDashboardView() {
    setViewMode("dashboard")
  }

  function openAccountView() {
    setAccountNotice({ type: "", message: "" })
    setAccountNameInput(accountDisplayName)
    setViewMode("account")
  }

  function openEmployeesView() {
    setSelectedEmployeeId("")
    setEditingEmployeeName("")
    setEditingEmployeeEmail("")
    setEditingEmployeePhone("")
    setEditingInlineEmployeeId("")
    setInlineEmployeeName("")
    setInlineEmployeeEmail("")
    setInlineEmployeePhone("")
    setViewMode("employees")
  }

  function openCalendarView() {
    const today = new Date()
    const todayKey = getLocalDateKey(today)
    setCalendarAnchorDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()))
    setCalendarSearchDate(todayKey)
    setSelectedCalendarDateKey(todayKey)
    setViewMode("calendar")
  }

  function openCompletedView() {
    setViewMode("completed")
  }

  function openBillingView() {
    setViewMode("billing")
  }

  function openDispatchView() {
    setDispatchBoardMode("status")
    setDispatchNotice({ type: "", message: "" })
    setViewMode("dispatch")
  }

  function selectCalendarDate(dateKey) {
    setSelectedCalendarDateKey((current) => (current === dateKey ? "" : dateKey))
    setCalendarSearchDate(dateKey)
    setCalendarAssignJobId("")
    setCalendarAssignNotice({ type: "", message: "" })
  }

  function openEmployeeDetails(employeeId) {
    setEmployeeAssignNotice({ type: "", message: "" })
    setEmployeeManageNotice({ type: "", message: "" })
    setSelectedEmployeeId(employeeId)

    const employee = employees.find((item) => item.id === employeeId)
    setEditingEmployeeName(employee?.name || "")
    setEditingEmployeeEmail(employee?.email || "")
    setEditingEmployeePhone(employee?.phone || "")
    setViewMode("employee-details")
  }

  function goBackToEmployees() {
    setEmployeeAssignNotice({ type: "", message: "" })
    setEmployeeManageNotice({ type: "", message: "" })
    setViewMode("employees")
  }

  function goToPreviousCalendarMonth() {
    const moveDays = calendarRange === "week" ? -7 : -30
    setCalendarAnchorDate(
      (current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + moveDays)
    )
  }

  function goToNextCalendarMonth() {
    const moveDays = calendarRange === "week" ? 7 : 30
    setCalendarAnchorDate(
      (current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + moveDays)
    )
  }

  function jumpToCalendarDate(value) {
    const normalized = normalizeDateInput(value)
    if (!normalized) return

    setCalendarSearchDate(normalized)
    setSelectedCalendarDateKey(normalized)
    setCalendarAssignJobId("")
    setCalendarAssignNotice({ type: "", message: "" })

    const parsed = new Date(`${normalized}T00:00:00`)
    if (!Number.isNaN(parsed.getTime())) {
      setCalendarAnchorDate(new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()))
    }
  }

  async function assignWorkOrderToCalendarDate() {
    if (!selectedCalendarDateKey || !calendarAssignJobId) return

    const targetJob = jobs.find((job) => job.id === calendarAssignJobId)
    const unavailableAssignees = parseAssignees(targetJob?.assigned_to).filter((name) =>
      isEmployeeUnavailableOnDate(name, selectedCalendarDateKey)
    )

    if (unavailableAssignees.length > 0) {
      setCalendarAssignNotice({
        type: "error",
        message: `Cannot schedule on this date. Unavailable: ${unavailableAssignees.join(", ")}`
      })
      return
    }

    setCalendarAssigning(true)
    setCalendarAssignNotice({ type: "", message: "" })

    const { error } = await supabase
      .from("work_orders")
      .update({ scheduled_date: selectedCalendarDateKey })
      .eq("id", calendarAssignJobId)

    if (error) {
      setCalendarAssignNotice({
        type: "error",
        message: `Could not assign date: ${error.message}`
      })
    } else {
      await logWorkOrderEvent({
        workOrderId: calendarAssignJobId,
        eventType: "schedule_changed",
        eventLabel: `Scheduled for ${selectedCalendarDateKey}`,
        metadata: { to: selectedCalendarDateKey }
      })
      await loadJobs()
      setCalendarAssignNotice({
        type: "success",
        message: "Work order scheduled successfully."
      })
      setCalendarAssignJobId("")
    }

    setCalendarAssigning(false)
  }

  async function loadTimeOffRequests(employeeEmail) {
    if (!employeeEmail) {
      setTimeOffRequests([])
      return
    }

    setTimeOffLoading(true)

    const { data, error } = await supabase
      .from(TIME_OFF_REQUESTS_TABLE)
      .select("*")
      .eq("employee_email", employeeEmail)
      .order("request_date", { ascending: false })

    if (error) {
      console.log("LOAD TIME OFF ERROR:", error)
      setTimeOffNotice({
        type: "error",
        message:
          "Could not load time-off requests. Confirm table employee_time_off_requests exists and RLS allows access."
      })
      setTimeOffRequests([])
      setTimeOffLoading(false)
      return
    }

    setTimeOffRequests(data || [])
    setTimeOffLoading(false)
  }

  async function loadAdminTimeOffRequests() {
    setAdminTimeOffLoading(true)

    const { data, error } = await supabase
      .from(TIME_OFF_REQUESTS_TABLE)
      .select("*")
      .order("request_date", { ascending: true })

    if (error) {
      console.log("LOAD ADMIN TIME OFF ERROR:", error)
      setTimeOffNotice({
        type: "error",
        message:
          "Could not load time-off requests for admin. Confirm RLS allows admin select."
      })
      setAdminTimeOffRequests([])
      setAdminTimeOffLoading(false)
      return
    }

    setAdminTimeOffRequests(data || [])
    setAdminTimeOffLoading(false)
  }

  async function loadAdminNotifications() {
    setAdminNotificationsLoading(true)

    const { data, error } = await supabase
      .from(WORK_ORDER_EVENTS_TABLE)
      .select("*")
      .in("event_type", ADMIN_NOTIFICATION_EVENT_TYPES)
      .order("created_at", { ascending: false })
      .limit(30)

    if (error) {
      console.log("LOAD ADMIN NOTIFICATIONS ERROR:", error)
      setAdminNotificationsNotice({
        type: "error",
        message: `Could not load admin notifications: ${error.message}${error.code ? ` (code ${error.code})` : ""}`
      })
      setAdminNotifications([])
      setAdminNotificationsLoading(false)
      return
    }

    setAdminNotificationsNotice({ type: "", message: "" })
    setAdminNotifications(data || [])
    setAdminNotificationsLoading(false)
  }

  async function loadAllAdminNotifications() {
    setAdminNotificationHistoryLoading(true)

    const { data, error } = await supabase
      .from(WORK_ORDER_EVENTS_TABLE)
      .select("*")
      .in("event_type", ADMIN_NOTIFICATION_EVENT_TYPES)
      .order("created_at", { ascending: false })
      .limit(250)

    if (error) {
      console.log("LOAD ALL ADMIN NOTIFICATIONS ERROR:", error)
      setAdminNotificationsNotice({
        type: "error",
        message: `Could not load admin notifications: ${error.message}${error.code ? ` (code ${error.code})` : ""}`
      })
      setAdminNotificationHistory([])
      setAdminNotificationHistoryLoading(false)
      return
    }

    setAdminNotificationsNotice({ type: "", message: "" })
    setAdminNotificationHistory(data || [])
    setAdminNotificationHistoryLoading(false)
  }

  function toggleAdminNotifications() {
    setShowAdminNotifications((current) => {
      const next = !current

      if (next) {
        const newest = adminNotifications[0]?.created_at
        if (newest) {
          setLastViewedNotificationAt(newest)
        }
      }

      return next
    })
  }

  function toggleEmployeeNotifications(employeeNotifications) {
    setShowEmployeeNotifications((current) => {
      const next = !current

      if (next) {
        const newest = employeeNotifications[0]?.created_at
        if (newest) {
          setLastViewedEmployeeNotificationAt(newest)
        }
      }

      return next
    })
  }

  async function loadApprovedTimeOffRequests() {
    const { data, error } = await supabase
      .from(TIME_OFF_REQUESTS_TABLE)
      .select("id, employee_name, employee_email, request_date, status")
      .eq("status", "Approved")

    if (error) {
      console.log("LOAD APPROVED TIME OFF ERROR:", error)
      setApprovedTimeOffRequests([])
      return
    }

    setApprovedTimeOffRequests(data || [])
  }

  function isEmployeeUnavailableOnDate(employeeName, dateKey) {
    if (!employeeName || !dateKey) return false

    return approvedTimeOffRequests.some(
      (request) =>
        String(request.employee_name || "").toLowerCase() ===
          String(employeeName || "").toLowerCase() &&
        normalizeDateInput(request.request_date) === normalizeDateInput(dateKey)
    )
  }

  async function updateTimeOffRequestStatus(requestId, status) {
    if (!requestId || !status) return

    setTimeOffActionId(requestId)

    const { error } = await supabase
      .from(TIME_OFF_REQUESTS_TABLE)
      .update({ status })
      .eq("id", requestId)

    if (error) {
      setTimeOffNotice({
        type: "error",
        message: `Could not ${status.toLowerCase()} request: ${error.message}`
      })
      setTimeOffActionId("")
      return
    }

    setTimeOffNotice({
      type: "success",
      message: `Request ${status.toLowerCase()} successfully.`
    })

    await loadAdminTimeOffRequests()
    await loadApprovedTimeOffRequests()
    setTimeOffActionId("")
  }

  async function submitTimeOffRequest() {
    if (appRole !== "employee") return

    const requestDate = normalizeDateInput(timeOffDate || selectedCalendarDateKey)
    const reason = String(timeOffReason || "").trim()
    const employeeEmail = String(currentEmployeeProfile?.email || session?.user?.email || "")
      .toLowerCase()
      .trim()
    const employeeName =
      currentEmployeeName || currentEmployeeProfile?.name || session?.user?.email || "Employee"

    if (!requestDate) {
      setTimeOffNotice({ type: "error", message: "Please choose a date for the request." })
      return
    }

    setTimeOffSaving(true)
    setTimeOffNotice({ type: "", message: "" })

    let doctorNotePath = ""

    if (timeOffType === "Sick Day" && doctorNoteFile) {
      try {
        doctorNotePath = await uploadDoctorNoteForTimeOff(employeeEmail, doctorNoteFile)
      } catch (error) {
        setTimeOffNotice({
          type: "error",
          message: `Could not upload doctor note: ${error.message}`
        })
        setTimeOffSaving(false)
        return
      }
    }

    const taggedReason = [
      `[TYPE:${timeOffType}]`,
      doctorNotePath ? `[DOCTOR_NOTE:${doctorNotePath}]` : "",
      reason
    ]
      .filter(Boolean)
      .join(" ")

    const { error } = await supabase.from(TIME_OFF_REQUESTS_TABLE).insert([
      {
        employee_email: employeeEmail,
        employee_name: employeeName,
        request_date: requestDate,
        reason: taggedReason || null,
        status: "Pending"
      }
    ])

    if (error) {
      setTimeOffNotice({
        type: "error",
        message: `Could not submit day-off request: ${error.message}`
      })
      setTimeOffSaving(false)
      return
    }

    await loadTimeOffRequests(employeeEmail)
    await loadApprovedTimeOffRequests()
    setTimeOffNotice({ type: "success", message: `${timeOffType} request submitted.` })
    setTimeOffReason("")
    setDoctorNoteFile(null)
    setDoctorNoteFileName("")
    setShowTimeOffForm(false)
    setTimeOffSaving(false)
  }

  async function assignWorkOrderToEmployee(jobId, employeeName) {
    if (!jobId || !employeeName) return

    const targetJob = jobs.find((job) => job.id === jobId)
    if (!targetJob) {
      setEmployeeAssignNotice({ type: "error", message: "Work order not found." })
      return
    }

    const existingAssignees = parseAssignees(targetJob.assigned_to)
    const normalizedEmployeeName = normalizeEmployeeName(employeeName)
    if (!normalizedEmployeeName) {
      setEmployeeAssignNotice({ type: "error", message: "Employee name is invalid." })
      return
    }

    const scheduledFor = normalizeDateInput(targetJob.scheduled_date)
    if (scheduledFor && isEmployeeUnavailableOnDate(normalizedEmployeeName, scheduledFor)) {
      setEmployeeAssignNotice({
        type: "error",
        message: `${normalizedEmployeeName} is unavailable on ${scheduledFor}.`
      })
      return
    }

    if (
      existingAssignees.length === 1 &&
      existingAssignees[0].toLowerCase() === normalizedEmployeeName.toLowerCase()
    ) {
      setEmployeeAssignNotice({
        type: "error",
        message: `${normalizedEmployeeName} is already assigned to this work order.`
      })
      return
    }

    setAssigningJobId(jobId)
    setEmployeeAssignNotice({ type: "", message: "" })

    const updatedAssignees = [normalizedEmployeeName]
    let appliedAssignees = [...updatedAssignees]

    let { error } = await supabase
      .from("work_orders")
      .update({ assigned_to: serializeAssignees(updatedAssignees) })
      .eq("id", jobId)

    if (error && isAssignedToConstraintViolation(error)) {
      appliedAssignees = [normalizedEmployeeName]

      const retry = await supabase
        .from("work_orders")
        .update({ assigned_to: serializeAssignees(appliedAssignees) })
        .eq("id", jobId)

      error = retry.error
    }

    if (error) {
      setEmployeeAssignNotice({
        type: "error",
        message: `Could not assign work order: ${error.message}`
      })
    } else {
      await logWorkOrderEvent({
        workOrderId: jobId,
        eventType: "assignees_changed",
        eventLabel: `${normalizedEmployeeName} assigned to work order`,
        metadata: { to: appliedAssignees.join(", ") }
      })
      await loadJobs()
      setEmployeeAssignNotice({
        type: "success",
        message: `${normalizedEmployeeName} has been assigned successfully.`
      })
    }

    setAssigningJobId(null)
  }

  async function createNextPhaseWorkOrder(job) {
    if (!job?.id) return

    if (nextPhaseAssignees.length === 0) {
      setNextPhaseNotice({
        type: "error",
        message: "Select at least one assignee for the next phase."
      })
      return
    }

    setNextPhaseSaving(true)
    setNextPhaseNotice({ type: "", message: "" })

    const phaseInfo = getJobPhaseInfo(job)
    const nextPhaseNumber = phaseInfo.currentPhase + 1
    const nextPhaseJobNumber = `${phaseInfo.rootJobNumber}-P${nextPhaseNumber}`

    const { data, error } = await supabase
      .from("work_orders")
      .insert([
        {
          title: `${phaseInfo.baseTitle} - Phase ${nextPhaseNumber}`,
          location: job.location || null,
          job_description: job.job_description || null,
          assigned_to: serializeAssignees(nextPhaseAssignees),
          scheduled_date: null,
          status: "Scheduled",
          job_number: nextPhaseJobNumber,
          notes: `Phase ${nextPhaseNumber} created from ${job.job_number || "previous phase"} (${job.id}).`
        }
      ])
      .select()

    if (error) {
      setNextPhaseNotice({
        type: "error",
        message: `Could not create next phase: ${error.message}`
      })
      setNextPhaseSaving(false)
      return
    }

    const createdJob = data?.[0]

    await logWorkOrderEvent({
      workOrderId: job.id,
      eventType: "next_phase_created",
      eventLabel: `Phase ${nextPhaseNumber} created and assigned to ${nextPhaseAssignees.join(", ")}`,
      metadata: {
        next_phase_job_id: createdJob?.id || null,
        next_phase_job_number: nextPhaseJobNumber,
        assigned_to: nextPhaseAssignees.join(", ")
      }
    })

    if (createdJob?.id) {
      await logWorkOrderEvent({
        workOrderId: createdJob.id,
        eventType: "work_order_created",
        eventLabel: `Phase ${nextPhaseNumber} created`,
        metadata: {
          source_job_id: job.id,
          source_job_number: job.job_number || null,
          assigned_to: serializeAssignees(nextPhaseAssignees)
        }
      })
    }

    await loadJobs()

    if (createdJob?.id) {
      setSelectedJobId(createdJob.id)
      setViewMode("details")
      loadDocuments(createdJob.id)
      loadJobEvents(createdJob.id)
    }

    setNextPhaseAssignees([])
    setNextPhaseNotice({
      type: "success",
      message: `Phase ${nextPhaseNumber} created and assigned.`
    })
    setNextPhaseSaving(false)
  }

  async function applyDispatchJobUpdates(job, updates, successMessage) {
    if (!job?.id) return

    setDispatchSavingJobId(job.id)
    setDispatchNotice({ type: "", message: "" })

    let dispatchUpdates = { ...updates }
    let singleAssigneeFallbackApplied = false

    let { data, error } = await supabase
      .from("work_orders")
      .update(dispatchUpdates)
      .eq("id", job.id)
      .select()
      .maybeSingle()

    if (
      error &&
      isAssignedToConstraintViolation(error) &&
      Object.prototype.hasOwnProperty.call(dispatchUpdates, "assigned_to")
    ) {
      const fallbackPrimaryAssignee = parseAssignees(dispatchUpdates.assigned_to)[0] || null
      dispatchUpdates = { ...dispatchUpdates, assigned_to: fallbackPrimaryAssignee }

      const retry = await supabase
        .from("work_orders")
        .update(dispatchUpdates)
        .eq("id", job.id)
        .select()
        .maybeSingle()

      data = retry.data
      error = retry.error
      singleAssigneeFallbackApplied = !retry.error
    }

    if (error) {
      setDispatchNotice({
        type: "error",
        message: `Dispatch update failed: ${error.message}`
      })
      setDispatchSavingJobId("")
      return
    }

    if (data) {
      setJobs((current) => current.map((item) => (item.id === data.id ? data : item)))

      if (String(job.status || "") !== String(data.status || "")) {
        await logWorkOrderEvent({
          workOrderId: job.id,
          eventType: "status_changed",
          eventLabel: `Status changed: ${job.status || "Not set"} -> ${data.status || "Not set"}`,
          metadata: { from: job.status || null, to: data.status || null }
        })
      }

      const previousSchedule = normalizeDateInput(job.scheduled_date)
      const nextSchedule = normalizeDateInput(data.scheduled_date)
      if (previousSchedule !== nextSchedule) {
        await logWorkOrderEvent({
          workOrderId: job.id,
          eventType: "schedule_changed",
          eventLabel: `Schedule changed to ${nextSchedule || "Not set"}`,
          metadata: { from: previousSchedule || null, to: nextSchedule || null }
        })
      }

      const previousAssignees = parseAssignees(job.assigned_to).join(", ")
      const nextAssignees = parseAssignees(data.assigned_to).join(", ")
      if (previousAssignees !== nextAssignees) {
        await logWorkOrderEvent({
          workOrderId: job.id,
          eventType: "assignees_changed",
          eventLabel: `Assignees updated: ${nextAssignees || "Unassigned"}`,
          metadata: { from: previousAssignees || null, to: nextAssignees || null }
        })
      }
    }

    setDispatchNotice({
      type: "success",
      message: singleAssigneeFallbackApplied
        ? `${successMessage} (Applied using single-assignee database mode.)`
        : successMessage
    })
    setDispatchSavingJobId("")
  }

  async function moveDispatchJobToStatus(jobId, targetStatus) {
    const job = jobs.find((item) => item.id === jobId)
    if (!job) return

    if (String(job.status || "").trim().toLowerCase() === String(targetStatus).toLowerCase()) {
      return
    }

    await applyDispatchJobUpdates(job, { status: targetStatus }, `Moved to ${targetStatus}.`)
  }

  async function rescheduleDispatchJob(jobId, nextDateValue) {
    const job = jobs.find((item) => item.id === jobId)
    if (!job) return

    const normalizedDate = normalizeDateInput(nextDateValue)
    const previousDate = normalizeDateInput(job.scheduled_date)
    if ((normalizedDate || "") === (previousDate || "")) {
      return
    }

    await applyDispatchJobUpdates(
      job,
      { scheduled_date: normalizedDate || null },
      normalizedDate ? `Scheduled for ${normalizedDate}.` : "Schedule cleared."
    )
  }

  async function moveDispatchJobToAssignee(jobId, assigneeName) {
    const job = jobs.find((item) => item.id === jobId)
    if (!job) return

    const existingAssignees = parseAssignees(job.assigned_to)

    if (assigneeName === "__unassigned__") {
      if (existingAssignees.length === 0) return

      await applyDispatchJobUpdates(job, { assigned_to: null }, "Moved to Unassigned.")
      return
    }

    const normalizedTarget = normalizeEmployeeName(assigneeName)
    if (!normalizedTarget) return

    const nextAssignees = [normalizedTarget]

    const previousPrimary = existingAssignees[0] || ""
    if (previousPrimary.toLowerCase() === normalizedTarget.toLowerCase()) {
      return
    }

    await applyDispatchJobUpdates(
      job,
      { assigned_to: serializeAssignees(nextAssignees) },
      `Primary assignee set to ${normalizedTarget}.`
    )
  }

  async function startTimerForJob(job) {
    if (!job || isTimerRunning(job)) return

    setTimerSaving(true)
    setTimerNotice({ type: "", message: "" })

    const updates = {
      timer_is_running: true,
      timer_started_at: new Date().toISOString()
    }

    if (job.status !== "In Progress") {
      updates.status = "In Progress"
    }

    const { data, error } = await supabase
      .from("work_orders")
      .update(updates)
      .eq("id", job.id)
      .select()
      .maybeSingle()

    if (error) {
      setTimerNotice({
        type: "error",
        message: `Could not start timer: ${error.message}`
      })
    } else if (data) {
      setJobs((current) => current.map((item) => (item.id === data.id ? data : item)))
      if (String(job.status || "") !== String(data.status || "")) {
        await logWorkOrderEvent({
          workOrderId: job.id,
          eventType: "status_changed",
          eventLabel: `Status changed: ${job.status || "Not set"} -> ${data.status || "Not set"}`,
          metadata: { from: job.status || null, to: data.status || null }
        })
      }
      await logWorkOrderEvent({
        workOrderId: job.id,
        eventType: "timer_started",
        eventLabel: "Timer started",
        metadata: { status: data.status }
      })
      setTimerNotice({ type: "success", message: "Timer started." })
    }

    setTimerSaving(false)
  }

  async function pauseTimerForJob(job) {
    if (!job || !isTimerRunning(job)) return

    setTimerSaving(true)
    setTimerNotice({ type: "", message: "" })

    const elapsed = getElapsedSeconds(job)
    const updates = {
      timer_is_running: false,
      timer_started_at: null,
      timer_accumulated_seconds: elapsed
    }

    const { data, error } = await supabase
      .from("work_orders")
      .update(updates)
      .eq("id", job.id)
      .select()
      .maybeSingle()

    if (error) {
      setTimerNotice({
        type: "error",
        message: `Could not pause timer: ${error.message}`
      })
    } else if (data) {
      setJobs((current) => current.map((item) => (item.id === data.id ? data : item)))
      await logWorkOrderEvent({
        workOrderId: job.id,
        eventType: "timer_paused",
        eventLabel: "Timer paused",
        metadata: { accumulated_seconds: elapsed }
      })
      setTimerNotice({ type: "success", message: "Timer paused." })
    }

    setTimerSaving(false)
  }

  async function resetTimerForJob(job) {
    if (!job) return

    setTimerSaving(true)
    setTimerNotice({ type: "", message: "" })

    const { data, error } = await supabase
      .from("work_orders")
      .update({
        timer_is_running: false,
        timer_started_at: null,
        timer_accumulated_seconds: 0
      })
      .eq("id", job.id)
      .select()
      .maybeSingle()

    if (error) {
      setTimerNotice({
        type: "error",
        message: `Could not reset timer: ${error.message}`
      })
    } else if (data) {
      setJobs((current) => current.map((item) => (item.id === data.id ? data : item)))
      await logWorkOrderEvent({
        workOrderId: job.id,
        eventType: "timer_reset",
        eventLabel: "Timer reset",
        metadata: {}
      })
      setTimerNotice({ type: "success", message: "Timer reset." })
    }

    setTimerSaving(false)
  }

  async function addEmployeeNoteToJob(job) {
    if (!job) return

    const trimmedNote = employeeJobNote.trim()
    if (!trimmedNote) {
      setEmployeeJobActionNotice({
        type: "error",
        message: "Please enter a note before saving."
      })
      return
    }

    const author = currentEmployeeName || session?.user?.email || "Employee"
    const timestamp = new Date().toLocaleString()
    const noteEntry = `[${timestamp}] ${author}: ${trimmedNote}`
    const existing = String(job.notes || "").trim()
    const nextNotes = existing ? `${existing}\n${noteEntry}` : noteEntry

    setEmployeeJobActionSaving(true)
    setEmployeeJobActionNotice({ type: "", message: "" })

    const { data, error } = await supabase
      .from("work_orders")
      .update({ notes: nextNotes })
      .eq("id", job.id)
      .select()
      .maybeSingle()

    if (error) {
      setEmployeeJobActionNotice({
        type: "error",
        message: `Could not save note: ${error.message}`
      })
      setEmployeeJobActionSaving(false)
      return
    }

    if (data) {
      setJobs((current) => current.map((item) => (item.id === data.id ? data : item)))
      if (appRole !== "admin") {
        await logWorkOrderEvent({
          workOrderId: job.id,
          eventType: "employee_note_added",
          eventLabel: "Employee note added",
          metadata: { note_preview: trimmedNote.slice(0, 140) }
        })
      }
    }

    setEmployeeJobNote("")
    setEmployeeJobActionNotice({ type: "success", message: "Note added." })
    setEmployeeJobActionSaving(false)
  }

  async function runEmployeeCheckInAction(job, action) {
    if (!job) return

    const actionLabel = CHECKIN_ACTIONS[action]
    if (!actionLabel) return

    const author = currentEmployeeName || session?.user?.email || "Employee"
    const nowIso = new Date().toISOString()
    const eventLine = `[CHECKIN:${action}] ${nowIso} | ${author}`
    const existing = String(job.notes || "").trim()
    const nextNotes = existing ? `${existing}\n${eventLine}` : eventLine

    const updates = { notes: nextNotes }

    if (action === "START_SHIFT") {
      updates.status = "In Progress"
      if (!isTimerRunning(job)) {
        updates.timer_is_running = true
        updates.timer_started_at = nowIso
      }
    }

    if (action === "LEAVE_SITE") {
      updates.status = "Paused"
      if (isTimerRunning(job)) {
        updates.timer_is_running = false
        updates.timer_started_at = null
        updates.timer_accumulated_seconds = getElapsedSeconds(job)
      }
    }

    if (action === "COMPLETE_JOB") {
      updates.status = "Completed"
      if (isTimerRunning(job)) {
        updates.timer_is_running = false
        updates.timer_started_at = null
        updates.timer_accumulated_seconds = getElapsedSeconds(job)
      }
    }

    setEmployeeJobActionSaving(true)
    setEmployeeJobActionNotice({ type: "", message: "" })

    const { data, error } = await supabase
      .from("work_orders")
      .update(updates)
      .eq("id", job.id)
      .select()
      .maybeSingle()

    if (error) {
      setEmployeeJobActionNotice({
        type: "error",
        message: `Could not ${actionLabel.toLowerCase()}: ${error.message}`
      })
      setEmployeeJobActionSaving(false)
      return
    }

    if (data) {
      setJobs((current) => current.map((item) => (item.id === data.id ? data : item)))
      if (String(job.status || "") !== String(data.status || "")) {
        await logWorkOrderEvent({
          workOrderId: job.id,
          eventType: "status_changed",
          eventLabel: `Status changed: ${job.status || "Not set"} -> ${data.status || "Not set"}`,
          metadata: { from: job.status || null, to: data.status || null }
        })
      }
      await logWorkOrderEvent({
        workOrderId: job.id,
        eventType: `checkin_${String(action || "").toLowerCase()}`,
        eventLabel: actionLabel,
        metadata: { action, status: updates.status || job.status }
      })
    }

    setEmployeeJobActionNotice({
      type: "success",
      message: `${actionLabel} recorded.`
    })
    setEmployeeJobActionSaving(false)
  }

  async function openDocument(storagePath) {
    const { data, error } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrl(storagePath, 3600)

    if (error || !data?.signedUrl) {
      setDocsNotice({
        type: "error",
        message: `Could not open document: ${error?.message || "Unknown error"}`
      })
      return
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  async function uploadFilesForJob(workOrderId, files) {
    let uploaded = 0
    let failed = 0

    for (const file of files) {
      if (!isAllowedDocumentType(file)) {
        failed += 1
        continue
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const storagePath = `${workOrderId}/${Date.now()}-${safeName}`

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(storagePath, file, {
          upsert: false,
          contentType: file.type || "application/octet-stream"
        })

      if (uploadError) {
        console.log("UPLOAD FILE ERROR:", uploadError)
        failed += 1
        continue
      }

      const { error: insertError } = await supabase
        .from("work_order_documents")
        .insert([
          {
            work_order_id: workOrderId,
            file_name: file.name,
            storage_path: storagePath,
            mime_type: file.type,
            file_size: file.size
          }
        ])

      if (insertError) {
        console.log("INSERT DOCUMENT ERROR:", insertError)
        failed += 1
      } else {
        uploaded += 1
      }
    }

    return { uploaded, failed }
  }

  function onCreateFilesSelected(event) {
    const selected = Array.from(event.target.files || [])

    if (selected.length === 0) {
      setCreateFiles([])
      setCreateDocsNotice({ type: "", message: "" })
      return
    }

    const allowed = selected.filter(isAllowedDocumentType)
    const rejected = selected.length - allowed.length

    setCreateFiles(allowed)

    if (rejected > 0) {
      setCreateDocsNotice({
        type: "error",
        message: `${rejected} file(s) ignored. Only PDF and image files are allowed.`
      })
    } else {
      setCreateDocsNotice({ type: "", message: "" })
    }
  }

  async function uploadPdfForJob(event) {
    const file = event.target.files?.[0]

    if (!selectedJobId || !file) return

    if (!isAllowedDocumentType(file)) {
      setDocsNotice({ type: "error", message: "Only PDF and image files are allowed." })
      event.target.value = ""
      return
    }

    setUploadingPdf(true)
    setDocsNotice({ type: "", message: "" })

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `${selectedJobId}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(storagePath, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream"
      })

    if (uploadError) {
      console.log("UPLOAD PDF ERROR:", uploadError)
      setDocsNotice({
        type: "error",
        message: `Could not upload file: ${uploadError.message}`
      })
      setUploadingPdf(false)
      event.target.value = ""
      return
    }

    const { error: insertError } = await supabase
      .from("work_order_documents")
      .insert([
        {
          work_order_id: selectedJobId,
          file_name: file.name,
          storage_path: storagePath,
          mime_type: file.type,
          file_size: file.size
        }
      ])

    if (insertError) {
      console.log("INSERT DOCUMENT ERROR:", insertError)
      setDocsNotice({
        type: "error",
        message: `File uploaded but metadata save failed: ${insertError.message}`
      })
    } else {
      await logWorkOrderEvent({
        workOrderId: selectedJobId,
        eventType: "document_uploaded",
        eventLabel: `Document uploaded: ${file.name}`,
        metadata: { file_name: file.name, mime_type: file.type, size: file.size }
      })
      setDocsNotice({ type: "success", message: "File uploaded successfully." })
      await loadDocuments(selectedJobId)
    }

    setUploadingPdf(false)
    event.target.value = ""
  }

  async function removeDocument(document) {
    if (!document?.id || !document?.storage_path) return

    const confirmed = window.confirm(
      `Remove document ${document.file_name || "file"}? This cannot be undone.`
    )

    if (!confirmed) return

    setDocumentActionId(document.id)
    setDocsNotice({ type: "", message: "" })

    const { error: storageError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .remove([document.storage_path])

    if (storageError) {
      setDocsNotice({
        type: "error",
        message: `Could not delete file from storage: ${storageError.message}`
      })
      setDocumentActionId("")
      return
    }

    const { error: rowError } = await supabase
      .from("work_order_documents")
      .delete()
      .eq("id", document.id)

    if (rowError) {
      setDocsNotice({
        type: "error",
        message: `File removed from storage, but document record delete failed: ${rowError.message}`
      })
      setDocumentActionId("")
      return
    }

    await logWorkOrderEvent({
      workOrderId: document.work_order_id,
      eventType: "document_removed",
      eventLabel: `Document removed: ${document.file_name || "file"}`,
      metadata: { file_name: document.file_name || null }
    })

    setDocsNotice({ type: "success", message: "Document removed." })
    await loadDocuments(document.work_order_id)
    setDocumentActionId("")
  }

  async function replaceDocument(document, file) {
    if (!document?.id || !document?.work_order_id || !file) return

    if (!isAllowedDocumentType(file)) {
      setDocsNotice({ type: "error", message: "Only PDF and image files are allowed." })
      return
    }

    setReplacingDocumentId(document.id)
    setDocsNotice({ type: "", message: "" })

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const newStoragePath = `${document.work_order_id}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(newStoragePath, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream"
      })

    if (uploadError) {
      setDocsNotice({
        type: "error",
        message: `Could not upload replacement file: ${uploadError.message}`
      })
      setReplacingDocumentId("")
      return
    }

    const { error: updateError } = await supabase
      .from("work_order_documents")
      .update({
        file_name: file.name,
        storage_path: newStoragePath,
        mime_type: file.type,
        file_size: file.size
      })
      .eq("id", document.id)

    if (updateError) {
      setDocsNotice({
        type: "error",
        message: `Replacement file uploaded, but metadata update failed: ${updateError.message}`
      })
      setReplacingDocumentId("")
      return
    }

    if (document.storage_path && document.storage_path !== newStoragePath) {
      await supabase.storage.from(DOCUMENT_BUCKET).remove([document.storage_path])
    }

    await logWorkOrderEvent({
      workOrderId: document.work_order_id,
      eventType: "document_replaced",
      eventLabel: `Document replaced: ${file.name}`,
      metadata: {
        previous_file_name: document.file_name || null,
        file_name: file.name,
        mime_type: file.type,
        size: file.size
      }
    })

    setDocsNotice({ type: "success", message: "Document replaced successfully." })
    await loadDocuments(document.work_order_id)
    setReplacingDocumentId("")
  }

  async function saveEditedJob() {
    if (!editingJobId || !editForm.title.trim()) return

    setSavingEdit(true)
    setEditNotice({ type: "", message: "" })

    const currentJob = jobs.find((job) => job.id === editingJobId) || null
    const nextStatus = String(editForm.status || "Scheduled").trim()
    const nextStatusNormalized = nextStatus.toLowerCase()
    const timerUpdates = {}

    if (currentJob) {
      const runningNow = isTimerRunning(currentJob)

      if (nextStatusNormalized === "in progress" && !runningNow) {
        timerUpdates.timer_is_running = true
        timerUpdates.timer_started_at = new Date().toISOString()
      }

      if (nextStatusNormalized !== "in progress" && runningNow) {
        timerUpdates.timer_is_running = false
        timerUpdates.timer_started_at = null
        timerUpdates.timer_accumulated_seconds = getElapsedSeconds(currentJob)
      }
    }

    const expectedValues = {
      title: editForm.title.trim(),
      job_description: editForm.job_description.trim() || null,
      location: editForm.location.trim() || null,
      assigned_to: serializeAssignees(editForm.assigned_to),
      scheduled_date: editForm.scheduled_date || null,
      status: nextStatus,
      notes: editForm.notes.trim() || "",
      ...timerUpdates
    }

    const { error } = await supabase
      .from("work_orders")
      .update(expectedValues)
      .eq("id", editingJobId)

    if (error) {
      console.log("UPDATE ERROR:", error)
      setEditNotice({
        type: "error",
        message: `Could not save changes: ${error.message}`
      })
    } else {
      const { data: refreshedJob, error: refreshError } = await supabase
        .from("work_orders")
        .select("*")
        .eq("id", editingJobId)
        .maybeSingle()

      if (refreshError || !refreshedJob) {
        setEditNotice({
          type: "error",
          message:
            "Save completed but verification failed. Please refresh and check this work order again."
        })
      } else {
        const savedScheduledDate = normalizeDateInput(refreshedJob.scheduled_date)
        const expectedScheduledDate = normalizeDateInput(expectedValues.scheduled_date)

        const persisted =
          (refreshedJob.title || "") === (expectedValues.title || "") &&
          (refreshedJob.job_description || null) === expectedValues.job_description &&
          (refreshedJob.location || null) === expectedValues.location &&
          sameAssignees(refreshedJob.assigned_to, expectedValues.assigned_to) &&
          savedScheduledDate === expectedScheduledDate &&
          (refreshedJob.status || "") === expectedValues.status &&
          (refreshedJob.notes || "") === expectedValues.notes

        if (!persisted) {
          setEditNotice({
            type: "error",
            message:
              "Save request was sent, but database values did not change. This is usually a Supabase RLS policy restriction."
          })
        } else {
          if (currentJob) {
            const previousStatus = String(currentJob.status || "")
            const nextSavedStatus = String(refreshedJob.status || "")
            if (previousStatus !== nextSavedStatus) {
              await logWorkOrderEvent({
                workOrderId: editingJobId,
                eventType: "status_changed",
                eventLabel: `Status changed: ${previousStatus || "Not set"} -> ${nextSavedStatus || "Not set"}`,
                metadata: { from: previousStatus || null, to: nextSavedStatus || null }
              })
            }

            const previousAssignees = parseAssignees(currentJob.assigned_to).join(", ")
            const nextAssignees = parseAssignees(refreshedJob.assigned_to).join(", ")
            if (previousAssignees !== nextAssignees) {
              await logWorkOrderEvent({
                workOrderId: editingJobId,
                eventType: "assignees_changed",
                eventLabel: `Assignees updated: ${nextAssignees || "Unassigned"}`,
                metadata: { from: previousAssignees || null, to: nextAssignees || null }
              })
            }

            const previousSchedule = normalizeDateInput(currentJob.scheduled_date)
            const nextSchedule = normalizeDateInput(refreshedJob.scheduled_date)
            if (previousSchedule !== nextSchedule) {
              await logWorkOrderEvent({
                workOrderId: editingJobId,
                eventType: "schedule_changed",
                eventLabel: `Schedule changed to ${nextSchedule || "Not set"}`,
                metadata: { from: previousSchedule || null, to: nextSchedule || null }
              })
            }
          }

          await loadJobs()
          setSelectedJobId(editingJobId)
          cancelEditing()
          setEditNotice({ type: "success", message: "Changes saved successfully." })
        }
      }
    }

    setSavingEdit(false)
  }

  async function deleteSelectedWorkOrder(job, isAdminUser) {
    if (!job?.id) return

    if (!isAdminUser) {
      setEditNotice({
        type: "error",
        message: "Only admins can delete work orders."
      })
      return
    }

    const confirmed = window.confirm(
      `Delete ${job.title || "this work order"}? This cannot be undone.`
    )

    if (!confirmed) return

    const typedConfirmation = window.prompt(
      `Type DELETE to permanently remove ${job.title || "this work order"}.`
    )

    if (typedConfirmation !== "DELETE") {
      setEditNotice({
        type: "error",
        message: "Delete canceled. Type DELETE exactly to confirm removal."
      })
      return
    }

    setDeletingJob(true)
    setEditNotice({ type: "", message: "" })

    const { data: linkedDocuments } = await supabase
      .from("work_order_documents")
      .select("id, storage_path")
      .eq("work_order_id", job.id)

    const storagePaths = (linkedDocuments || [])
      .map((doc) => doc.storage_path)
      .filter(Boolean)

    if (storagePaths.length > 0) {
      await supabase.storage.from(DOCUMENT_BUCKET).remove(storagePaths)
    }

    const { error: docsError } = await supabase
      .from("work_order_documents")
      .delete()
      .eq("work_order_id", job.id)

    if (docsError) {
      setEditNotice({
        type: "error",
        message: `Could not delete linked documents: ${docsError.message}`
      })
      setDeletingJob(false)
      return
    }

    const { error: eventsError } = await supabase
      .from(WORK_ORDER_EVENTS_TABLE)
      .delete()
      .eq("work_order_id", job.id)

    if (eventsError) {
      setEditNotice({
        type: "error",
        message: `Could not delete linked events: ${eventsError.message}`
      })
      setDeletingJob(false)
      return
    }

    const { error: workOrderError } = await supabase
      .from("work_orders")
      .delete()
      .eq("id", job.id)

    if (workOrderError) {
      setEditNotice({
        type: "error",
        message: `Could not delete work order: ${workOrderError.message}`
      })
      setDeletingJob(false)
      return
    }

    await loadJobs()
    setSelectedJobId(null)
    cancelEditing()
    setViewMode("dashboard")
    setEditNotice({ type: "success", message: "Work order deleted." })
    setDeletingJob(false)
  }

  async function addJob() {
    if (!title) return

    const normalizedTitle = title.trim()
    const usePhases = createPhasesEnabled && createPhaseRows.length > 0

    if (usePhases && assignedTo.length === 0) {
      setCreateDocsNotice({
        type: "error",
        message: "Assign at least one team member to Phase 1."
      })
      return
    }

    if (usePhases) {
      const missingAssigneesPhaseIndex = createPhaseRows.findIndex(
        (phase) => phase.assignees.length === 0
      )

      if (missingAssigneesPhaseIndex >= 0) {
        setCreateDocsNotice({
          type: "error",
          message: `Assign at least one team member for Phase ${missingAssigneesPhaseIndex + 2}.`
        })
        return
      }
    }

    setLoading(true)
    setCreateDocsNotice({ type: "", message: "" })

    const rootJobNumber = generateJobNumber()
    const phaseDefinitions = usePhases
      ? [
          {
            phaseNumber: 1,
            title: `${normalizedTitle} - Phase 1`,
            assignedTo: assignedTo,
            scheduledDate: scheduledDate || null,
            notes: notes.trim() || ""
          },
          ...createPhaseRows.map((phase, index) => ({
            phaseNumber: index + 2,
            title:
              String(phase.title || "").trim() ||
              `${normalizedTitle} - Phase ${index + 2}`,
            assignedTo: phase.assignees,
            scheduledDate: normalizeDateInput(phase.scheduledDate) || null,
            notes: `Phase ${index + 2} of ${normalizedTitle}.`
          }))
        ]
      : [
          {
            phaseNumber: null,
            title: normalizedTitle,
            assignedTo: assignedTo,
            scheduledDate: scheduledDate || null,
            notes: notes.trim() || ""
          }
        ]

    const payload = phaseDefinitions.map((phase) => ({
      title: phase.title,
      location,
      job_description: jobDescription.trim() || null,
      assigned_to: serializeAssignees(phase.assignedTo),
      scheduled_date: phase.scheduledDate,
      status: "Scheduled",
      job_number: phase.phaseNumber ? `${rootJobNumber}-P${phase.phaseNumber}` : rootJobNumber,
      notes: phase.notes
    }))

    const { data, error } = await supabase
      .from("work_orders")
      .insert(payload)
      .select()

    if (error) {
      console.log("INSERT ERROR:", error)
      setCreateDocsNotice({
        type: "error",
        message: `Could not create work order: ${error.message}`
      })
    } else {
      console.log("INSERT SUCCESS:", data)
      const createdJobs = [...(data || [])].sort((a, b) =>
        String(a.job_number || "").localeCompare(String(b.job_number || ""), undefined, {
          numeric: true,
          sensitivity: "base"
        })
      )
      const createdJob = createdJobs[0]

      for (const [index, job] of createdJobs.entries()) {
        await logWorkOrderEvent({
          workOrderId: job.id,
          eventType: "work_order_created",
          eventLabel: usePhases
            ? `Phase ${index + 1} created`
            : "Work order created",
          metadata: {
            title: job.title || null,
            scheduled_date: job.scheduled_date || null,
            assigned_to: job.assigned_to || null,
            phase_number: usePhases ? index + 1 : null,
            phase_group: usePhases ? rootJobNumber : null
          }
        })
      }

      if (createdJob?.id && createFiles.length > 0) {
        const result = await uploadFilesForJob(createdJob.id, createFiles)

        if (result.failed > 0) {
          setCreateDocsNotice({
            type: "error",
            message: `${result.uploaded} file(s) uploaded, ${result.failed} failed.`
          })
        } else {
          setCreateDocsNotice({
            type: "success",
            message: `${result.uploaded} document(s) uploaded.`
          })
        }
      }

      setTitle("")
      setJobDescription("")
      setNotes("")
      setSelectedJobTemplateId("")
      setCreateFiles([])
      setCreateFileInputKey((current) => current + 1)
      setLocation("")
      setAssignedTo([])
      setScheduledDate("")
      setCreatePhasesEnabled(false)
      setCreatePhaseRows([])
      loadJobs()

      if (usePhases) {
        setCreateDocsNotice({
          type: "success",
          message: `${createdJobs.length} phases created successfully.`
        })
      }
    }

    setLoading(false)
  }

  async function signIn() {
    if (!loginIdentifier || !password) {
      setAuthError("Email/username and password are required.")
      return
    }

    setSigningIn(true)
    setAuthError("")

    const resolvedLogin = await resolveLoginEmail(loginIdentifier)
    if (!resolvedLogin.email) {
      if (resolvedLogin.source === "username_lookup_failed") {
        setAuthError("Username lookup is unavailable right now. Use email to sign in.")
      } else {
        setAuthError("Could not find that username. Try your email instead.")
      }
      setSigningIn(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: resolvedLogin.email,
      password
    })

    if (error) {
      setAuthError(error.message)
    }

    setSigningIn(false)
  }

  async function sendPasswordResetLink() {
    const resolvedLogin = await resolveLoginEmail(loginIdentifier)
    const normalizedEmail = normalizeEmployeeEmail(resolvedLogin.email)
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setForgotPasswordNotice({
        type: "error",
        message: "Enter a valid email or username first."
      })
      return
    }

    const authRedirectUrl = getAuthRedirectUrl()
    if (!authRedirectUrl) {
      setForgotPasswordNotice({
        type: "error",
        message:
          "Password reset link not sent. Configure VITE_AUTH_REDIRECT_URL (or VITE_APP_URL) to your deployed app URL."
      })
      return
    }

    setForgotPasswordSending(true)
    setForgotPasswordNotice({ type: "", message: "" })

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: authRedirectUrl
    })

    if (error) {
      setForgotPasswordNotice({
        type: "error",
        message: `Could not send reset link: ${error.message}`
      })
      setForgotPasswordSending(false)
      return
    }

    setForgotPasswordNotice({
      type: "success",
      message: `Reset link sent to ${normalizedEmail}. Check inbox/spam.`
    })
    setForgotPasswordSending(false)
  }

  async function completePasswordReset() {
    if (!session?.user?.id) {
      setResetPasswordNotice({
        type: "error",
        message: "Recovery session missing. Open the reset link again from your email."
      })
      return
    }

    if (resetPasswordValue.length < 8) {
      setResetPasswordNotice({
        type: "error",
        message: "Password must be at least 8 characters."
      })
      return
    }

    if (resetPasswordValue !== resetPasswordConfirmValue) {
      setResetPasswordNotice({ type: "error", message: "Passwords do not match." })
      return
    }

    setResetPasswordSaving(true)
    setResetPasswordNotice({ type: "", message: "" })

    const { error } = await supabase.auth.updateUser({ password: resetPasswordValue })

    if (error) {
      setResetPasswordNotice({
        type: "error",
        message: `Could not reset password: ${error.message}`
      })
      setResetPasswordSaving(false)
      return
    }

    const recoveredEmail = session?.user?.email || loginIdentifier

    setResetPasswordNotice({
      type: "success",
      message: "Password updated. Sign in with your new password."
    })
    setResetPasswordValue("")
    setResetPasswordConfirmValue("")
    setPasswordRecoveryMode(false)
    setLoginIdentifier(recoveredEmail)
    setPassword("")
    await supabase.auth.signOut()
    setResetPasswordSaving(false)
  }

  async function completeFirstLoginPasswordSetup() {
    if (!session?.user?.id) {
      setFirstLoginPasswordNotice({
        type: "error",
        message: "Session missing. Open your login link again."
      })
      return
    }

    if (firstLoginPasswordValue.length < 8) {
      setFirstLoginPasswordNotice({
        type: "error",
        message: "Password must be at least 8 characters."
      })
      return
    }

    if (firstLoginPasswordValue !== firstLoginPasswordConfirmValue) {
      setFirstLoginPasswordNotice({ type: "error", message: "Passwords do not match." })
      return
    }

    setFirstLoginPasswordSaving(true)
    setFirstLoginPasswordNotice({ type: "", message: "" })

    const metadata = {
      ...(session.user?.user_metadata || {}),
      needs_password_setup: false
    }

    const { error } = await supabase.auth.updateUser({
      password: firstLoginPasswordValue,
      data: metadata
    })

    if (error) {
      setFirstLoginPasswordNotice({
        type: "error",
        message: `Could not set password: ${error.message}`
      })
      setFirstLoginPasswordSaving(false)
      return
    }

    const {
      data: { session: refreshedSession }
    } = await supabase.auth.getSession()

    if (refreshedSession) {
      setSession(refreshedSession)
    }

    setFirstLoginPasswordValue("")
    setFirstLoginPasswordConfirmValue("")
    setFirstLoginPasswordNotice({ type: "success", message: "Password saved. You can continue." })
    setFirstLoginPasswordSaving(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function saveMyAccount() {
    if (!session?.user?.id) return

    const normalizedName = String(accountNameInput || "").trim()
    if (!normalizedName) {
      setAccountNotice({ type: "error", message: "Please enter your name." })
      return
    }

    setAccountSaving(true)
    setAccountNotice({ type: "", message: "" })

    let employeeUpdateError = null

    if (currentEmployeeProfile?.id) {
      const { error } = await supabase
        .from("employees")
        .update({ name: normalizedName })
        .eq("id", currentEmployeeProfile.id)

      if (error) {
        employeeUpdateError = error
      }
    }

    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: {
        full_name: normalizedName,
        display_name: normalizedName,
        name: normalizedName
      }
    })

    if (employeeUpdateError && authUpdateError) {
      setAccountNotice({
        type: "error",
        message: `Could not save account name: ${employeeUpdateError.message}`
      })
      setAccountSaving(false)
      return
    }

    if (!currentEmployeeProfile?.id && authUpdateError) {
      setAccountNotice({
        type: "error",
        message: `Could not save account name: ${authUpdateError.message}`
      })
      setAccountSaving(false)
      return
    }

    await loadEmployees()
    const {
      data: { session: refreshedSession }
    } = await supabase.auth.getSession()

    if (refreshedSession) {
      setSession(refreshedSession)
    }

    setAccountNameInput(normalizedName)
    setAccountNotice({
      type: "success",
      message:
        employeeUpdateError && !authUpdateError
          ? "Name saved for this account. Employee directory name could not be updated."
          : "Account name saved."
    })
    setAccountSaving(false)
  }

  if (authLoading) {
    return (
      <div className="app-shell">
        <main className="admin-panel admin-panel--centered">
          <h1 className="brand-title">Western Hydro Engineering Work Orders</h1>
          <p className="subtle-text">Checking session...</p>
        </main>
      </div>
    )
  }

  if (passwordRecoveryMode) {
    return (
      <div className="app-shell">
        <main className="auth-card">
          <h1 className="brand-title">Western Hydro Engineering Work Orders</h1>
          <h2 className="section-title">Reset Password</h2>

          <div className="auth-grid">
            <p className="subtle-text">Set your new password from the recovery link.</p>

            <input
              type="password"
              placeholder="New password"
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
            />

            <input
              type="password"
              placeholder="Confirm new password"
              value={resetPasswordConfirmValue}
              onChange={(e) => setResetPasswordConfirmValue(e.target.value)}
            />

            <button
              className="primary-btn"
              onClick={completePasswordReset}
              disabled={resetPasswordSaving}
            >
              {resetPasswordSaving ? "Saving..." : "Update Password"}
            </button>

            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                setPasswordRecoveryMode(false)
                setResetPasswordNotice({ type: "", message: "" })
                setResetPasswordValue("")
                setResetPasswordConfirmValue("")
              }}
              disabled={resetPasswordSaving}
            >
              Back To Sign In
            </button>

            {resetPasswordNotice.message ? (
              <p
                className={`notice-text ${
                  resetPasswordNotice.type === "error"
                    ? "notice-text--error"
                    : "notice-text--success"
                }`}
              >
                {resetPasswordNotice.message}
              </p>
            ) : null}
          </div>
        </main>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="app-shell">
        <main className="auth-card">
          <h1 className="brand-title">Western Hydro Engineering Work Orders</h1>
          <h2 className="section-title">Sign In Required</h2>

          <div className="auth-grid">
            <input
              type="text"
              placeholder="Email or Username"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button className="primary-btn" onClick={signIn} disabled={signingIn}>
              {signingIn ? "Signing in..." : "Sign In"}
            </button>

            <button
              type="button"
              className="ghost-btn"
              onClick={sendPasswordResetLink}
              disabled={forgotPasswordSending}
            >
              {forgotPasswordSending ? "Sending Reset Link..." : "Forgot Password?"}
            </button>

            {forgotPasswordNotice.message ? (
              <p
                className={`notice-text ${
                  forgotPasswordNotice.type === "error"
                    ? "notice-text--error"
                    : "notice-text--success"
                }`}
              >
                {forgotPasswordNotice.message}
              </p>
            ) : null}

            {authError ? <p className="error-text">{authError}</p> : null}
          </div>
        </main>
      </div>
    )
  }

  if (roleLoading) {
    return (
      <div className="app-shell">
        <main className="admin-panel admin-panel--centered">
          <h1 className="brand-title">Western Hydro Engineering Work Orders</h1>
          <p className="subtle-text">Loading access level...</p>
        </main>
      </div>
    )
  }

  const signedInEmail = String(session.user.email || "").toLowerCase().trim()
  const currentEmployeeProfile = employees.find(
    (employee) => String(employee.email || "").toLowerCase().trim() === signedInEmail
  )
  const metadataDisplayName = String(
    session.user?.user_metadata?.full_name ||
      session.user?.user_metadata?.display_name ||
      session.user?.user_metadata?.name ||
      ""
  ).trim()
  const isExplicitAdmin = userRole === "admin"
  const isExplicitEmployee = userRole === "employee"
  const isEmployeeUser = isExplicitEmployee || Boolean(currentEmployeeProfile)
  const appRole = isExplicitAdmin ? "admin" : "employee"
  const currentEmployeeName = currentEmployeeProfile?.name || metadataDisplayName || ""
  const accountDisplayName = currentEmployeeName || metadataDisplayName || ""
  const accountChipLabel = accountDisplayName || session.user.email
  const currentEmployeeNameCandidates = Array.from(
    new Set([
      ...getEmployeeNameMatchCandidates(currentEmployeeName),
      ...getEmployeeNameMatchCandidates(currentEmployeeProfile?.name),
      ...getEmployeeNameMatchCandidates(metadataDisplayName)
    ])
  )
  const currentEmployeeLooseNameCandidates = Array.from(
    new Set(currentEmployeeNameCandidates.map((value) => normalizeLooseName(value)).filter(Boolean))
  )
  const isAssignedToCurrentUser = (assignedToValue) => {
    if (currentEmployeeNameCandidates.length === 0) return false
    return parseAssignees(assignedToValue).some((name) => {
      const strictName = normalizeNameForComparison(name)
      const looseName = normalizeLooseName(name)

      if (currentEmployeeNameCandidates.includes(strictName)) return true
      if (currentEmployeeLooseNameCandidates.includes(looseName)) return true

      return false
    })
  }
  const requiresFirstLoginPasswordSetup =
    appRole === "employee" &&
    (session.user?.user_metadata?.needs_password_setup === true ||
      String(session.user?.user_metadata?.needs_password_setup || "").toLowerCase() === "true")

  if (requiresFirstLoginPasswordSetup) {
    return (
      <div className="app-shell">
        <main className="auth-card">
          <h1 className="brand-title">Western Hydro Engineering Work Orders</h1>
          <h2 className="section-title">Create Your Password</h2>

          <div className="auth-grid">
            <p className="subtle-text">
              Your login link worked. Set a password now before using your dashboard.
            </p>

            <input
              type="password"
              placeholder="New password"
              value={firstLoginPasswordValue}
              onChange={(e) => setFirstLoginPasswordValue(e.target.value)}
            />

            <input
              type="password"
              placeholder="Confirm new password"
              value={firstLoginPasswordConfirmValue}
              onChange={(e) => setFirstLoginPasswordConfirmValue(e.target.value)}
            />

            <button
              className="primary-btn"
              onClick={completeFirstLoginPasswordSetup}
              disabled={firstLoginPasswordSaving}
            >
              {firstLoginPasswordSaving ? "Saving..." : "Save Password"}
            </button>

            {firstLoginPasswordNotice.message ? (
              <p
                className={`notice-text ${
                  firstLoginPasswordNotice.type === "error"
                    ? "notice-text--error"
                    : "notice-text--success"
                }`}
              >
                {firstLoginPasswordNotice.message}
              </p>
            ) : null}
          </div>
        </main>
      </div>
    )
  }

  const compareJobsByScheduledDate = (a, b) => {
    const aDateKey = normalizeDateInput(a?.scheduled_date)
    const bDateKey = normalizeDateInput(b?.scheduled_date)

    if (aDateKey && bDateKey && aDateKey !== bDateKey) {
      return aDateKey.localeCompare(bDateKey)
    }

    if (aDateKey && !bDateKey) return -1
    if (!aDateKey && bDateKey) return 1

    const aCreated = new Date(a?.created_at || 0).getTime()
    const bCreated = new Date(b?.created_at || 0).getTime()
    if (aCreated !== bCreated) return aCreated - bCreated

    return String(a?.title || "").localeCompare(String(b?.title || ""))
  }

  const jobsSortedBySchedule = [...jobs].sort(compareJobsByScheduledDate)

  const activeJobs = jobsSortedBySchedule.filter(
    (job) => String(job.status || "").trim().toLowerCase() !== "completed"
  )
  const visibleJobs = isEmployeeUser
    ? jobsSortedBySchedule.filter((job) => isAssignedToCurrentUser(job.assigned_to))
    : jobsSortedBySchedule
  const visibleActiveJobs = isEmployeeUser
    ? activeJobs.filter((job) => isAssignedToCurrentUser(job.assigned_to))
    : activeJobs
  const completedJobs = jobsSortedBySchedule.filter(
    (job) => String(job.status || "").trim().toLowerCase() === "completed"
  )

  const scheduledCount = visibleActiveJobs.filter((job) => job.status === "Scheduled").length
  const assignedCount = visibleActiveJobs.filter(
    (job) => parseAssignees(job.assigned_to).length > 0
  ).length
  const homeSearchTerm = homeSearch.trim().toLowerCase()

  const filteredJobs = visibleActiveJobs.filter((job) => {
    if (dashboardFilter === "scheduled") return job.status === "Scheduled"
    if (dashboardFilter === "assigned") return parseAssignees(job.assigned_to).length > 0

    return true
  }).filter((job) => {
    if (!homeSearchTerm) return true

    const haystack = [
      job.title,
      job.job_number,
      job.job_description,
      job.notes,
      job.assigned_to,
      job.location,
      job.status,
      job.scheduled_date
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return haystack.includes(homeSearchTerm)
  })

  const completedSearchTerm = completedSearch.trim().toLowerCase()
  const filteredCompletedJobs = completedJobs.filter((job) => {
    if (!completedSearchTerm) return true

    const haystack = [
      job.title,
      job.job_number,
      job.job_description,
      job.notes,
      job.assigned_to,
      job.location
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return haystack.includes(completedSearchTerm)
  })

  const dashboardTitle = isEmployeeUser
    ? "My Work Orders"
    : dashboardFilter === "scheduled"
      ? "Scheduled Work Orders"
      : dashboardFilter === "assigned"
        ? "Assigned Work Orders"
        : "All Work Orders"

  const selectedJob = visibleJobs.find((job) => job.id === selectedJobId) || null
  const canManageJobs = appRole === "admin"
  const canControlTimer = appRole === "admin" || appRole === "employee"
  const canUploadDocuments = appRole === "admin" || appRole === "employee"
  const selectedJobPhaseInfo = selectedJob ? getJobPhaseInfo(selectedJob) : null
  const selectedJobPhaseJobs = selectedJobPhaseInfo
    ? jobs
        .filter((job) => getJobPhaseInfo(job).rootJobNumber === selectedJobPhaseInfo.rootJobNumber)
        .sort((a, b) => getJobPhaseInfo(a).currentPhase - getJobPhaseInfo(b).currentPhase)
    : []
  const selectedJobPhaseIndex = selectedJob
    ? selectedJobPhaseJobs.findIndex((job) => job.id === selectedJob.id)
    : -1
  const selectedJobPreviousPhase =
    selectedJobPhaseIndex > 0 ? selectedJobPhaseJobs[selectedJobPhaseIndex - 1] : null
  const selectedJobNextPhase =
    selectedJobPhaseIndex >= 0 && selectedJobPhaseIndex < selectedJobPhaseJobs.length - 1
      ? selectedJobPhaseJobs[selectedJobPhaseIndex + 1]
      : null
  const selectedJobCheckInEvents = parseCheckInEvents(selectedJob?.notes)
  const selectedJobNoteEntries = parseUserNoteEntries(selectedJob?.notes)
  const selectedJobNoteEntriesNewestFirst = [...selectedJobNoteEntries].reverse()
  const selectedJobMapLinks = selectedJob ? buildMapLinks(selectedJob.location) : null
  const selectedJobElapsedSeconds = selectedJob
    ? getElapsedSeconds(selectedJob, clockNow)
    : 0
  const selectedJobBillableHours = (selectedJobElapsedSeconds / 3600).toFixed(2)

  const calendarVisibleDays = calendarRange === "week" ? 7 : 30

  const jobsByDateKey = visibleActiveJobs.reduce((acc, job) => {
    const dateKey = normalizeDateInput(job.scheduled_date)
    if (!dateKey) return acc

    if (!acc[dateKey]) {
      acc[dateKey] = []
    }

    acc[dateKey].push(job)
    return acc
  }, {})

  const calendarCells = Array.from({ length: calendarVisibleDays }, (_, index) => {
    const dayDate = new Date(
      calendarAnchorDate.getFullYear(),
      calendarAnchorDate.getMonth(),
      calendarAnchorDate.getDate() + index
    )
    const dateKey = getLocalDateKey(dayDate)

    return {
      day: dayDate.getDate(),
      dateKey,
      shortDateLabel: dayDate.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
      }),
      jobs: jobsByDateKey[dateKey] || []
    }
  })

  const calendarRangeStartLabel = calendarCells[0]?.dateKey
    ? new Date(`${calendarCells[0].dateKey}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    : ""
  const calendarRangeEndLabel = calendarCells[calendarCells.length - 1]?.dateKey
    ? new Date(`${calendarCells[calendarCells.length - 1].dateKey}T00:00:00`).toLocaleDateString(
        undefined,
        {
          month: "short",
          day: "numeric",
          year: "numeric"
        }
      )
    : ""
  const calendarRangeLabel = `${calendarRangeStartLabel} - ${calendarRangeEndLabel}`

  const todayDateKey = getLocalDateKey(new Date())

  const employeeRequestStatusByDate = timeOffRequests.reduce((acc, request) => {
    const key = normalizeDateInput(request.request_date)
    if (!key) return acc
    acc[key] = String(request.status || "Pending")
    return acc
  }, {})

  const employeeApprovedDateSet = new Set(
    approvedTimeOffRequests
      .filter(
        (request) =>
          String(request.employee_email || "").toLowerCase() === signedInEmail &&
          normalizeDateInput(request.request_date)
      )
      .map((request) => normalizeDateInput(request.request_date))
  )

  const selectedCalendarDateJobs = selectedCalendarDateKey
    ? jobsByDateKey[selectedCalendarDateKey] || []
    : []

  const availableJobsForCalendarDate = selectedCalendarDateKey
    ? visibleActiveJobs.filter(
        (job) => {
          if (normalizeDateInput(job.scheduled_date) === selectedCalendarDateKey) return false

          const unavailableAssignees = parseAssignees(job.assigned_to).filter((name) =>
            isEmployeeUnavailableOnDate(name, selectedCalendarDateKey)
          )

          return unavailableAssignees.length === 0
        }
      )
    : []

  const selectedCalendarDateLabel = selectedCalendarDateKey
    ? new Date(`${selectedCalendarDateKey}T00:00:00`).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric"
      })
    : ""

  const billingStartKey = normalizeDateInput(billingStartDate)
  const billingEndKey = normalizeDateInput(billingEndDate)

  const legacyAssigneeNames = Array.from(
    new Set(jobs.flatMap((job) => parseAssignees(job.assigned_to)))
  ).filter(
    (name) =>
      !employees.some(
        (employee) => String(employee.name || "").toLowerCase() === name.toLowerCase()
      )
  )

  const employeeSummaries = [
    ...employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      isLegacy: false
    })),
    ...legacyAssigneeNames.map((name) => ({
      id: `legacy-${name}`,
      name,
      email: "",
      phone: "",
      isLegacy: true
    }))
  ].map((employee) => {
    const assignedJobsForEmployee = activeJobs.filter((job) => {
      const assignees = parseAssignees(job.assigned_to)
      return assignees.some(
        (assignee) => assignee.toLowerCase() === String(employee.name || "").toLowerCase()
      )
    })
    const inProgressJob = assignedJobsForEmployee.find((job) => job.status === "In Progress")
    const latestAssignedJob = assignedJobsForEmployee[0] || null

    return {
      ...employee,
      assignedJobsForEmployee,
      inProgressJob,
      latestAssignedJob
    }
  })

  const selectedEmployeeSummary =
    employeeSummaries.find((employee) => employee.id === selectedEmployeeId) || null

  const assignableEmployeeNames = Array.from(
    new Set(employeeSummaries.map((employee) => employee.name).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b))

  const dispatchLaneKeys =
    dispatchBoardMode === "status"
      ? DISPATCH_STATUS_LANES
      : ["__unassigned__", ...assignableEmployeeNames]

  const dispatchJobsByLane = dispatchLaneKeys.reduce((acc, laneKey) => {
    acc[laneKey] = []
    return acc
  }, {})

  jobsSortedBySchedule.forEach((job) => {
    if (dispatchBoardMode === "status") {
      const normalizedStatus = String(job.status || "Scheduled").trim().toLowerCase()
      const lane =
        DISPATCH_STATUS_LANES.find(
          (candidate) => candidate.toLowerCase() === normalizedStatus
        ) || "Scheduled"

      dispatchJobsByLane[lane].push(job)
      return
    }

    const primaryAssignee = parseAssignees(job.assigned_to)[0] || "__unassigned__"
    if (!dispatchJobsByLane[primaryAssignee]) {
      dispatchJobsByLane[primaryAssignee] = []
    }
    dispatchJobsByLane[primaryAssignee].push(job)
  })

  const dispatchMapJobs = jobsSortedBySchedule.filter((job) => String(job.location || "").trim())
  const selectedDispatchMapJob =
    dispatchMapJobs.find((job) => job.id === dispatchSelectedMapJobId) || dispatchMapJobs[0] || null
  const dispatchMapEmbedUrl = buildMapEmbedUrl(selectedDispatchMapJob?.location)

  const billingByEmployee = {}

  jobs.forEach((job) => {
    const dateKey = normalizeDateInput(job.scheduled_date)
    if (!dateKey) return
    if (billingStartKey && dateKey < billingStartKey) return
    if (billingEndKey && dateKey > billingEndKey) return

    const assignees = parseAssignees(job.assigned_to)
    if (assignees.length === 0) return

    const elapsedSeconds = getElapsedSeconds(job, clockNow)
    if (elapsedSeconds <= 0) return

    const splitSeconds = elapsedSeconds / assignees.length

    assignees.forEach((assignee) => {
      if (!billingByEmployee[assignee]) {
        const employeeRecord = employeeSummaries.find(
          (item) => String(item.name || "").toLowerCase() === assignee.toLowerCase()
        )

        billingByEmployee[assignee] = {
          name: assignee,
          email: employeeRecord?.email || "",
          phone: employeeRecord?.phone || "",
          totalSeconds: 0,
          jobCount: 0,
          jobs: []
        }
      }

      billingByEmployee[assignee].totalSeconds += splitSeconds
      billingByEmployee[assignee].jobCount += 1
      billingByEmployee[assignee].jobs.push({
        id: job.id,
        title: job.title,
        jobNumber: job.job_number,
        scheduledDate: job.scheduled_date,
        seconds: splitSeconds
      })
    })
  })

  const billingRows = Object.values(billingByEmployee)
    .map((row) => {
      const jobBreakdownById = {}

      row.jobs.forEach((item) => {
        const key = item.id || `${item.title || "work-order"}-${item.scheduledDate || "no-date"}`

        if (!jobBreakdownById[key]) {
          jobBreakdownById[key] = {
            id: item.id,
            title: item.title,
            jobNumber: item.jobNumber,
            scheduledDate: item.scheduledDate,
            seconds: 0
          }
        }

        jobBreakdownById[key].seconds += item.seconds
      })

      const jobBreakdown = Object.values(jobBreakdownById)
        .map((item) => ({
          ...item,
          seconds: Math.floor(item.seconds)
        }))
        .sort((a, b) => b.seconds - a.seconds)

      return {
        ...row,
        totalSeconds: Math.floor(row.totalSeconds),
        billableHours: row.totalSeconds / 3600,
        jobBreakdown
      }
    })
    .sort((a, b) => b.totalSeconds - a.totalSeconds)

  const billingGrandTotalSeconds = billingRows.reduce(
    (total, row) => total + row.totalSeconds,
    0
  )

  const availableJobsForSelectedEmployee = selectedEmployeeSummary
    ? activeJobs.filter(
        (job) => {
          const alreadyAssigned = parseAssignees(job.assigned_to).some(
            (name) =>
              name.toLowerCase() ===
              String(selectedEmployeeSummary.name || "").toLowerCase()
          )

          if (alreadyAssigned) return false

          const scheduledFor = normalizeDateInput(job.scheduled_date)
          if (!scheduledFor) return true

          return !isEmployeeUnavailableOnDate(selectedEmployeeSummary.name, scheduledFor)
        }
      )
    : []

  const effectiveViewMode =
    appRole === "employee" &&
    viewMode !== "dashboard" &&
    viewMode !== "calendar" &&
    viewMode !== "details" &&
    viewMode !== "account"
      ? "dashboard"
      : viewMode

  const adminUnreadNotifications =
    appRole === "admin"
      ? adminNotifications.filter((event) => !openedAdminNotificationIds.includes(event.id))
      : 0

  const adminNotificationUnreadCount =
    appRole === "admin" ? adminUnreadNotifications.length : 0

  const employeeAssignmentNotifications =
    appRole === "employee"
      ? visibleJobs
          .map((job) => ({
            id: `assign-${job.id}`,
            work_order_id: job.id,
            event_label: `Assigned: ${job.title || "Work Order"}`,
            created_at: job.updated_at || job.created_at || null,
            metadata: { status: job.status || "Scheduled" }
          }))
          .sort(
            (a, b) =>
              new Date(b.created_at || 0).getTime() -
              new Date(a.created_at || 0).getTime()
          )
      : []

  const employeeUnreadNotifications =
    appRole === "employee"
      ? employeeAssignmentNotifications.filter(
          (event) => !openedEmployeeNotificationIds.includes(event.id)
        )
      : 0

  const employeeNotificationUnreadCount =
    appRole === "employee" ? employeeUnreadNotifications.length : 0

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <h1 className="brand-title">Western Hydro Engineering Work Orders</h1>
          <p className="subtle-text">
            {appRole === "employee"
              ? "Employee dashboard: your assigned work orders."
              : "Admin dashboard for assigning jobs to team members."}
          </p>
          <div className="top-nav-tabs">
            <button
              className={`tab-btn ${effectiveViewMode === "dashboard" ? "tab-btn--active" : ""}`}
              onClick={openDashboardView}
            >
              Home
            </button>

            {appRole === "admin" ? (
              <>
                <button
                  className={`tab-btn ${effectiveViewMode === "create" ? "tab-btn--active" : ""}`}
                  onClick={openCreateView}
                >
                  Create Work Orders
                </button>
                <button
                  className={`tab-btn ${effectiveViewMode === "dispatch" ? "tab-btn--active" : ""}`}
                  onClick={openDispatchView}
                >
                  Dispatch
                </button>
                <button
                  className={`tab-btn ${effectiveViewMode === "employees" || effectiveViewMode === "employee-details" ? "tab-btn--active" : ""}`}
                  onClick={openEmployeesView}
                >
                  Employees
                </button>
              </>
            ) : null}

            <button
              className={`tab-btn ${effectiveViewMode === "calendar" ? "tab-btn--active" : ""}`}
              onClick={openCalendarView}
            >
              Calendar
            </button>

            <button
              className={`tab-btn ${effectiveViewMode === "account" ? "tab-btn--active" : ""}`}
              onClick={openAccountView}
            >
              Account
            </button>

            {appRole === "admin" ? (
              <>
                <button
                  className={`tab-btn ${effectiveViewMode === "completed" ? "tab-btn--active" : ""}`}
                  onClick={openCompletedView}
                >
                  Completed
                </button>
                <button
                  className={`tab-btn ${effectiveViewMode === "billing" ? "tab-btn--active" : ""}`}
                  onClick={openBillingView}
                >
                  Billing
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div className="top-bar-actions">
          {appRole === "admin" ? (
            <div className="notification-bell-wrap">
              <button
                type="button"
                className={`ghost-btn notification-bell-btn ${
                  showAdminNotifications ? "notification-bell-btn--active" : ""
                }`}
                onClick={toggleAdminNotifications}
              >
                <span className="notification-bell-icon" aria-hidden="true">&#128276;</span>
                <span>Notifications</span>
                <span className="notification-bell-count">{adminNotificationUnreadCount}</span>
              </button>

              {showAdminNotifications ? (
                <div className="notification-popover">
                  <div className="admin-notifications-head">
                    <h3>Admin Notifications</h3>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={loadAdminNotifications}
                      disabled={adminNotificationsLoading}
                    >
                      {adminNotificationsLoading ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>

                  {adminNotificationsNotice.message ? (
                    <p
                      className={`notice-text ${
                        adminNotificationsNotice.type === "error"
                          ? "notice-text--error"
                          : "notice-text--success"
                      }`}
                    >
                      {adminNotificationsNotice.message}
                    </p>
                  ) : null}

                  {adminNotificationsLoading && adminUnreadNotifications.length === 0 ? (
                    <p className="empty-text">Loading notifications...</p>
                  ) : null}

                  {!adminNotificationsLoading && adminUnreadNotifications.length === 0 ? (
                    <p className="empty-text">No new notifications.</p>
                  ) : null}

                  {adminUnreadNotifications.length > 0 ? (
                    <ul className="admin-notifications-list">
                      {adminUnreadNotifications.map((event) => {
                        const relatedJob = jobs.find((job) => job.id === event.work_order_id)

                        return (
                          <li key={event.id}>
                            <div>
                              <p className="events-list-title">{formatEventLabel(event)}</p>
                              <p className="events-list-meta">
                                {relatedJob?.title
                                  ? `Work order: ${relatedJob.title}`
                                  : "Work order update"}
                              </p>
                              <p className="events-list-meta">
                                {formatDateTime(event.created_at)}
                                {event.actor_name ? ` | ${event.actor_name}` : ""}
                              </p>
                            </div>
                            {event.work_order_id ? (
                              <button
                                type="button"
                                className="ghost-btn"
                                onClick={() => {
                                  setOpenedAdminNotificationIds((current) =>
                                    current.includes(event.id) ? current : [...current, event.id]
                                  )
                                  setShowAdminNotifications(false)
                                  openJobDetails(event.work_order_id)
                                }}
                              >
                                Open
                              </button>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}

                  <div className="admin-notifications-footer">
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => {
                        setShowAllNotifications(true)
                        loadAllAdminNotifications()
                      }}
                    >
                      All Notifications
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : appRole === "employee" ? (
            <div className="notification-bell-wrap">
              <button
                type="button"
                className={`ghost-btn notification-bell-btn ${
                  showEmployeeNotifications ? "notification-bell-btn--active" : ""
                }`}
                onClick={() => toggleEmployeeNotifications(employeeAssignmentNotifications)}
              >
                <span className="notification-bell-icon" aria-hidden="true">&#128276;</span>
                <span>Notifications</span>
                <span className="notification-bell-count">{employeeNotificationUnreadCount}</span>
              </button>

              {showEmployeeNotifications ? (
                <div className="notification-popover">
                  <div className="admin-notifications-head">
                    <h3>My Assignments</h3>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={loadJobs}
                    >
                      Refresh
                    </button>
                  </div>

                  {employeeUnreadNotifications.length === 0 ? (
                    <p className="empty-text">No new assignment notifications.</p>
                  ) : (
                    <ul className="admin-notifications-list">
                      {employeeUnreadNotifications.map((event) => {
                        const relatedJob = jobs.find((job) => job.id === event.work_order_id)

                        return (
                          <li key={event.id}>
                            <div>
                              <p className="events-list-title">{event.event_label}</p>
                              <p className="events-list-meta">
                                {relatedJob?.job_number
                                  ? `Job #: ${relatedJob.job_number}`
                                  : "Assigned work order"}
                              </p>
                              <p className="events-list-meta">
                                {formatDateTime(event.created_at)}
                                {relatedJob?.status ? ` | ${relatedJob.status}` : ""}
                              </p>
                            </div>
                            {event.work_order_id ? (
                              <button
                                type="button"
                                className="ghost-btn"
                                onClick={() => {
                                  setOpenedEmployeeNotificationIds((current) =>
                                    current.includes(event.id) ? current : [...current, event.id]
                                  )
                                  setShowEmployeeNotifications(false)
                                  openJobDetails(event.work_order_id)
                                }}
                              >
                                Open
                              </button>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
          <span className="user-chip">{accountChipLabel}</span>
          <button className="ghost-btn" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </header>

      {appRole === "admin" && showAllNotifications ? (
        <div className="notification-modal-overlay" onClick={() => setShowAllNotifications(false)}>
          <section className="notification-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-notifications-head">
              <h3>All Notifications</h3>
              <button
                type="button"
                className="ghost-btn"
                onClick={loadAllAdminNotifications}
                disabled={adminNotificationHistoryLoading}
              >
                {adminNotificationHistoryLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {adminNotificationsNotice.message ? (
              <p
                className={`notice-text ${
                  adminNotificationsNotice.type === "error"
                    ? "notice-text--error"
                    : "notice-text--success"
                }`}
              >
                {adminNotificationsNotice.message}
              </p>
            ) : null}

            {adminNotificationHistoryLoading && adminNotificationHistory.length === 0 ? (
              <p className="empty-text">Loading notifications...</p>
            ) : null}

            {!adminNotificationHistoryLoading && adminNotificationHistory.length === 0 ? (
              <p className="empty-text">No historical notifications found.</p>
            ) : null}

            {adminNotificationHistory.length > 0 ? (
              <ul className="admin-notifications-list admin-notifications-list--history">
                {adminNotificationHistory.map((event) => {
                  const relatedJob = jobs.find((job) => job.id === event.work_order_id)

                  return (
                    <li key={`history-${event.id}`}>
                      <div>
                        <p className="events-list-title">{formatEventLabel(event)}</p>
                        <p className="events-list-meta">
                          {relatedJob?.title
                            ? `Work order: ${relatedJob.title}`
                            : "Work order update"}
                        </p>
                        <p className="events-list-meta">
                          {formatDateTime(event.created_at)}
                          {event.actor_name ? ` | ${event.actor_name}` : ""}
                        </p>
                      </div>
                      {event.work_order_id ? (
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => {
                            setShowAllNotifications(false)
                            setShowAdminNotifications(false)
                            openJobDetails(event.work_order_id)
                          }}
                        >
                          Open
                        </button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : null}

            <div className="admin-notifications-footer">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowAllNotifications(false)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {effectiveViewMode === "dashboard" ? (
        <>
          {appRole === "admin" ? (
            <section className="stats-row">
              <article
                className={`stat-card ${dashboardFilter === "all" ? "stat-card--active" : ""}`}
                onClick={() => setDashboardFilter("all")}
              >
                <p>Total Work Orders</p>
                <h3>{visibleActiveJobs.length}</h3>
              </article>
              <article
                className={`stat-card ${dashboardFilter === "scheduled" ? "stat-card--active" : ""}`}
                onClick={() => setDashboardFilter("scheduled")}
              >
                <p>Scheduled</p>
                <h3>{scheduledCount}</h3>
              </article>
              <article
                className={`stat-card ${dashboardFilter === "assigned" ? "stat-card--active" : ""}`}
                onClick={() => setDashboardFilter("assigned")}
              >
                <p>Assigned</p>
                <h3>{assignedCount}</h3>
              </article>
            </section>
          ) : null}

          <main className="dashboard-main">
            <section
              key={`jobs-${dashboardFilter}`}
              className="jobs-card jobs-card--present"
            >
              <div className="completed-head">
                <h2 className="section-title">{dashboardTitle}</h2>
                <input
                  className="completed-search"
                  type="search"
                  placeholder="Search work orders"
                  value={homeSearch}
                  onChange={(e) => setHomeSearch(e.target.value)}
                />
              </div>
              {filteredJobs.length === 0 ? (
                <p className="empty-text">
                  {homeSearchTerm
                    ? "No work orders match this search."
                    : "No jobs yet in database."}
                </p>
              ) : (
                <div className="jobs-list">
                  {filteredJobs.map((job) => {
                    const isInProgress = String(job.status || "").trim().toLowerCase() === "in progress"
                    const elapsedSeconds = getElapsedSeconds(job, clockNow)
                    const checkInEvents = parseCheckInEvents(job.notes)
                    const phaseInfo = getJobPhaseInfo(job)

                    return (
                      <article
                        key={job.id}
                        className={`job-item ${selectedJobId === job.id ? "job-item--selected" : ""}`}
                        onClick={() => openJobDetails(job.id)}
                      >
                        <div className="job-head">
                          <h3>{job.title}</h3>
                          <span className={`status-pill ${getStatusPillClass(job.status)}`}>
                            {job.status}
                          </span>
                        </div>
                        <p>Job #: {job.job_number}</p>
                        <p>Description: {job.job_description || "None"}</p>
                        <p>Assigned to: {formatAssignees(job.assigned_to)}</p>
                        <p>Scheduled date: {formatScheduledDate(job.scheduled_date)}</p>
                        <p>Phase: {phaseInfo.currentPhase}</p>
                        {checkInEvents.ARRIVE_ON_SITE ? (
                          <p>Arrived on site: {formatDateTime(checkInEvents.ARRIVE_ON_SITE)}</p>
                        ) : null}
                        {isInProgress ? (
                          <p className="in-progress-time">
                            Time in progress: {formatDuration(elapsedSeconds)} ({(elapsedSeconds / 3600).toFixed(2)} hrs)
                          </p>
                        ) : null}
                        <p className="open-hint">Click to open work order</p>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </main>
        </>
      ) : effectiveViewMode === "create" ? (
        <main className="create-main">
          <section className="form-card">
            <h2 className="section-title">Create Work Orders</h2>
            <div className="job-form-grid">
              <div className="create-template-row full-width-field">
                <label>
                  Template
                  <select
                    value={selectedJobTemplateId}
                    onChange={(e) => applyJobTemplate(e.target.value)}
                  >
                    <option value="">No template</option>
                    {JOB_TEMPLATES.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedJobTemplateId ? (
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => applyJobTemplate(selectedJobTemplateId)}
                  >
                    Reapply Template
                  </button>
                ) : null}
              </div>

              <input
                placeholder="Well Number Or Job Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <textarea
                rows={3}
                placeholder="Job Description"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />

              <textarea
                rows={3}
                placeholder="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="voice-controls-row full-width-field">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() =>
                    voiceListeningTarget === "create"
                      ? stopVoiceCapture()
                      : startVoiceCapture("create")
                  }
                >
                  {voiceListeningTarget === "create" ? "Stop Voice Notes" : "Voice Notes"}
                </button>
                {voiceListeningTarget === "create" ? (
                  <p className="subtle-text">Listening... speak now.</p>
                ) : null}
              </div>

              {voiceNotice.message ? (
                <p
                  className={`notice-text ${
                    voiceNotice.type === "error" ? "notice-text--error" : "notice-text--success"
                  } full-width-field`}
                >
                  {voiceNotice.message}
                </p>
              ) : null}

              <div className="assignee-picker">
                <p className="assignee-label">Upload documents (PDF/images)</p>
                <label className="pdf-upload-control">
                  <span>Select files</span>
                  <input
                    key={createFileInputKey}
                    type="file"
                    accept="application/pdf,image/*"
                    multiple
                    onChange={onCreateFilesSelected}
                  />
                </label>
                <p className="file-count-text">
                  {createFiles.length > 0
                    ? `${createFiles.length} file(s) selected`
                    : "No files selected"}
                </p>
                {createDocsNotice.message ? (
                  <p
                    className={`notice-text ${
                      createDocsNotice.type === "error"
                        ? "notice-text--error"
                        : "notice-text--success"
                    }`}
                  >
                    {createDocsNotice.message}
                  </p>
                ) : null}
              </div>

              <input
                placeholder={'Location (address or GPS like 31°44\'52.3"N 109°42\'04.6"W)'}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />

              <div className="assignee-picker">
                <p className="assignee-label">Assign team members</p>
                <div className="assignee-grid">
                  {assignableEmployeeNames.map((name) => (
                    <label key={name} className="assignee-option">
                      <input
                        type="checkbox"
                        checked={assignedTo.includes(name)}
                        onChange={() => toggleCreateAssignee(name)}
                      />
                      <span>{name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />

              <div className="assignee-picker phase-builder-panel">
                <div className="phase-builder-head">
                  <p className="assignee-label">Phases</p>
                  <label className="phase-builder-toggle">
                    <input
                      type="checkbox"
                      checked={createPhasesEnabled}
                      onChange={(e) => {
                        const enabled = e.target.checked
                        setCreatePhasesEnabled(enabled)
                        if (!enabled) {
                          setCreatePhaseRows([])
                        }
                      }}
                    />
                    <span>Create multi-phase job</span>
                  </label>
                </div>

                <p className="subtle-text phase-builder-help">
                  Phase 1 uses the main assignee/date above. Add more phases here to assign different people.
                </p>

                {createPhasesEnabled ? (
                  <>
                    <div className="phase-builder-list">
                      {createPhaseRows.map((phase, index) => (
                        <article key={phase.id} className="phase-builder-item">
                          <div className="phase-builder-item-head">
                            <h4>Phase {index + 2}</h4>
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={() => removeCreatePhaseRow(phase.id)}
                            >
                              Remove
                            </button>
                          </div>

                          <input
                            placeholder={`Phase ${index + 2} title (optional)`}
                            value={phase.title}
                            onChange={(e) => updateCreatePhaseRow(phase.id, "title", e.target.value)}
                          />

                          <div className="assignee-grid">
                            {assignableEmployeeNames.map((name) => (
                              <label key={`${phase.id}-${name}`} className="assignee-option">
                                <input
                                  type="checkbox"
                                  checked={phase.assignees.includes(name)}
                                  onChange={() => toggleCreatePhaseAssignee(phase.id, name)}
                                />
                                <span>{name}</span>
                              </label>
                            ))}
                          </div>

                          <input
                            type="date"
                            value={phase.scheduledDate}
                            onChange={(e) =>
                              updateCreatePhaseRow(phase.id, "scheduledDate", e.target.value)
                            }
                          />
                        </article>
                      ))}
                    </div>

                    <div className="phase-builder-actions">
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={addCreatePhaseRow}
                      >
                        Add Phase
                      </button>
                    </div>
                  </>
                ) : null}
              </div>

              <button className="primary-btn form-submit" onClick={addJob} disabled={loading}>
                {loading ? "Adding..." : "+ New Job"}
              </button>
            </div>
          </section>
        </main>
      ) : effectiveViewMode === "dispatch" ? (
        <main className="dashboard-main">
          <section className="jobs-card jobs-card--present">
            <div className="completed-head">
              <h2 className="section-title">Dispatch Board</h2>
              <p className="subtle-text">
                {dispatchBoardMode === "status"
                  ? "Drag jobs between status lanes and set schedule quickly."
                  : "Drag jobs to change primary assignee and balance crew workload."}
              </p>
            </div>

            <div className="dispatch-mode-toggle">
              <button
                type="button"
                className={`ghost-btn ${dispatchBoardMode === "status" ? "dispatch-mode-toggle-btn--active" : ""}`}
                onClick={() => setDispatchBoardMode("status")}
              >
                By Status
              </button>
              <button
                type="button"
                className={`ghost-btn ${dispatchBoardMode === "assignee" ? "dispatch-mode-toggle-btn--active" : ""}`}
                onClick={() => setDispatchBoardMode("assignee")}
              >
                By Assignee
              </button>
              <button
                type="button"
                className={`ghost-btn ${dispatchShowMapPanel ? "dispatch-mode-toggle-btn--active" : ""}`}
                onClick={() => setDispatchShowMapPanel((current) => !current)}
              >
                {dispatchShowMapPanel ? "Hide Map" : "Show Map"}
              </button>
            </div>

            {dispatchNotice.message ? (
              <p
                className={`notice-text ${
                  dispatchNotice.type === "error" ? "notice-text--error" : "notice-text--success"
                }`}
              >
                {dispatchNotice.message}
              </p>
            ) : null}

            <div className="dispatch-layout">
              <div className="dispatch-board">
                {dispatchLaneKeys.map((laneKey) => (
                <section
                  key={`dispatch-lane-${laneKey}`}
                  className="dispatch-lane"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault()
                    const draggedJobId = e.dataTransfer.getData("text/plain") || dispatchDraggingJobId
                    setDispatchDraggingJobId("")
                    if (!draggedJobId) return

                    if (dispatchBoardMode === "status") {
                      await moveDispatchJobToStatus(draggedJobId, laneKey)
                    } else {
                      await moveDispatchJobToAssignee(draggedJobId, laneKey)
                    }
                  }}
                >
                  <header className="dispatch-lane-head">
                    <h3>{laneKey === "__unassigned__" ? "Unassigned" : laneKey}</h3>
                    <span>{dispatchJobsByLane[laneKey]?.length || 0}</span>
                  </header>

                  <div className="dispatch-lane-list">
                    {(dispatchJobsByLane[laneKey] || []).map((job) => {
                      const today = new Date()
                      const tomorrow = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        today.getDate() + 1
                      )
                      const todayKey = getLocalDateKey(today)
                      const tomorrowKey = getLocalDateKey(tomorrow)
                      const primaryAssignee = parseAssignees(job.assigned_to)[0] || "Unassigned"

                      return (
                        <article
                          key={`dispatch-job-${job.id}`}
                          className="dispatch-card"
                          draggable={dispatchSavingJobId !== job.id}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", job.id)
                            setDispatchDraggingJobId(job.id)
                          }}
                          onDragEnd={() => setDispatchDraggingJobId("")}
                        >
                          <button
                            type="button"
                            className="dispatch-card-open"
                            onClick={() => openJobDetails(job.id)}
                          >
                            <strong>{job.title || "Work Order"}</strong>
                            <span>{job.job_number || "No job #"}</span>
                          </button>

                          <p className="dispatch-card-meta">
                            Scheduled: {formatScheduledDate(job.scheduled_date)}
                          </p>
                          <p className="dispatch-card-meta">Assigned: {formatAssignees(job.assigned_to)}</p>
                          {dispatchBoardMode === "assignee" ? (
                            <p className="dispatch-card-meta">Primary: {primaryAssignee}</p>
                          ) : null}

                          <div className="dispatch-card-actions">
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={() => {
                                setDispatchSelectedMapJobId(job.id)
                                setDispatchShowMapPanel(true)
                              }}
                            >
                              Map
                            </button>
                            <button
                              type="button"
                              className="ghost-btn"
                              disabled={dispatchSavingJobId === job.id}
                              onClick={() => rescheduleDispatchJob(job.id, todayKey)}
                            >
                              Today
                            </button>
                            <button
                              type="button"
                              className="ghost-btn"
                              disabled={dispatchSavingJobId === job.id}
                              onClick={() => rescheduleDispatchJob(job.id, tomorrowKey)}
                            >
                              Tomorrow
                            </button>
                            <button
                              type="button"
                              className="ghost-btn"
                              disabled={dispatchSavingJobId === job.id}
                              onClick={() => rescheduleDispatchJob(job.id, "")}
                            >
                              Clear
                            </button>
                          </div>
                        </article>
                      )
                    })}

                    {(dispatchJobsByLane[laneKey] || []).length === 0 ? (
                      <p className="empty-text">Drop work orders here.</p>
                    ) : null}
                  </div>
                </section>
                ))}
              </div>

              {dispatchShowMapPanel ? (
                <aside className="dispatch-map-panel">
                  <h3>Map-First Dispatch</h3>
                  {selectedDispatchMapJob ? (
                    <>
                      <p className="dispatch-card-meta">
                        {selectedDispatchMapJob.title || "Work Order"}
                        {selectedDispatchMapJob.job_number
                          ? ` (${selectedDispatchMapJob.job_number})`
                          : ""}
                      </p>
                      <p className="dispatch-card-meta">
                        {selectedDispatchMapJob.location || "No location set"}
                      </p>
                      {dispatchMapEmbedUrl ? (
                        <iframe
                          title="Dispatch Map"
                          className="dispatch-map-embed"
                          src={dispatchMapEmbedUrl}
                          loading="lazy"
                        />
                      ) : null}
                    </>
                  ) : (
                    <p className="empty-text">No mapped work orders yet.</p>
                  )}

                  {dispatchMapJobs.length > 0 ? (
                    <div className="dispatch-map-list">
                      {dispatchMapJobs.slice(0, 16).map((job) => (
                        <button
                          key={`dispatch-map-${job.id}`}
                          type="button"
                          className={`ghost-btn ${
                            selectedDispatchMapJob?.id === job.id
                              ? "dispatch-mode-toggle-btn--active"
                              : ""
                          }`}
                          onClick={() => setDispatchSelectedMapJobId(job.id)}
                        >
                          {job.title || "Work Order"}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </aside>
              ) : null}
            </div>
          </section>
        </main>
      ) : effectiveViewMode === "employees" ? (
        <main className="employees-main">
          <section className="jobs-card jobs-card--present">
            <h2 className="section-title">Employees</h2>
            <div className="employee-toolbar">
              <button
                type="button"
                className="primary-btn"
                onClick={() => setShowAddEmployeeForm((current) => !current)}
              >
                {showAddEmployeeForm ? "Close Add Employee" : "Add Employee"}
              </button>
            </div>

            {showAddEmployeeForm ? (
              <div className="employee-manage-panel">
                <h3>Add Employee</h3>
                <p className="subtle-text employee-login-note">
                  Employees use email magic-link login. Temporary email inboxes are fine for testing.
                </p>
                <div className="employee-manage-grid">
                  <input
                    placeholder="Name"
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newEmployeeEmail}
                    onChange={(e) => setNewEmployeeEmail(e.target.value)}
                  />
                  <input
                    placeholder="Phone"
                    value={newEmployeePhone}
                    onChange={(e) => setNewEmployeePhone(e.target.value)}
                  />
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={addEmployeeOption}
                    disabled={employeeManageSaving}
                  >
                    {employeeManageSaving ? "Saving..." : "Add Employee"}
                  </button>
                </div>

                <label className="employee-login-toggle">
                  <input
                    type="checkbox"
                    checked={sendLoginOnCreate}
                    onChange={(e) => setSendLoginOnCreate(e.target.checked)}
                  />
                  <span>Send login link after adding employee (requires email)</span>
                </label>

                {employeeManageNotice.message ? (
                  <p
                    className={`notice-text ${
                      employeeManageNotice.type === "error"
                        ? "notice-text--error"
                        : "notice-text--success"
                    }`}
                  >
                    {employeeManageNotice.message}
                  </p>
                ) : null}

                {employeeAuthNotice.message ? (
                  <p
                    className={`notice-text ${
                      employeeAuthNotice.type === "error"
                        ? "notice-text--error"
                        : "notice-text--success"
                    }`}
                  >
                    {employeeAuthNotice.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            {employeeLoading ? <p className="empty-text">Loading employees...</p> : null}
            <div className="employees-list">
              {employeeSummaries.map((employee) => {
                const liveJob = employee.inProgressJob || employee.latestAssignedJob
                const employeeRoleLabel = getEmployeeRoleLabel(employee, signedInEmail, userRole)
                const liveStatus = employee.inProgressJob
                  ? `In Progress: ${employee.inProgressJob.title}`
                  : employee.latestAssignedJob
                    ? `${employee.latestAssignedJob.status}: ${employee.latestAssignedJob.title}`
                    : "Available"
                const liveBadgeLabel =
                  String(liveJob?.status || "").trim().toLowerCase() === "in progress"
                    ? liveJob?.title || "In Progress"
                    : liveJob?.status || "Available"
                const isExpanded = expandedEmployeeId === employee.id
                const isInlineEditing = editingInlineEmployeeId === employee.id

                return (
                  <article key={employee.id} className="employee-item employee-item--collapsed">
                    <div className="employee-summary-row">
                      <div className="employee-head">
                        <div className="employee-head-main">
                          <h3>{employee.name}</h3>
                          <span
                            className={`role-pill role-pill--${employeeRoleLabel}`}
                          >
                            {employeeRoleLabel === "admin"
                              ? "Admin"
                              : employeeRoleLabel === "legacy"
                                ? "Legacy"
                                : "Employee"}
                          </span>
                        </div>
                        {liveJob ? (
                          <span className={`status-pill ${getStatusPillClass(liveJob.status)}`}>
                            {liveBadgeLabel}
                          </span>
                        ) : (
                          <span className="status-pill status-pill--scheduled">Available</span>
                        )}
                      </div>
                      <div className="employee-summary-actions">
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() =>
                            setExpandedEmployeeId((current) =>
                              current === employee.id ? "" : employee.id
                            )
                          }
                        >
                          {isExpanded ? "Collapse" : "Expand"}
                        </button>
                        {!employee.isLegacy ? (
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={() => {
                              setExpandedEmployeeId(employee.id)
                              startInlineEmployeeEdit(employee)
                            }}
                          >
                            Edit
                          </button>
                        ) : null}
                        {!employee.isLegacy ? (
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() => openEmployeeDetails(employee.id)}
                          >
                            Manage
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() => createEmployeeRecordFromLegacy(employee.name)}
                            disabled={employeeManageSaving}
                          >
                            {employeeManageSaving ? "Creating..." : "Create Record"}
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="employee-collapsible-body">
                        <p>Email: {employee.email || "Not set"}</p>
                        <p>Phone: {employee.phone || "Not set"}</p>
                        <p>Login setup: {employee.email ? "Ready" : "Email required"}</p>
                        <p>Assigned jobs: {employee.assignedJobsForEmployee.length}</p>
                        <p>Current status: {liveStatus}</p>
                        <p className="open-hint">
                          {employee.isLegacy
                            ? "Legacy assignee (not in employees table)"
                            : "Use Manage to edit or remove employee"}
                        </p>
                        {employee.isLegacy ? (
                          <div className="employee-collapsible-actions">
                            <button
                              type="button"
                              className="primary-btn"
                              onClick={() => createEmployeeRecordFromLegacy(employee.name)}
                              disabled={employeeManageSaving}
                            >
                              {employeeManageSaving ? "Creating..." : "Create Editable Record"}
                            </button>
                          </div>
                        ) : null}
                        {!employee.isLegacy ? (
                          <>
                            {isInlineEditing ? (
                              <div className="employee-inline-edit">
                                <input
                                  placeholder="Name"
                                  value={inlineEmployeeName}
                                  onChange={(e) => setInlineEmployeeName(e.target.value)}
                                />
                                <input
                                  type="email"
                                  placeholder="Email"
                                  value={inlineEmployeeEmail}
                                  onChange={(e) => setInlineEmployeeEmail(e.target.value)}
                                />
                                <input
                                  placeholder="Phone"
                                  value={inlineEmployeePhone}
                                  onChange={(e) => setInlineEmployeePhone(e.target.value)}
                                />
                                <div className="employee-inline-edit-actions">
                                  <button
                                    type="button"
                                    className="ghost-btn"
                                    onClick={cancelInlineEmployeeEdit}
                                    disabled={employeeManageSaving}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className="primary-btn"
                                    onClick={() => saveInlineEmployeeOption(employee.id)}
                                    disabled={employeeManageSaving}
                                  >
                                    {employeeManageSaving ? "Saving..." : "Save"}
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            <div className="employee-collapsible-actions">
                              {!isInlineEditing ? (
                                <button
                                  type="button"
                                  className="ghost-btn"
                                  onClick={() => startInlineEmployeeEdit(employee)}
                                >
                                  Edit
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="ghost-btn"
                                onClick={() => removeInlineEmployeeOption(employee.id)}
                                disabled={employeeManageSaving}
                              >
                                Remove
                              </button>
                              <button
                                type="button"
                                className="primary-btn"
                                onClick={() => openEmployeeDetails(employee.id)}
                              >
                                Assign
                              </button>
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </section>
        </main>
      ) : effectiveViewMode === "employee-details" ? (
        <main className="details-page">
          <button className="ghost-btn back-btn" onClick={goBackToEmployees}>
            Back to Employees
          </button>

          <section className="job-details-panel">
            <div className="job-details-head">
              <div className="employee-head-main">
                <h3>{selectedEmployeeSummary?.name || "Employee"}</h3>
                {selectedEmployeeSummary ? (
                  <span
                    className={`role-pill role-pill--${getEmployeeRoleLabel(
                      selectedEmployeeSummary,
                      signedInEmail,
                      userRole
                    )}`}
                  >
                    {(() => {
                      const detailRole = getEmployeeRoleLabel(
                        selectedEmployeeSummary,
                        signedInEmail,
                        userRole
                      )
                      if (detailRole === "admin") return "Admin"
                      if (detailRole === "legacy") return "Legacy"
                      return "Employee"
                    })()}
                  </span>
                ) : null}
              </div>
            </div>

            {!selectedEmployeeSummary ? (
              <p className="empty-text">Employee not found.</p>
            ) : (
              <div className="employee-details-stack">
                {!selectedEmployeeSummary.isLegacy ? (
                  <div className="assign-workorders-panel">
                    <h4>Employee Info</h4>

                    {employeeManageNotice.message ? (
                      <p
                        className={`notice-text ${
                          employeeManageNotice.type === "error"
                            ? "notice-text--error"
                            : "notice-text--success"
                        }`}
                      >
                        {employeeManageNotice.message}
                      </p>
                    ) : null}

                    <div className="employee-manage-grid">
                      <input
                        placeholder="Name"
                        value={editingEmployeeName}
                        onChange={(e) => setEditingEmployeeName(e.target.value)}
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={editingEmployeeEmail}
                        onChange={(e) => setEditingEmployeeEmail(e.target.value)}
                      />
                      <input
                        placeholder="Phone"
                        value={editingEmployeePhone}
                        onChange={(e) => setEditingEmployeePhone(e.target.value)}
                      />
                      <div className="employee-manage-actions">
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={renameEmployeeOption}
                          disabled={employeeManageSaving}
                        >
                          {employeeManageSaving ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={sendLoginForSelectedEmployee}
                          disabled={
                            employeeManageSaving ||
                            sendingEmployeeAuthForId === selectedEmployeeSummary.id
                          }
                        >
                          {sendingEmployeeAuthForId === selectedEmployeeSummary.id
                            ? "Sending..."
                            : "Send Login Link"}
                        </button>
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={removeEmployeeOption}
                          disabled={employeeManageSaving}
                        >
                          Remove Employee
                        </button>
                      </div>
                    </div>

                    {employeeAuthNotice.message ? (
                      <p
                        className={`notice-text ${
                          employeeAuthNotice.type === "error"
                            ? "notice-text--error"
                            : "notice-text--success"
                        }`}
                      >
                        {employeeAuthNotice.message}
                      </p>
                    ) : null}

                    {employeeRoleNotice.message ? (
                      <p
                        className={`notice-text ${
                          employeeRoleNotice.type === "error"
                            ? "notice-text--error"
                            : "notice-text--success"
                        }`}
                      >
                        {employeeRoleNotice.message}
                      </p>
                    ) : null}

                    <div className="employee-manage-actions employee-role-actions">
                      <p className="employee-role-heading">Access</p>
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() =>
                          changeEmployeeRoleByEmail(selectedEmployeeSummary, "admin")
                        }
                        disabled={employeeRoleSaving || employeeManageSaving}
                      >
                        {employeeRoleSaving ? "Updating..." : "Make Admin"}
                      </button>
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() =>
                          changeEmployeeRoleByEmail(selectedEmployeeSummary, "employee")
                        }
                        disabled={employeeRoleSaving || employeeManageSaving}
                      >
                        {employeeRoleSaving ? "Updating..." : "Make Employee"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="empty-text">
                    This is a legacy assignee from work orders. Create a real employee record to
                    manage name, email, and phone.
                  </p>
                )}

                <div className="assign-workorders-panel">
                  <h4>Assign Work Orders</h4>

                  {employeeAssignNotice.message ? (
                    <p
                      className={`notice-text ${
                        employeeAssignNotice.type === "error"
                          ? "notice-text--error"
                          : "notice-text--success"
                      }`}
                    >
                      {employeeAssignNotice.message}
                    </p>
                  ) : null}

                  {availableJobsForSelectedEmployee.length === 0 ? (
                    <p className="empty-text">No available work orders to assign.</p>
                  ) : (
                    <div className="assign-jobs-list">
                      {availableJobsForSelectedEmployee.map((job) => (
                        <article key={job.id} className="assign-job-item">
                          <div>
                            <p className="assign-job-title">{job.title}</p>
                            <p>Job #: {job.job_number || "Not set"}</p>
                          </div>
                          <button
                            type="button"
                            className="primary-btn"
                            disabled={assigningJobId === job.id}
                            onClick={() =>
                              assignWorkOrderToEmployee(job.id, selectedEmployeeSummary.name)
                            }
                          >
                            {assigningJobId === job.id ? "Assigning..." : "Assign"}
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <h4>Assigned Work Orders</h4>
                {selectedEmployeeSummary.assignedJobsForEmployee.length === 0 ? (
                  <p className="empty-text">No assigned work orders.</p>
                ) : (
                  <div className="employee-jobs-list">
                    {selectedEmployeeSummary.assignedJobsForEmployee.map((job) => (
                      <article key={job.id} className="employee-job-item" onClick={() => openJobDetails(job.id)}>
                        <div className="job-head">
                          <h3>{job.title}</h3>
                          <span className={`status-pill ${getStatusPillClass(job.status)}`}>
                            {job.status}
                          </span>
                        </div>
                        <p>Job #: {job.job_number || "Not set"}</p>
                        <p>Scheduled date: {formatScheduledDate(job.scheduled_date)}</p>
                        <p className="open-hint">Click to open work order</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      ) : effectiveViewMode === "calendar" ? (
        <main className="calendar-main">
          <section className="jobs-card jobs-card--present">
            <div className="calendar-head">
              <h2 className="section-title">Scheduled Work Order Calendar</h2>
              <div className="calendar-nav">
                <button className="ghost-btn" onClick={goToPreviousCalendarMonth}>
                  {calendarRange === "week" ? "Previous Week" : "Previous 30 Days"}
                </button>
                <p className="calendar-month-label">{calendarRangeLabel}</p>
                <button className="ghost-btn" onClick={goToNextCalendarMonth}>
                  {calendarRange === "week" ? "Next Week" : "Next 30 Days"}
                </button>
                <button
                  className="primary-btn"
                  type="button"
                  onClick={() =>
                    setCalendarRange((current) => (current === "week" ? "month" : "week"))
                  }
                >
                  {calendarRange === "week" ? "Show Month" : "Show Week"}
                </button>
              </div>
              <div className="calendar-search">
                <label htmlFor="calendar-date-search">Go to date</label>
                <input
                  id="calendar-date-search"
                  type="date"
                  value={calendarSearchDate}
                  onChange={(e) => jumpToCalendarDate(e.target.value)}
                />
              </div>
            </div>

            {appRole === "employee" ? (
              <div className="timeoff-panel">
                <div className="timeoff-panel-head">
                  <h3>Time-Off Requests</h3>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => setShowTimeOffForm((current) => !current)}
                  >
                    {showTimeOffForm ? "Close" : "Time Off"}
                  </button>
                </div>

                {showTimeOffForm ? (
                  <div className="timeoff-form-wrap">
                    <div className="timeoff-type-buttons">
                      <button
                        type="button"
                        className={`ghost-btn ${timeOffType === "Day Off" ? "timeoff-type-btn--active" : ""}`}
                        onClick={() => setTimeOffType("Day Off")}
                      >
                        Day Off
                      </button>
                      <button
                        type="button"
                        className={`ghost-btn ${timeOffType === "Sick Day" ? "timeoff-type-btn--active" : ""}`}
                        onClick={() => setTimeOffType("Sick Day")}
                      >
                        Sick Day
                      </button>
                    </div>

                    <div className="timeoff-form">
                      <input
                        type="date"
                        value={timeOffDate || selectedCalendarDateKey}
                        onChange={(e) => setTimeOffDate(e.target.value)}
                      />
                      <input
                        placeholder="Reason (optional)"
                        value={timeOffReason}
                        onChange={(e) => setTimeOffReason(e.target.value)}
                      />
                      {timeOffType === "Sick Day" ? (
                        <label className="pdf-upload-control timeoff-upload-control">
                          <span>{doctorNoteFileName || "Upload doctor note (optional)"}</span>
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null
                              setDoctorNoteFile(file)
                              setDoctorNoteFileName(file?.name || "")
                            }}
                          />
                        </label>
                      ) : null}
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={submitTimeOffRequest}
                        disabled={timeOffSaving}
                      >
                        {timeOffSaving ? "Submitting..." : `Submit ${timeOffType}`}
                      </button>
                    </div>
                  </div>
                ) : null}

                {timeOffNotice.message ? (
                  <p
                    className={`notice-text ${
                      timeOffNotice.type === "error" ? "notice-text--error" : "notice-text--success"
                    }`}
                  >
                    {timeOffNotice.message}
                  </p>
                ) : null}

                {timeOffLoading ? <p>Loading requests...</p> : null}

                {!timeOffLoading && timeOffRequests.length > 0 ? (
                  <ul className="timeoff-list">
                    {timeOffRequests.slice(0, 6).map((request) => (
                      <li key={request.id}>
                        <span>{normalizeDateInput(request.request_date)}</span>
                        <span className="timeoff-status">{request.status || "Pending"}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <div className="timeoff-panel">
                <h3>Time-Off Requests</h3>
                {timeOffNotice.message ? (
                  <p
                    className={`notice-text ${
                      timeOffNotice.type === "error" ? "notice-text--error" : "notice-text--success"
                    }`}
                  >
                    {timeOffNotice.message}
                  </p>
                ) : null}

                {adminTimeOffLoading ? <p>Loading requests...</p> : null}

                {!adminTimeOffLoading && adminTimeOffRequests.length === 0 ? (
                  <p className="empty-text">No time-off requests.</p>
                ) : null}

                {!adminTimeOffLoading && adminTimeOffRequests.length > 0 ? (
                  <ul className="timeoff-list">
                    {adminTimeOffRequests.slice(0, 12).map((request) => (
                      <li key={request.id}>
                        {(() => {
                          const details = parseTimeOffReasonDetails(request.reason)

                          return (
                            <>
                        <div>
                          <p className="timeoff-list-name">{request.employee_name || request.employee_email}</p>
                          <p className="timeoff-list-meta">
                            {normalizeDateInput(request.request_date)}
                            {details.displayReason ? ` - ${details.displayReason}` : ""}
                          </p>
                          <p className="timeoff-list-meta">Type: {details.type || "Day Off"}</p>
                        </div>
                        <div className="timeoff-actions">
                          <span className="timeoff-status">{request.status || "Pending"}</span>
                          {details.doctorNotePath ? (
                            <button
                              className="ghost-btn"
                              type="button"
                              onClick={() => openTimeOffDoctorNote(details.doctorNotePath, request.id)}
                              disabled={openingDoctorNoteId === request.id}
                            >
                              {openingDoctorNoteId === request.id ? "Opening..." : "Doctor Note"}
                            </button>
                          ) : null}
                          {request.status !== "Approved" ? (
                            <button
                              className="ghost-btn"
                              type="button"
                              onClick={() => updateTimeOffRequestStatus(request.id, "Approved")}
                              disabled={timeOffActionId === request.id}
                            >
                              Approve
                            </button>
                          ) : null}
                          {request.status !== "Denied" ? (
                            <button
                              className="ghost-btn"
                              type="button"
                              onClick={() => updateTimeOffRequestStatus(request.id, "Denied")}
                              disabled={timeOffActionId === request.id}
                            >
                              Deny
                            </button>
                          ) : null}
                        </div>
                            </>
                          )
                        })()}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}

            <div className="calendar-scroll">
              <div className="calendar-grid">
              {calendarCells.map((cell) =>
                <article
                  key={cell.dateKey}
                  className={`calendar-day-card ${
                    selectedCalendarDateKey === cell.dateKey
                      ? "calendar-day-card--selected"
                      : ""
                  } ${
                    appRole === "employee" && employeeApprovedDateSet.has(cell.dateKey)
                      ? "calendar-day-card--timeoff-approved"
                      : ""
                  } ${
                    appRole === "employee" && employeeRequestStatusByDate[cell.dateKey] === "Pending"
                      ? "calendar-day-card--timeoff-pending"
                      : ""
                  } ${cell.dateKey === todayDateKey ? "calendar-day-card--today" : ""}`}
                  onClick={() => selectCalendarDate(cell.dateKey)}
                >
                  <div className="calendar-day-head">
                    <strong>{cell.shortDateLabel}</strong>
                    <span>
                      {appRole === "employee" && employeeApprovedDateSet.has(cell.dateKey)
                        ? "Unavailable"
                        : appRole === "employee" && employeeRequestStatusByDate[cell.dateKey] === "Pending"
                          ? "Pending PTO"
                          : `${cell.jobs.length} jobs`}
                    </span>
                  </div>

                  {cell.jobs.length === 0 ? (
                    <p className="calendar-empty">No jobs</p>
                  ) : (
                    <div className="calendar-jobs-list">
                      {cell.jobs.slice(0, selectedCalendarDateKey === cell.dateKey ? 6 : 2).map((job) => (
                        <button
                          key={job.id}
                          type="button"
                          className="calendar-job-chip"
                          onClick={(e) => {
                            e.stopPropagation()
                            openJobDetails(job.id)
                          }}
                        >
                          {job.title}
                        </button>
                      ))}
                      {selectedCalendarDateKey !== cell.dateKey && cell.jobs.length > 2 ? (
                        <p className="calendar-more">+{cell.jobs.length - 2} more</p>
                      ) : null}
                    </div>
                  )}

                  {selectedCalendarDateKey === cell.dateKey && appRole === "admin" ? (
                    <div className="calendar-day-expand" onClick={(e) => e.stopPropagation()}>
                      <h4>Assign to this date</h4>
                      {calendarAssignNotice.message ? (
                        <p
                          className={`notice-text ${
                            calendarAssignNotice.type === "error"
                              ? "notice-text--error"
                              : "notice-text--success"
                          }`}
                        >
                          {calendarAssignNotice.message}
                        </p>
                      ) : null}

                      <div className="calendar-assign-controls">
                        <select
                          value={calendarAssignJobId}
                          onChange={(e) => setCalendarAssignJobId(e.target.value)}
                        >
                          <option value="">Select work order</option>
                          {availableJobsForCalendarDate
                            .filter((job) => normalizeDateInput(job.scheduled_date) !== cell.dateKey)
                            .map((job) => (
                              <option key={job.id} value={job.id}>
                                {formatJobOptionLabel(job)}
                              </option>
                            ))}
                        </select>

                        <button
                          type="button"
                          className="primary-btn"
                          disabled={!calendarAssignJobId || calendarAssigning}
                          onClick={assignWorkOrderToCalendarDate}
                        >
                          {calendarAssigning ? "Assigning..." : "Assign"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              )}
              </div>
            </div>
          </section>
        </main>
      ) : effectiveViewMode === "completed" ? (
        <main className="dashboard-main">
          <section className="jobs-card jobs-card--present">
            <div className="completed-head">
              <h2 className="section-title">Completed Work Orders</h2>
              <input
                className="completed-search"
                type="search"
                placeholder="Search completed work orders"
                value={completedSearch}
                onChange={(e) => setCompletedSearch(e.target.value)}
              />
            </div>

            {filteredCompletedJobs.length === 0 ? (
              <p className="empty-text">No completed work orders found.</p>
            ) : (
              <div className="jobs-list">
                {filteredCompletedJobs.map((job) => (
                  (() => {
                    const phaseInfo = getJobPhaseInfo(job)

                    return (
                  <article
                    key={job.id}
                    className={`job-item ${selectedJobId === job.id ? "job-item--selected" : ""}`}
                    onClick={() => openJobDetails(job.id)}
                  >
                    <div className="job-head">
                      <h3>{job.title}</h3>
                      <span className={`status-pill ${getStatusPillClass(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    <p>Job #: {job.job_number}</p>
                    <p>Description: {job.job_description || "None"}</p>
                    <p>Assigned to: {formatAssignees(job.assigned_to)}</p>
                    <p>Scheduled date: {formatScheduledDate(job.scheduled_date)}</p>
                    <p>Phase: {phaseInfo.currentPhase}</p>
                    <p className="open-hint">Click to open work order</p>
                  </article>
                    )
                  })()
                ))}
              </div>
            )}
          </section>
        </main>
      ) : effectiveViewMode === "billing" ? (
        <main className="dashboard-main">
          <section className="jobs-card jobs-card--present">
            <div className="completed-head">
              <h2 className="section-title">Billing Reports</h2>
              <div className="billing-range-controls">
                <label>
                  Start
                  <input
                    type="date"
                    value={billingStartDate}
                    onChange={(e) => setBillingStartDate(e.target.value)}
                  />
                </label>
                <label>
                  End
                  <input
                    type="date"
                    value={billingEndDate}
                    onChange={(e) => setBillingEndDate(e.target.value)}
                  />
                </label>
              </div>
            </div>

            <p className="subtle-text billing-note">
              Hours are based on work order time tracking. For multi-assignee work orders, hours
              are split evenly across assigned employees.
            </p>

            {billingRows.length === 0 ? (
              <p className="empty-text">No tracked billable hours found for this date range.</p>
            ) : (
              <div className="billing-table-wrap">
                <table className="billing-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Work Orders</th>
                      <th>Total Time</th>
                      <th>Billable Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingRows.map((row) => {
                      const isExpanded = expandedBillingEmployee === row.name

                      return [
                        <tr key={row.name}>
                          <td>
                            <div className="billing-employee-cell">
                              <span>{row.name}</span>
                              {row.jobBreakdown.length > 0 ? (
                                <button
                                  type="button"
                                  className="ghost-btn billing-expand-btn"
                                  onClick={() =>
                                    setExpandedBillingEmployee((current) =>
                                      current === row.name ? "" : row.name
                                    )
                                  }
                                >
                                  {isExpanded ? "Hide" : "Breakdown"}
                                </button>
                              ) : null}
                            </div>
                          </td>
                          <td>{row.email || "Not set"}</td>
                          <td>{row.phone || "Not set"}</td>
                          <td>{row.jobCount}</td>
                          <td>{formatDuration(row.totalSeconds)}</td>
                          <td>{row.billableHours.toFixed(2)}</td>
                        </tr>,
                        isExpanded ? (
                          <tr key={`${row.name}-breakdown`} className="billing-breakdown-row">
                            <td colSpan={6}>
                              <div className="billing-breakdown">
                                <p className="billing-breakdown-title">Work order breakdown</p>
                                <ul className="billing-breakdown-list">
                                  {row.jobBreakdown.map((item) => (
                                    <li key={item.id || `${row.name}-${item.title}-${item.scheduledDate || ""}`}>
                                      <span>
                                        {item.title || "Untitled"}
                                        {item.jobNumber ? ` (Job #${item.jobNumber})` : ""}
                                        {item.scheduledDate
                                          ? ` - ${formatScheduledDate(item.scheduledDate)}`
                                          : ""}
                                      </span>
                                      <span>
                                        {formatDuration(item.seconds)} ({(item.seconds / 3600).toFixed(2)} hrs)
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </td>
                          </tr>
                        ) : null
                      ]
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4}>Grand Total</td>
                      <td>{formatDuration(billingGrandTotalSeconds)}</td>
                      <td>{(billingGrandTotalSeconds / 3600).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </main>
      ) : effectiveViewMode === "account" ? (
        <main className="dashboard-main">
          <section className="form-card account-card">
            <h2 className="section-title">My Account</h2>
            <p className="subtle-text">Use your name here so the app shows it instead of only your email.</p>

            <div className="account-summary-grid">
              <p>
                <strong>Email:</strong> {session.user.email}
              </p>
              <p>
                <strong>Access:</strong> {appRole === "admin" ? "Admin" : "Employee"}
              </p>
            </div>

            <label>
              Name
              <input
                value={accountNameInput}
                onChange={(e) => setAccountNameInput(e.target.value)}
                placeholder="Your name"
              />
            </label>

            <div className="account-actions-row">
              <button
                type="button"
                className="primary-btn"
                onClick={saveMyAccount}
                disabled={accountSaving}
              >
                {accountSaving ? "Saving..." : "Save Name"}
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setAccountNotice({ type: "", message: "" })
                  setAccountNameInput(accountDisplayName)
                }}
                disabled={accountSaving}
              >
                Reset
              </button>
            </div>

            {accountNotice.message ? (
              <p
                className={`notice-text ${
                  accountNotice.type === "error" ? "notice-text--error" : "notice-text--success"
                }`}
              >
                {accountNotice.message}
              </p>
            ) : null}
          </section>
        </main>
      ) : (
        <main className="details-page">
          <button className="ghost-btn back-btn" onClick={goBackToDashboard}>
            Back to Work Orders
          </button>

          {selectedJob ? (
            <section className="job-details-panel">
              <div className="job-details-head">
                <h3>Work Order Details</h3>
                {canManageJobs && editingJobId === selectedJob.id ? (
                  <div className="job-details-actions">
                    <button className="ghost-btn" onClick={cancelEditing} disabled={savingEdit}>
                      Cancel
                    </button>
                    <button className="primary-btn" onClick={saveEditedJob} disabled={savingEdit}>
                      {savingEdit ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      className="ghost-btn job-delete-btn"
                      onClick={() => deleteSelectedWorkOrder(selectedJob, canManageJobs)}
                      disabled={savingEdit || deletingJob}
                    >
                      {deletingJob ? "Deleting..." : "Delete Work Order"}
                    </button>
                  </div>
                ) : canManageJobs ? (
                  <div className="job-details-actions">
                    <button
                      className="primary-btn"
                      onClick={() => startEditing(selectedJob)}
                    >
                      Edit Work Order
                    </button>
                    <button
                      className="ghost-btn job-delete-btn"
                      onClick={() => deleteSelectedWorkOrder(selectedJob, canManageJobs)}
                      disabled={deletingJob}
                    >
                      {deletingJob ? "Deleting..." : "Delete Work Order"}
                    </button>
                  </div>
                ) : null}
              </div>

              {editNotice.message ? (
                <p
                  className={`notice-text ${
                    editNotice.type === "error" ? "notice-text--error" : "notice-text--success"
                  }`}
                >
                  {editNotice.message}
                </p>
              ) : null}

              <div className="timer-panel">
                <p className="timer-heading">Time Tracking</p>
                <p className="timer-value">{formatDuration(selectedJobElapsedSeconds)}</p>
                <p className="timer-hours">Billable hours: {selectedJobBillableHours}</p>
                {canControlTimer ? (
                  <div className="timer-actions">
                    {isTimerRunning(selectedJob) ? (
                      <button
                        className="ghost-btn"
                        type="button"
                        onClick={() => pauseTimerForJob(selectedJob)}
                        disabled={timerSaving}
                      >
                        {timerSaving ? "Saving..." : appRole === "employee" ? "Pause Job" : "Pause"}
                      </button>
                    ) : (
                      <button
                        className="primary-btn"
                        type="button"
                        onClick={() => startTimerForJob(selectedJob)}
                        disabled={timerSaving}
                      >
                        {timerSaving ? "Saving..." : appRole === "employee" ? "Start Job" : "Start"}
                      </button>
                    )}
                    {canManageJobs ? (
                      <button
                        className="ghost-btn"
                        type="button"
                        onClick={() => resetTimerForJob(selectedJob)}
                        disabled={timerSaving}
                      >
                        Reset
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {timerNotice.message ? (
                  <p
                    className={`notice-text ${
                      timerNotice.type === "error"
                        ? "notice-text--error"
                        : "notice-text--success"
                    }`}
                  >
                    {timerNotice.message}
                  </p>
                ) : null}
              </div>

              {canManageJobs && editingJobId === selectedJob.id ? (
                <div className="job-edit-grid">
                  <label>
                    Title
                    <input
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm((form) => ({ ...form, title: e.target.value }))
                      }
                      placeholder="Well Number Or Job Title"
                    />
                  </label>

                  <label className="full-width-field">
                    Job Description
                    <textarea
                      rows={4}
                      value={editForm.job_description}
                      onChange={(e) =>
                        setEditForm((form) => ({ ...form, job_description: e.target.value }))
                      }
                    />
                  </label>

                  <label>
                    Assigned To
                    <div className="assignee-grid assignee-grid--edit">
                      {assignableEmployeeNames.map((name) => (
                        <label key={name} className="assignee-option">
                          <input
                            type="checkbox"
                            checked={editForm.assigned_to.includes(name)}
                            onChange={() => toggleEditAssignee(name)}
                          />
                          <span>{name}</span>
                        </label>
                      ))}
                    </div>
                  </label>

                  <label>
                    Scheduled Date
                    <input
                      type="date"
                      value={editForm.scheduled_date}
                      onChange={(e) =>
                        setEditForm((form) => ({ ...form, scheduled_date: e.target.value }))
                      }
                    />
                  </label>

                  <label>
                    Status
                    <select
                      value={editForm.status}
                      onChange={(e) =>
                        setEditForm((form) => ({ ...form, status: e.target.value }))
                      }
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Paused">Paused</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </label>

                  <label className="full-width-field">
                    Location
                    <input
                      value={editForm.location}
                      onChange={(e) =>
                        setEditForm((form) => ({ ...form, location: e.target.value }))
                      }
                    />
                  </label>

                  <label className="full-width-field">
                    Notes
                    <textarea
                      rows={4}
                      value={editForm.notes}
                      onChange={(e) =>
                        setEditForm((form) => ({ ...form, notes: e.target.value }))
                      }
                    />
                  </label>
                </div>
              ) : (
                <div className="job-details-grid">
                  <div className="job-summary-grid">
                    <div className="job-summary-item">
                      <span className="job-summary-label">Title</span>
                      <p className="job-summary-value">{selectedJob.title || "Not set"}</p>
                    </div>
                    <div className="job-summary-item">
                      <span className="job-summary-label">Job #</span>
                      <p className="job-summary-value">{selectedJob.job_number || "Not set"}</p>
                    </div>
                    <div className="job-summary-item">
                      <span className="job-summary-label">Status</span>
                      <p className="job-summary-value">
                        <span className={`status-pill ${getStatusPillClass(selectedJob.status)}`}>
                          {selectedJob.status || "Not set"}
                        </span>
                      </p>
                    </div>
                    <div className="job-summary-item">
                      <span className="job-summary-label">Phase</span>
                      <p className="job-summary-value">
                        {selectedJobPhaseInfo
                          ? `${selectedJobPhaseInfo.currentPhase} of ${selectedJobPhaseJobs.length}`
                          : "1"}
                      </p>
                    </div>
                    <div className="job-summary-item">
                      <span className="job-summary-label">Assigned To</span>
                      <p className="job-summary-value">{formatAssignees(selectedJob.assigned_to)}</p>
                    </div>
                    <div className="job-summary-item">
                      <span className="job-summary-label">Scheduled Date</span>
                      <p className="job-summary-value">{formatScheduledDate(selectedJob.scheduled_date)}</p>
                    </div>
                    <div className="job-summary-item">
                      <span className="job-summary-label">Arrived On Site</span>
                      <p className="job-summary-value">{formatDateTime(selectedJobCheckInEvents.ARRIVE_ON_SITE)}</p>
                    </div>
                    <div className="job-summary-item job-summary-item--full">
                      <span className="job-summary-label">Job Description</span>
                      <p className="job-summary-value">{selectedJob.job_description || "None"}</p>
                    </div>
                    <div className="job-summary-item job-summary-item--full">
                      <span className="job-summary-label">Location</span>
                      <p className="job-summary-value">{selectedJob.location || "Not set"}</p>
                    </div>
                    {selectedJobMapLinks ? (
                      <div className="job-summary-item job-summary-item--full">
                        <span className="job-summary-label">Maps</span>
                        <p className="job-summary-value map-links-row">
                          <a href={selectedJobMapLinks.apple} target="_blank" rel="noreferrer">Apple Maps</a>
                          <span>|</span>
                          <a href={selectedJobMapLinks.google} target="_blank" rel="noreferrer">Google Maps</a>
                        </p>
                      </div>
                    ) : null}
                    <div className="job-summary-item">
                      <span className="job-summary-label">Created</span>
                      <p className="job-summary-value">{formatDateTime(selectedJob.created_at)}</p>
                    </div>
                    <div className="job-summary-item">
                      <span className="job-summary-label">Updated</span>
                      <p className="job-summary-value">{formatDateTime(selectedJob.updated_at)}</p>
                    </div>
                  </div>

                  {selectedJobPhaseJobs.length > 1 ? (
                    <div className="phase-chain-panel">
                      <div className="phase-chain-head">
                        <h4>Phase Chain</h4>
                        <p>{selectedJobPhaseInfo?.rootJobNumber}</p>
                      </div>

                      <div className="phase-chain-nav">
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => selectedJobPreviousPhase && openJobDetails(selectedJobPreviousPhase.id)}
                          disabled={!selectedJobPreviousPhase}
                        >
                          Previous Phase
                        </button>
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => selectedJobNextPhase && openJobDetails(selectedJobNextPhase.id)}
                          disabled={!selectedJobNextPhase}
                        >
                          Next Phase
                        </button>
                      </div>

                      <ul className="phase-chain-list">
                        {selectedJobPhaseJobs.map((job) => {
                          const info = getJobPhaseInfo(job)
                          const isCurrent = selectedJob.id === job.id

                          return (
                            <li key={`phase-${job.id}`} className={isCurrent ? "phase-chain-list-item--active" : ""}>
                              <div>
                                <p className="events-list-title">
                                  Phase {info.currentPhase}: {job.title || "Work Order"}
                                </p>
                                <p className="events-list-meta">
                                  {job.job_number || "No job #"} | {formatAssignees(job.assigned_to)}
                                </p>
                                <p className="events-list-meta">{formatScheduledDate(job.scheduled_date)}</p>
                              </div>
                              {!isCurrent ? (
                                <button
                                  type="button"
                                  className="ghost-btn"
                                  onClick={() => openJobDetails(job.id)}
                                >
                                  Open
                                </button>
                              ) : (
                                <span className="phase-chain-current">Current</span>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : null}

                  <div className="notes-display-block">
                    <div className="notes-display-head">
                      <strong>Notes</strong>
                      <span>{selectedJobNoteEntries.length}</span>
                    </div>
                    {selectedJobNoteEntries.length === 0 ? (
                      <p className="notes-display-empty">No notes yet.</p>
                    ) : (
                      <ul className="notes-display-list">
                        {selectedJobNoteEntriesNewestFirst.map((entry) => (
                          <li key={entry.id}>
                            <p className="notes-display-meta">
                              {entry.author || "Update"}
                              {entry.timestamp ? ` | ${entry.timestamp}` : ""}
                            </p>
                            <p className="notes-display-text">{entry.text}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {canManageJobs && String(selectedJob.status || "").toLowerCase() === "completed" ? (
                    <div className="next-phase-panel">
                      <h4>Next Phase Assignment</h4>
                      <p className="subtle-text">
                        Create the next phase and assign it to the next person or crew.
                      </p>

                      <div className="assignee-grid assignee-grid--edit">
                        {assignableEmployeeNames.map((name) => (
                          <label key={`next-phase-${name}`} className="assignee-option">
                            <input
                              type="checkbox"
                              checked={nextPhaseAssignees.includes(name)}
                              onChange={() => toggleNextPhaseAssignee(name)}
                            />
                            <span>{name}</span>
                          </label>
                        ))}
                      </div>

                      <div className="next-phase-actions">
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={() => createNextPhaseWorkOrder(selectedJob)}
                          disabled={nextPhaseSaving}
                        >
                          {nextPhaseSaving ? "Creating..." : "Create Next Phase"}
                        </button>
                      </div>

                      {nextPhaseNotice.message ? (
                        <p
                          className={`notice-text ${
                            nextPhaseNotice.type === "error"
                              ? "notice-text--error"
                              : "notice-text--success"
                          }`}
                        >
                          {nextPhaseNotice.message}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {appRole === "employee" ? (
                    <div className="employee-checkin-panel">
                      <h4>Check-In Workflow</h4>
                      <div className="employee-checkin-actions">
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={() => runEmployeeCheckInAction(selectedJob, "START_SHIFT")}
                          disabled={employeeJobActionSaving}
                        >
                          Start Shift
                        </button>
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => runEmployeeCheckInAction(selectedJob, "ARRIVE_ON_SITE")}
                          disabled={employeeJobActionSaving}
                        >
                          Arrive On Site
                        </button>
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => runEmployeeCheckInAction(selectedJob, "LEAVE_SITE")}
                          disabled={employeeJobActionSaving}
                        >
                          Leave Site
                        </button>
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => runEmployeeCheckInAction(selectedJob, "COMPLETE_JOB")}
                          disabled={employeeJobActionSaving}
                        >
                          Complete Job
                        </button>
                      </div>

                      <div className="employee-checkin-times">
                        <p><strong>Shift Started:</strong> {formatDateTime(selectedJobCheckInEvents.START_SHIFT)}</p>
                        <p><strong>Arrived On Site:</strong> {formatDateTime(selectedJobCheckInEvents.ARRIVE_ON_SITE)}</p>
                        <p><strong>Left Site:</strong> {formatDateTime(selectedJobCheckInEvents.LEAVE_SITE)}</p>
                        <p><strong>Completed:</strong> {formatDateTime(selectedJobCheckInEvents.COMPLETE_JOB)}</p>
                      </div>
                    </div>
                  ) : null}

                  {appRole === "employee" ? (
                    <div className="employee-job-note-panel">
                      <h4>Job Notes</h4>
                      <textarea
                        rows={3}
                        placeholder="Add what was done, issues, parts used, etc."
                        value={employeeJobNote}
                        onChange={(e) => setEmployeeJobNote(e.target.value)}
                      />
                      <div className="voice-controls-row">
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() =>
                            voiceListeningTarget === "employee"
                              ? stopVoiceCapture()
                              : startVoiceCapture("employee")
                          }
                          disabled={employeeJobActionSaving}
                        >
                          {voiceListeningTarget === "employee" ? "Stop Voice Note" : "Voice Note"}
                        </button>
                        {voiceListeningTarget === "employee" ? (
                          <p className="subtle-text">Listening... speak your note.</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={() => addEmployeeNoteToJob(selectedJob)}
                        disabled={employeeJobActionSaving}
                      >
                        {employeeJobActionSaving ? "Saving..." : "Add Note"}
                      </button>

                      {employeeJobActionNotice.message ? (
                        <p
                          className={`notice-text ${
                            employeeJobActionNotice.type === "error"
                              ? "notice-text--error"
                              : "notice-text--success"
                          }`}
                        >
                          {employeeJobActionNotice.message}
                        </p>
                      ) : null}

                      {voiceNotice.message ? (
                        <p
                          className={`notice-text ${
                            voiceNotice.type === "error"
                              ? "notice-text--error"
                              : "notice-text--success"
                          }`}
                        >
                          {voiceNotice.message}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="documents-panel">
                    <h4>Necessary Documents</h4>
                    {canUploadDocuments ? (
                      <label className="pdf-upload-control">
                        <span>
                          {uploadingPdf
                            ? "Uploading..."
                            : appRole === "employee"
                              ? "Upload Picture"
                              : "Upload File"}
                        </span>
                        <input
                          type="file"
                          accept={appRole === "employee" ? "image/*" : "application/pdf,image/*"}
                          onChange={uploadPdfForJob}
                          disabled={uploadingPdf}
                        />
                      </label>
                    ) : null}

                    {docsNotice.message ? (
                      <p
                        className={`notice-text ${
                          docsNotice.type === "error" ? "notice-text--error" : "notice-text--success"
                        }`}
                      >
                        {docsNotice.message}
                      </p>
                    ) : null}

                    {docsLoading ? <p>Loading documents...</p> : null}

                    {!docsLoading && documents.length === 0 ? (
                      <p className="empty-text">No documents uploaded yet.</p>
                    ) : null}

                    {!docsLoading && documents.length > 0 ? (
                      <ul className="documents-list">
                        {documents.map((document) => (
                          <li key={document.id}>
                            <span>{document.file_name || "PDF Document"}</span>
                            {canManageJobs ? (
                              <div className="document-actions">
                                <button
                                  className="ghost-btn"
                                  onClick={() => openDocument(document.storage_path)}
                                  type="button"
                                  disabled={documentActionId === document.id || replacingDocumentId === document.id}
                                >
                                  Open
                                </button>

                                <label className="pdf-upload-control pdf-upload-control--inline">
                                  <span>
                                    {replacingDocumentId === document.id ? "Replacing..." : "Replace"}
                                  </span>
                                  <input
                                    type="file"
                                    accept="application/pdf,image/*"
                                    disabled={
                                      documentActionId === document.id ||
                                      replacingDocumentId === document.id
                                    }
                                    onChange={(event) => {
                                      const file = event.target.files?.[0]
                                      replaceDocument(document, file)
                                      event.target.value = ""
                                    }}
                                  />
                                </label>

                                <button
                                  className="ghost-btn"
                                  onClick={() => removeDocument(document)}
                                  type="button"
                                  disabled={documentActionId === document.id || replacingDocumentId === document.id}
                                >
                                  {documentActionId === document.id ? "Removing..." : "Remove"}
                                </button>
                              </div>
                            ) : (
                              <button
                                className="ghost-btn"
                                onClick={() => openDocument(document.storage_path)}
                                type="button"
                              >
                                Open
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  <div className="events-panel">
                    <h4>Job History Timeline</h4>

                    {eventsLoading ? <p>Loading timeline...</p> : null}

                    {!eventsLoading && jobEvents.length === 0 ? (
                      <p className="empty-text">No timeline events yet.</p>
                    ) : null}

                    {!eventsLoading && jobEvents.length > 0 ? (
                      <ul className="events-list">
                        {jobEvents.map((event) => (
                          <li key={event.id}>
                            <p className="events-list-title">{formatEventLabel(event)}</p>
                            <p className="events-list-meta">
                              {formatDateTime(event.created_at)}
                              {event.actor_name ? ` - ${event.actor_name}` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className="job-details-panel">
              <p className="empty-text">No work order selected.</p>
            </section>
          )}
        </main>
      )}
    </div>
  )
}
