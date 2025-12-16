"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Check, X, Clock, Loader2, Users, QrCode, RefreshCw, Copy, CheckCircle } from "lucide-react"
import QRCode from "react-qr-code"

interface Member {
  id: number
  name: string
  email?:  string
  studentNumber?: string
}

interface SessionStudioProps {
  subject: any
  isNewSession?: boolean
  sessionId?: number
  members?:  Member[]
  onBack:  () => void
  onSessionSave: (sessionData: any) => void
}

interface StudentAttendance {
  id: number
  name: string
  status: "present" | "absent" | "late" | "excused"
}

export default function SessionStudio({
                                        subject,
                                        isNewSession = true,
                                        sessionId,
                                        members = [],
                                        onBack,
                                        onSessionSave,
                                      }: SessionStudioProps) {
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0])
  const [sessionTime, setSessionTime] = useState(
      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  )
  const [isVisible, setIsVisible] = useState(true)
  const [students, setStudents] = useState<StudentAttendance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // QR Code states
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null)
  const [isGeneratingQr, setIsGeneratingQr] = useState(false)
  const [lateAfterMinutes, setLateAfterMinutes] = useState(15)
  const [qrExpiresInMinutes, setQrExpiresInMinutes] = useState(60)
  const [copied, setCopied] = useState(false)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false)

  // Current session ID (for new sessions, this gets set after first save)
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(sessionId || null)

  // Initialize students from members
  useEffect(() => {
    if (members.length > 0 && students.length === 0) {
      setStudents(
          members.map((m) => ({
            id: m.id,
            name: m.name,
            status: "absent" as const,
          }))
      )
    }
  }, [members])

  // Load existing session data if editing
  useEffect(() => {
    if (!isNewSession && sessionId && subject?.id) {
      setCurrentSessionId(sessionId)
      loadSessionData()
    }
  }, [isNewSession, sessionId, subject?.id])

  // Auto-refresh attendance when QR is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (autoRefreshEnabled && currentSessionId && qrUrl) {
      interval = setInterval(() => {
        loadSessionData()
      }, 5000) // Refresh every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefreshEnabled, currentSessionId, qrUrl])

  const loadSessionData = async () => {
    if (!subject?.id || !currentSessionId) return

    try {
      const response = await fetch(`/api/teacher/subjects/${subject.id}/attendance/${currentSessionId}`)
      const data = await response.json()

      if (data.success) {
        if (! isLoading) {
          setSessionDate(data.session.date)
          setSessionTime(data.session.time || "")
          setIsVisible(data.session.visible)
        }

        // Update attendance records
        const attendanceMap = new Map(
            data.session.records?.map((r: any) => [r.studentId, r.status])
        )
        setStudents(
            members.map((m) => ({
              id: m.id,
              name: m.name,
              status: (attendanceMap.get(m.id) as any) || "absent",
            }))
        )
      }
    } catch (error) {
      console.error("Failed to load session:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateStatus = (studentId: number, status: "present" | "absent" | "late" | "excused") => {
    setStudents(students.map((s) => (s.id === studentId ? { ...s, status } : s)))
  }

  const markAllPresent = () => {
    setStudents(students.map((s) => ({ ...s, status: "present" })))
  }

  const markAllAbsent = () => {
    setStudents(students.map((s) => ({ ...s, status: "absent" })))
  }

  const handleSave = async () => {
    if (!subject?.id) return

    setIsSaving(true)
    setError(null)

    try {
      const isCreating = !currentSessionId
      const endpoint = isCreating
          ? `/api/teacher/subjects/${subject.id}/attendance`
          : `/api/teacher/subjects/${subject.id}/attendance/${currentSessionId}`

      const response = await fetch(endpoint, {
        method: isCreating ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: sessionDate,
          time: sessionTime,
          isVisible,
          students: students.map((s) => ({ id: s.id, status: s.status })),
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Update current session ID for new sessions
        if (isCreating && data.session?.id) {
          setCurrentSessionId(data.session.id)
        }

        onSessionSave({
          id: data.session?.id || currentSessionId,
          date: sessionDate,
          time: sessionTime,
          isVisible,
          students,
        })
      } else {
        setError(data.error || "Failed to save session")
      }
    } catch (error) {
      console.error("Failed to save session:", error)
      setError("Failed to save session")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!subject?.id || !currentSessionId) return

    if (!confirm("Are you sure you want to delete this attendance session?")) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/teacher/subjects/${subject.id}/attendance/${currentSessionId}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (data.success) {
        onBack()
      } else {
        setError(data.error || "Failed to delete session")
      }
    } catch (error) {
      console.error("Failed to delete session:", error)
      setError("Failed to delete session")
    } finally {
      setIsSaving(false)
    }
  }

  const generateQrCode = async () => {
    // First save the session if it's new
    if (!currentSessionId) {
      await handleSave()
      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    if (!currentSessionId && !sessionId) {
      setError("Please save the session first before generating QR code")
      return
    }

    setIsGeneratingQr(true)
    setError(null)

    try {
      const response = await fetch("/api/attendance/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSessionId || sessionId,
          subjectId: subject.id,
          expiresInMinutes: qrExpiresInMinutes,
          lateAfterMinutes: lateAfterMinutes,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setQrUrl(data.qrUrl)
        setQrToken(data.qrToken)
        setQrExpiresAt(data.expiresAt)
        setShowQrModal(true)
        setAutoRefreshEnabled(true)
      } else {
        setError(data.error || "Failed to generate QR code")
      }
    } catch (error) {
      console.error("Failed to generate QR code:", error)
      setError("Failed to generate QR code")
    } finally {
      setIsGeneratingQr(false)
    }
  }

  const copyQrUrl = () => {
    if (qrUrl) {
      navigator.clipboard.writeText(qrUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatExpiryTime = (expiresAt: string | null) => {
    if (!expiresAt) return ""
    const expiry = new Date(expiresAt)
    return expiry.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  // Stats
  const presentCount = students.filter((s) => s.status === "present").length
  const absentCount = students.filter((s) => s.status === "absent").length
  const lateCount = students.filter((s) => s.status === "late").length
  const excusedCount = students.filter((s) => s.status === "excused").length

  // Filter students by search
  const filteredStudents = students.filter((s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 text-primary hover:text-primary/80">
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-bold text-white">Loading Session... </h1>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        </div>
    )
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 text-primary hover:text-primary/80">
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {isNewSession && !currentSessionId ? "New Attendance Session" : "Edit Attendance Session"}
              </h1>
              <p className="text-slate-400">{subject.name}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {currentSessionId && (
                <Button
                    onClick={handleDelete}
                    disabled={isSaving}
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                >
                  Delete Session
                </Button>
            )}
            <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
              {isSaving ? "Saving..." : "Save Session"}
            </Button>
          </div>
        </div>

        {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">{error}</div>
        )}

        {/* Session Settings */}
        <Card className="border border-slate-700/50 bg-slate-900">
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold text-white mb-4">Session Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Date *</label>
                <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Time</label>
                <input
                    type="time"
                    value={sessionTime}
                    onChange={(e) => setSessionTime(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Late After (minutes)</label>
                <input
                    type="number"
                    min="1"
                    max="120"
                    value={lateAfterMinutes}
                    onChange={(e) => setLateAfterMinutes(parseInt(e.target.value) || 15)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={(e) => setIsVisible(e.target.checked)}
                      className="w-4 h-4 rounded"
                  />
                  Visible to Students
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Section */}
        <Card className="border border-slate-700/50 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <QrCode className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">QR Code Attendance</h3>
                  <p className="text-sm text-slate-400">
                    Students can scan QR code to mark attendance instantly
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">QR Expires In</label>
                  <select
                      value={qrExpiresInMinutes}
                      onChange={(e) => setQrExpiresInMinutes(parseInt(e.target.value))}
                      className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={240}>4 hours</option>
                  </select>
                </div>
                <Button
                    onClick={generateQrCode}
                    disabled={isGeneratingQr}
                    className="bg-purple-600 hover:bg-purple-700 gap-2"
                >
                  {isGeneratingQr ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                      <QrCode className="w-4 h-4" />
                  )}
                  {qrUrl ? "Regenerate QR" : "Generate QR Code"}
                </Button>
              </div>
            </div>

            {/* Active QR Info */}
            {qrUrl && (
                <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">QR Code Active</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>Expires at:  {formatExpiryTime(qrExpiresAt)}</span>
                      <span>Late after: {lateAfterMinutes} min</span>
                      <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowQrModal(true)}
                          className="text-purple-400 border-purple-500/50"
                      >
                        Show QR
                      </Button>
                    </div>
                  </div>
                  {autoRefreshEnabled && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Auto-refreshing attendance every 5 seconds</span>
                      </div>
                  )}
                </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{students.length}</p>
                  <p className="text-xs text-slate-400">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{presentCount}</p>
                  <p className="text-xs text-slate-400">Present</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{lateCount}</p>
                  <p className="text-xs text-slate-400">Late</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{excusedCount}</p>
                  <p className="text-xs text-slate-400">Excused</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <X className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{absentCount}</p>
                  <p className="text-xs text-slate-400">Absent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Search */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={markAllPresent} variant="outline" className="text-green-400 border-green-500/50 hover:bg-green-500/20">
              Mark All Present
            </Button>
            <Button onClick={markAllAbsent} variant="outline" className="text-red-400 border-red-500/50 hover:bg-red-500/20">
              Mark All Absent
            </Button>
            {currentSessionId && (
                <Button
                    onClick={loadSessionData}
                    variant="outline"
                    className="text-blue-400 border-blue-500/50 hover:bg-blue-500/20 gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
            )}
          </div>
          <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus: outline-none focus:border-primary w-full md:w-64"
          />
        </div>

        {/* Students List */}
        {students.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-xl">
              <Users size={48} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400 font-medium mb-2">No students enrolled</p>
              <p className="text-slate-500 text-sm">Students need to be enrolled in this subject first</p>
            </div>
        ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => (
                  <div
                      key={student.id}
                      className={`p-4 bg-slate-900 border rounded-lg flex items-center justify-between gap-4 transition-colors ${
                          student.status === "present"
                              ? "border-green-500/30"
                              : student.status === "late"
                                  ? "border-yellow-500/30"
                                  : student.status === "excused"
                                      ? "border-blue-500/30"
                                      : "border-slate-700/50"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          student.status === "present"
                              ? "bg-green-500/20 text-green-400"
                              : student.status === "late"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : student.status === "excused"
                                      ? "bg-blue-500/20 text-blue-400"
                                      : "bg-primary/20 text-primary"
                      }`}>
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{student.name}</p>
                        {student.status !== "absent" && (
                            <p className={`text-xs ${
                                student.status === "present"
                                    ? "text-green-400"
                                    : student.status === "late"
                                        ? "text-yellow-400"
                                        : "text-blue-400"
                            }`}>
                              {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                            </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                          onClick={() => updateStatus(student.id, "present")}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              student.status === "present"
                                  ? "bg-green-600 text-white"
                                  : "bg-slate-800 text-slate-400 hover:bg-green-600/20 hover:text-green-400"
                          }`}
                      >
                        Present
                      </button>
                      <button
                          onClick={() => updateStatus(student.id, "late")}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              student.status === "late"
                                  ? "bg-yellow-600 text-white"
                                  : "bg-slate-800 text-slate-400 hover:bg-yellow-600/20 hover:text-yellow-400"
                          }`}
                      >
                        Late
                      </button>
                      <button
                          onClick={() => updateStatus(student.id, "excused")}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              student.status === "excused"
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-800 text-slate-400 hover:bg-blue-600/20 hover:text-blue-400"
                          }`}
                      >
                        Excused
                      </button>
                      <button
                          onClick={() => updateStatus(student.id, "absent")}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              student.status === "absent"
                                  ? "bg-red-600 text-white"
                                  : "bg-slate-800 text-slate-400 hover:bg-red-600/20 hover:text-red-400"
                          }`}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
              ))}
            </div>
        )}

        {filteredStudents.length === 0 && students.length > 0 && (
            <div className="text-center py-8 text-slate-400">
              No students found matching "{searchTerm}"
            </div>
        )}

        {/* QR Code Modal */}
        {showQrModal && qrUrl && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 rounded-t-2xl">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <QrCode size={24} />
                    Scan to Mark Attendance
                  </h3>
                  <p className="text-purple-100 text-sm mt-1">{subject.name}</p>
                </div>

                <div className="p-6 space-y-4">
                  {/* QR Code Display */}
                  <div className="bg-white p-6 rounded-xl flex items-center justify-center">
                    <QRCode value={qrUrl} size={250} level="H" />
                  </div>

                  {/* Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Expires at:</span>
                      <span className="text-white font-medium">{formatExpiryTime(qrExpiresAt)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Late after:</span>
                      <span className="text-yellow-400 font-medium">{lateAfterMinutes} minutes</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Present: </span>
                      <span className="text-green-400 font-medium">{presentCount}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Late:</span>
                      <span className="text-yellow-400 font-medium">{lateCount}</span>
                    </div>
                  </div>

                  {/* Auto-refresh toggle */}
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={autoRefreshEnabled}
                        onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                        className="w-4 h-4 rounded"
                    />
                    Auto-refresh attendance (every 5 seconds)
                  </label>

                  {/* Copy URL */}
                  <div className="flex gap-2">
                    <input
                        type="text"
                        value={qrUrl}
                        readOnly
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 text-sm"
                    />
                    <Button
                        onClick={copyQrUrl}
                        variant="outline"
                        className="gap-2"
                    >
                      {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button
                        onClick={() => setShowQrModal(false)}
                        variant="outline"
                        className="flex-1"
                    >
                      Close
                    </Button>
                    <Button
                        onClick={generateQrCode}
                        disabled={isGeneratingQr}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 gap-2"
                    >
                      {isGeneratingQr ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Regenerate
                    </Button>
                  </div>
                </div>
              </div>
            </div>
        )}
      </div>
  )
}