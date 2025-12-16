"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Check, X, Clock, Loader2, Users } from "lucide-react"

interface Member {
  id: number
  name: string
  email?: string
  studentNumber?: string
}

interface SessionStudioProps {
  subject: any
  isNewSession?: boolean
  sessionId?: number
  members?: Member[]
  onBack: () => void
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
      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute:  "2-digit", hour12: false })
  )
  const [isVisible, setIsVisible] = useState(true)
  const [students, setStudents] = useState<StudentAttendance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

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
      loadSessionData()
    }
  }, [isNewSession, sessionId, subject?.id])

  const loadSessionData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/teacher/subjects/${subject.id}/attendance/${sessionId}`)
      const data = await response.json()

      if (data.success) {
        setSessionDate(data.session.date)
        setSessionTime(data.session.time || "")
        setIsVisible(data.session.visible)

        // Merge attendance records with members
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
      setError("Failed to load session data")
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
      const endpoint = isNewSession
          ? `/api/teacher/subjects/${subject.id}/attendance`
          : `/api/teacher/subjects/${subject.id}/attendance/${sessionId}`

      const response = await fetch(endpoint, {
        method: isNewSession ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON. stringify({
          date: sessionDate,
          time: sessionTime,
          isVisible,
          students: students.map((s) => ({ id: s.id, status: s.status })),
        }),
      })

      const data = await response.json()

      if (data.success) {
        onSessionSave({
          id: data.session?.id || sessionId,
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
    if (!subject?. id || !sessionId || isNewSession) return

    if (!confirm("Are you sure you want to delete this attendance session?")) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/teacher/subjects/${subject.id}/attendance/${sessionId}`, {
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
                {isNewSession ? "New Attendance Session" : "Edit Attendance Session"}
              </h1>
              <p className="text-slate-400">{subject.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isNewSession && (
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </div>

        {/* Quick Actions & Search */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2">
            <Button onClick={markAllPresent} variant="outline" className="text-green-400 border-green-500/50 hover:bg-green-500/20">
              Mark All Present
            </Button>
            <Button onClick={markAllAbsent} variant="outline" className="text-red-400 border-red-500/50 hover:bg-red-500/20">
              Mark All Absent
            </Button>
          </div>
          <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary w-full md:w-64"
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
                      className="p-4 bg-slate-900 border border-slate-700/50 rounded-lg flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {student.name.charAt(0)}
                      </div>
                      <p className="font-medium text-white">{student.name}</p>
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
      </div>
  )
}