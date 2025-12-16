"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Plus, Folder, FileText, Users, RefreshCw, Loader2 } from "lucide-react"
import SessionStudio from "./session-studio-page"
import GradingStudio from "./grading-studio-page"

interface InstructorSubjectDetailProps {
  subject: any
  initialTab?: "content" | "attendance" | "grades" | "members"
  onBack: () => void
}

interface ContentItem {
  id: number
  type: "folder" | "submission"
  name: string
  description?: string
  folderId?: number
  isVisible?: boolean
  dueDate?: string
  dueTime?: string
  maxAttempts?: number
  files?: SubmissionFile[]
}

interface SubmissionFile {
  id: number
  name: string
  type: string
  url: string
}

interface FolderData {
  id: number
  name: string
  submissions: ContentItem[]
}

interface AttendanceSession {
  id: number
  date: string
  time: string
  participants: number
  present: number
  absent: number
  late?: number
  visible: boolean
}

interface Member {
  id: number
  name: string
  email: string
  studentNumber?: string
  status?: string
}

export default function InstructorSubjectDetail({
                                                  subject,
                                                  initialTab = "content",
                                                  onBack,
                                                }: InstructorSubjectDetailProps) {
  const [activeTab, setActiveTab] = useState<"content" | "attendance" | "grades" | "members">(initialTab)
  const [showSessionStudio, setShowSessionStudio] = useState(false)
  const [showGradingStudio, setShowGradingStudio] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string>("")
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null)

  // Data states
  const [folders, setFolders] = useState<{ [key: string]: FolderData }>({})
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([])
  const [members, setMembers] = useState<Member[]>([])

  // Loading states
  const [isLoadingFolders, setIsLoadingFolders] = useState(true)
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true)
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // UI states
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showCreateSubmission, setShowCreateSubmission] = useState(false)
  const [showEditSubmission, setShowEditSubmission] = useState(false)
  const [editingSubmissionId, setEditingSubmissionId] = useState<number | null>(null)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState("")
  const [newFolderName, setNewFolderName] = useState("")

  // Context menus
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    submissionId: number
    folderId: string
  } | null>(null)
  const [folderContextMenu, setFolderContextMenu] = useState<{
    x: number
    y: number
    folderId: string
  } | null>(null)

  // Form data for submissions
  const [newSubmissionData, setNewSubmissionData] = useState({
    name: "",
    description: "",
    folderId: null as string | null,
    isVisible: true,
    dueDate: "",
    dueTime: "",
    maxAttempts: 1,
    files: [] as SubmissionFile[],
  })

  // Fetch folders and content
  const fetchFolders = useCallback(async () => {
    if (!subject?.id) return

    try {
      setIsLoadingFolders(true)
      const response = await fetch(`/api/teacher/subjects/${subject.id}/folders`)
      const data = await response.json()

      if (data.success) {
        const foldersMap: { [key: string]: FolderData } = {}
        data.folders.forEach((folder: any) => {
          foldersMap[`folder-${folder.id}`] = {
            id: folder.id,
            name: folder.name,
            submissions: folder.submissions.map((s: any) => ({
              id: s.id,
              type: "submission",
              name: s.name,
              description: s.description,
              folderId: folder.id,
              isVisible: s.is_visible === 1,
              dueDate: s.due_date,
              dueTime: s.due_time,
              maxAttempts: s.max_attempts,
              files: s.files || [],
            })),
          }
        })
        setFolders(foldersMap)

        // Expand first folder by default
        if (data.folders.length > 0) {
          setExpandedFolders(new Set([`folder-${data.folders[0].id}`]))
        }
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error)
    } finally {
      setIsLoadingFolders(false)
    }
  }, [subject?.id])

  // Fetch attendance sessions
  const fetchAttendance = useCallback(async () => {
    if (!subject?.id) return

    try {
      setIsLoadingAttendance(true)
      const response = await fetch(`/api/teacher/subjects/${subject.id}/attendance`)
      const data = await response.json()

      if (data.success) {
        setAttendanceSessions(data.sessions)
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error)
    } finally {
      setIsLoadingAttendance(false)
    }
  }, [subject?.id])

  // Fetch members
  const fetchMembers = useCallback(async () => {
    if (!subject?.id) return

    try {
      setIsLoadingMembers(true)
      const response = await fetch(`/api/teacher/subjects/${subject.id}/members`)
      const data = await response.json()

      if (data.success) {
        setMembers(data.members)
      }
    } catch (error) {
      console.error("Failed to fetch members:", error)
    } finally {
      setIsLoadingMembers(false)
    }
  }, [subject?.id])

  // Initial data load
  useEffect(() => {
    fetchFolders()
    fetchAttendance()
    fetchMembers()
  }, [fetchFolders, fetchAttendance, fetchMembers])

  // Close context menus on click outside
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null)
      setFolderContextMenu(null)
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !subject?.id) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/teacher/subjects/${subject.id}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      })
      const data = await response.json()

      if (data.success) {
        setFolders({
          ...folders,
          [`folder-${data.folder.id}`]: {
            id: data.folder.id,
            name: data.folder.name,
            submissions: [],
          },
        })
        setNewFolderName("")
        setShowCreateFolder(false)
      }
    } catch (error) {
      console.error("Failed to create folder:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update folder
  const handleSaveEditedFolder = async (folderId: string) => {
    if (!editingFolderName.trim() || !subject?.id) return

    const folderData = folders[folderId]
    if (!folderData) return

    setIsSubmitting(true)
    try {
      const response = await fetch(
          `/api/teacher/subjects/${subject.id}/folders/${folderData.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: editingFolderName.trim() }),
          }
      )
      const data = await response.json()

      if (data.success) {
        setFolders({
          ...folders,
          [folderId]: {
            ...folderData,
            name: editingFolderName.trim(),
          },
        })
        setEditingFolderId(null)
        setEditingFolderName("")
      }
    } catch (error) {
      console.error("Failed to update folder:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete folder
  const handleDeleteFolder = async (folderId: string) => {
    const folderData = folders[folderId]
    if (!folderData || !subject?.id) return

    setIsSubmitting(true)
    try {
      const response = await fetch(
          `/api/teacher/subjects/${subject.id}/folders/${folderData.id}`,
          { method: "DELETE" }
      )
      const data = await response.json()

      if (data.success) {
        const newFolders = { ...folders }
        delete newFolders[folderId]
        setFolders(newFolders)
      }
    } catch (error) {
      console.error("Failed to delete folder:", error)
    } finally {
      setIsSubmitting(false)
      setFolderContextMenu(null)
    }
  }

  // Create submission
  const handleCreateSubmission = async () => {
    if (!newSubmissionData.name.trim() || !newSubmissionData.folderId || !subject?.id) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/teacher/subjects/${subject.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: folders[newSubmissionData.folderId]?.id,
          name: newSubmissionData.name.trim(),
          description: newSubmissionData.description,
          dueDate: newSubmissionData.dueDate || null,
          dueTime: newSubmissionData.dueTime || null,
          maxAttempts: newSubmissionData.maxAttempts,
          isVisible: newSubmissionData.isVisible,
          files: newSubmissionData.files,
        }),
      })
      const data = await response.json()

      if (data.success) {
        // Add to local state
        const folderId = newSubmissionData.folderId
        setFolders({
          ...folders,
          [folderId]: {
            ...folders[folderId],
            submissions: [
              ...folders[folderId].submissions,
              {
                id: data.submission.id,
                type: "submission",
                name: data.submission.name,
                description: data.submission.description,
                folderId: folders[folderId].id,
                isVisible: data.submission.isVisible,
                dueDate: data.submission.dueDate,
                dueTime: data.submission.dueTime,
                maxAttempts: data.submission.maxAttempts,
                files: data.submission.files,
              },
            ],
          },
        })

        // Reset form
        setNewSubmissionData({
          name: "",
          description: "",
          folderId: null,
          isVisible: true,
          dueDate: "",
          dueTime: "",
          maxAttempts: 1,
          files: [],
        })
        setShowCreateSubmission(false)
      }
    } catch (error) {
      console.error("Failed to create submission:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Edit submission
  const handleEditSubmission = async () => {
    if (!editingSubmissionId || !editingFolderId || !subject?.id) return

    setIsSubmitting(true)
    try {
      const response = await fetch(
          `/api/teacher/subjects/${subject.id}/submissions/${editingSubmissionId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: newSubmissionData.name.trim(),
              description: newSubmissionData.description,
              dueDate: newSubmissionData.dueDate || null,
              dueTime: newSubmissionData.dueTime || null,
              maxAttempts: newSubmissionData.maxAttempts,
              isVisible: newSubmissionData.isVisible,
              files: newSubmissionData.files,
            }),
          }
      )
      const data = await response.json()

      if (data.success) {
        setFolders({
          ...folders,
          [editingFolderId]: {
            ...folders[editingFolderId],
            submissions: folders[editingFolderId].submissions.map((s) =>
                s.id === editingSubmissionId
                    ? {
                      ...s,
                      name: newSubmissionData.name,
                      description: newSubmissionData.description,
                      isVisible: newSubmissionData.isVisible,
                      dueDate: newSubmissionData.dueDate,
                      dueTime: newSubmissionData.dueTime,
                      maxAttempts: newSubmissionData.maxAttempts,
                      files: newSubmissionData.files,
                    }
                    : s
            ),
          },
        })

        setShowEditSubmission(false)
        setEditingSubmissionId(null)
        setEditingFolderId(null)
        setNewSubmissionData({
          name: "",
          description: "",
          folderId: null,
          isVisible: true,
          dueDate: "",
          dueTime: "",
          maxAttempts: 1,
          files: [],
        })
      }
    } catch (error) {
      console.error("Failed to update submission:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete submission
  const handleDeleteSubmission = async (folderId: string, submissionId: number) => {
    if (!subject?.id) return

    setIsSubmitting(true)
    try {
      const response = await fetch(
          `/api/teacher/subjects/${subject.id}/submissions/${submissionId}`,
          { method: "DELETE" }
      )
      const data = await response.json()

      if (data.success) {
        setFolders({
          ...folders,
          [folderId]: {
            ...folders[folderId],
            submissions: folders[folderId].submissions.filter((s) => s.id !== submissionId),
          },
        })
      }
    } catch (error) {
      console.error("Failed to delete submission:", error)
    } finally {
      setIsSubmitting(false)
      setContextMenu(null)
    }
  }

  const openEditSubmission = (folderId: string, submission: ContentItem) => {
    setEditingSubmissionId(submission.id)
    setEditingFolderId(folderId)
    setNewSubmissionData({
      name: submission.name || "",
      description: submission.description || "",
      folderId: folderId,
      isVisible: submission.isVisible ?? true,
      dueDate: submission.dueDate || "",
      dueTime: submission.dueTime || "",
      maxAttempts: submission.maxAttempts || 1,
      files: submission.files || [],
    })
    setShowEditSubmission(true)
    setContextMenu(null)
  }

  const handleContextMenu = (e: React.MouseEvent, submissionId: number, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, submissionId, folderId })
  }

  const handleFolderContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setFolderContextMenu({ x: e.clientX, y: e.clientY, folderId })
  }

  const handleEditFolder = (folderId: string) => {
    setEditingFolderId(folderId)
    setEditingFolderName(folders[folderId].name)
    setFolderContextMenu(null)
  }

  const handleSessionSave = (sessionData: any) => {
    const newSession: AttendanceSession = {
      id: sessionData.id || Date.now(),
      date: sessionData.date,
      time: sessionData.time,
      participants: sessionData.students?.length || 0,
      present: sessionData.students?.filter((s: any) => s.status === "present").length || 0,
      absent: sessionData.students?.filter((s: any) => s.status === "absent").length || 0,
      visible: sessionData.isVisible,
    }

    if (editingSessionId) {
      setAttendanceSessions(
          attendanceSessions.map((s) => (s.id === editingSessionId ? newSession : s))
      )
    } else {
      setAttendanceSessions([newSession, ...attendanceSessions])
    }

    setShowSessionStudio(false)
    setEditingSessionId(null)
  }

  // Get all submissions flat for grades tab
  const allSubmissions = Object.values(folders).flatMap((f) => f.submissions)

  // Loading spinner component
  const LoadingSpinner = () => (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
  )

  return (
      <div className="space-y-6 p-6">
        {showSessionStudio ? (
            <SessionStudio
                subject={subject}
                isNewSession={editingSessionId === null}
                sessionId={editingSessionId || undefined}
                members={members}
                onBack={() => {
                  setShowSessionStudio(false)
                  setEditingSessionId(null)
                }}
                onSessionSave={handleSessionSave}
            />
        ) : showGradingStudio ? (
            <GradingStudio
                subject={subject}
                taskId={selectedTaskId}
                taskTitle={selectedTaskTitle}
                onBack={() => setShowGradingStudio(false)}
            />
        ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to Subjects</span>
                </button>
              </div>

              {/* Subject Banner */}
              <div className={`bg-gradient-to-r ${subject.color || "from-blue-500 to-blue-600"} rounded-xl p-8 text-white shadow-lg`}>
                <h1 className="text-4xl font-bold mb-2">{subject.name}</h1>
                <p className="text-white/90 mb-4">{subject.code}</p>
                <div className="flex gap-6 text-sm flex-wrap">
                  <div>
                    <p className="text-white/70">Section</p>
                    <p className="font-semibold">{subject.sectionName || subject.section}</p>
                  </div>
                  <div>
                    <p className="text-white/70">Grade Level</p>
                    <p className="font-semibold">{subject.gradeLevelName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-white/70">Total Students</p>
                    <p className="font-semibold">{subject.studentCount || members.length}</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-slate-700/50">
                {["content", "attendance", "grades", "members"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-3 font-medium border-b-2 transition-colors capitalize ${
                            activeTab === tab
                                ? "border-primary text-primary"
                                : "border-transparent text-slate-400 hover:text-slate-300"
                        }`}
                    >
                      {tab}
                    </button>
                ))}
              </div>

              {/* Content Tab */}
              {activeTab === "content" && (
                  <div className="space-y-4">
                    <div className="flex gap-2 flex-wrap items-center">
                      <Button onClick={() => setShowCreateFolder(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Folder
                      </Button>
                      <Button
                          onClick={() => setShowCreateSubmission(true)}
                          className="gap-2"
                          disabled={Object.keys(folders).length === 0}
                      >
                        <Plus className="h-4 w-4" />
                        Create Submission
                      </Button>
                      <button
                          onClick={fetchFolders}
                          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors ml-auto"
                          title="Refresh"
                      >
                        <RefreshCw className={`w-5 h-5 ${isLoadingFolders ? "animate-spin" : ""}`} />
                      </button>
                    </div>

                    {isLoadingFolders ? (
                        <LoadingSpinner />
                    ) : Object.keys(folders).length === 0 ? (
                        <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-xl">
                          <Folder size={48} className="mx-auto text-slate-600 mb-4" />
                          <p className="text-slate-400 font-medium mb-2">No folders yet</p>
                          <p className="text-slate-500 text-sm">Create a folder to organize your content</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                          {Object.entries(folders).map(([folderId, folder]) => (
                              <div
                                  key={folderId}
                                  className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden"
                              >
                                {/* Folder Header */}
                                {editingFolderId === folderId ? (
                                    <div className="px-6 py-4 bg-slate-800 flex items-center gap-3 border-b border-slate-700/50">
                                      <input
                                          type="text"
                                          value={editingFolderName}
                                          onChange={(e) => setEditingFolderName(e.target.value)}
                                          className="flex-1 bg-slate-900 text-white px-3 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                                          placeholder="Folder name"
                                          autoFocus
                                      />
                                      <button
                                          onClick={() => handleSaveEditedFolder(folderId)}
                                          disabled={isSubmitting}
                                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                      >
                                        {isSubmitting ? "Saving..." : "Save"}
                                      </button>
                                      <button
                                          onClick={() => setEditingFolderId(null)}
                                          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                ) : (
                                    <button
                                        onContextMenu={(e) => handleFolderContextMenu(e, folderId)}
                                        onClick={() => toggleFolder(folderId)}
                                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800 transition-colors group"
                                    >
                                      <div className="flex items-center gap-3 flex-1">
                                        <Folder size={20} className="text-blue-400" />
                                        <span className="font-semibold text-white">{folder.name}</span>
                                        <span className="text-sm text-slate-400">({folder.submissions.length})</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                            <span
                                className={`transition-transform ${expandedFolders.has(folderId) ? "rotate-180" : ""}`}
                            >
                              ▼
                            </span>
                                      </div>
                                    </button>
                                )}

                                {/* Folder Contents */}
                                {expandedFolders.has(folderId) && (
                                    <div className="border-t border-slate-700/50 space-y-2 p-4">
                                      {folder.submissions.length === 0 ? (
                                          <p className="text-slate-500 text-sm text-center py-4">No submissions in this folder</p>
                                      ) : (
                                          folder.submissions.map((submission) => (
                                              <div
                                                  key={submission.id}
                                                  onContextMenu={(e) => handleContextMenu(e, submission.id, folderId)}
                                                  className="p-4 bg-slate-900 hover:bg-slate-900/80 border border-slate-700/50 hover:border-blue-500/50 rounded-lg text-left transition-all group cursor-pointer"
                                              >
                                                <div className="flex items-start justify-between gap-3">
                                                  <div className="flex items-start gap-3 flex-1">
                                                    <FileText size={16} className="text-slate-400 mt-1 flex-shrink-0" />
                                                    <div className="flex-1">
                                                      <h4 className="font-semibold text-white">{submission.name}</h4>
                                                      {submission.description && (
                                                          <p className="text-sm text-slate-400 mt-1">{submission.description}</p>
                                                      )}
                                                      <div className="flex gap-4 text-xs text-slate-500 mt-2">
                                                        {submission.dueDate && <span>Due: {submission.dueDate}</span>}
                                                        {submission.maxAttempts && (
                                                            <span>Max Attempts: {submission.maxAttempts}</span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                    <span
                                        className={`px-2 py-1 rounded text-xs ${
                                            submission.isVisible
                                                ? "bg-green-900/30 text-green-300"
                                                : "bg-red-900/30 text-red-300"
                                        }`}
                                    >
                                      {submission.isVisible ? "Visible" : "Hidden"}
                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                          ))
                                      )}
                                    </div>
                                )}
                              </div>
                          ))}
                        </div>
                    )}
                  </div>
              )}

              {/* Attendance Tab */}
              {activeTab === "attendance" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Button
                          onClick={() => {
                            setEditingSessionId(null)
                            setShowSessionStudio(true)
                          }}
                          className="gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="h-4 w-4" />
                        Start Attendance Session
                      </Button>
                      <button
                          onClick={fetchAttendance}
                          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors ml-auto"
                          title="Refresh"
                      >
                        <RefreshCw className={`w-5 h-5 ${isLoadingAttendance ? "animate-spin" : ""}`} />
                      </button>
                    </div>

                    {isLoadingAttendance ? (
                        <LoadingSpinner />
                    ) : attendanceSessions.length === 0 ? (
                        <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-xl">
                          <Users size={48} className="mx-auto text-slate-600 mb-4" />
                          <p className="text-slate-400 font-medium mb-2">No attendance sessions yet</p>
                          <p className="text-slate-500 text-sm">Start a session to track student attendance</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                          <h2 className="text-xl font-bold text-white">Attendance Sessions</h2>
                          {attendanceSessions.map((session) => (
                              <button
                                  key={session.id}
                                  onClick={() => {
                                    setEditingSessionId(session.id)
                                    setShowSessionStudio(true)
                                  }}
                                  className="w-full text-left p-4 bg-slate-900 border border-slate-700/50 hover:border-blue-500/50 rounded-xl transition-all"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <h3 className="font-bold text-white">{session.date}</h3>
                                    <p className="text-sm text-slate-400 mt-1">{session.time || "No time set"}</p>
                                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                                      <span>Total: {session.participants}</span>
                                      <span className="text-green-400">Present: {session.present}</span>
                                      <span className="text-red-400">Absent: {session.absent}</span>
                                      {session.late !== undefined && session.late > 0 && (
                                          <span className="text-yellow-400">Late: {session.late}</span>
                                      )}
                                    </div>
                                  </div>
                                  <span
                                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                                          session.visible
                                              ? "bg-green-900/30 text-green-300"
                                              : "bg-amber-900/30 text-amber-300"
                                      }`}
                                  >
                          {session.visible ? "Visible" : "Hidden"}
                        </span>
                                </div>
                              </button>
                          ))}
                        </div>
                    )}
                  </div>
              )}

              {/* Grades Tab */}
              {activeTab === "grades" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">Submissions for Grading</h2>
                      <button
                          onClick={fetchFolders}
                          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors ml-auto"
                          title="Refresh"
                      >
                        <RefreshCw className={`w-5 h-5 ${isLoadingFolders ? "animate-spin" : ""}`} />
                      </button>
                    </div>

                    {isLoadingFolders ? (
                        <LoadingSpinner />
                    ) : allSubmissions.length === 0 ? (
                        <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-xl">
                          <FileText size={48} className="mx-auto text-slate-600 mb-4" />
                          <p className="text-slate-400 font-medium mb-2">No submissions yet</p>
                          <p className="text-slate-500 text-sm">Create submissions in the Content tab to grade them here</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                          {allSubmissions.map((submission) => (
                              <button
                                  key={submission.id}
                                  onClick={() => {
                                    setSelectedTaskId(submission.id)
                                    setSelectedTaskTitle(submission.name)
                                    setShowGradingStudio(true)
                                  }}
                                  className="w-full text-left p-4 bg-slate-900 border border-slate-700/50 hover:border-blue-500/50 rounded-xl transition-all"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <h3 className="font-bold text-white">{submission.name}</h3>
                                    {submission.description && (
                                        <p className="text-sm text-slate-400 mt-1">{submission.description}</p>
                                    )}
                                    <div className="flex gap-4 text-xs text-slate-500 mt-2">
                                      {submission.dueDate && <span>Due: {submission.dueDate}</span>}
                                      {submission.maxAttempts && <span>Max Attempts: {submission.maxAttempts}</span>}
                                    </div>
                                  </div>
                                  <span
                                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                                          submission.isVisible
                                              ? "bg-green-900/30 text-green-300"
                                              : "bg-red-900/30 text-red-300"
                                      }`}
                                  >
                          {submission.isVisible ? "Visible" : "Hidden"}
                        </span>
                                </div>
                              </button>
                          ))}
                        </div>
                    )}
                  </div>
              )}

              {/* Members Tab */}
              {activeTab === "members" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Class Members
                      </h2>
                      <button
                          onClick={fetchMembers}
                          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors ml-auto"
                          title="Refresh"
                      >
                        <RefreshCw className={`w-5 h-5 ${isLoadingMembers ? "animate-spin" : ""}`} />
                      </button>
                    </div>

                    {/* Stats Card */}
                    <Card className="border border-slate-700/50 bg-slate-900">
                      <CardContent className="pt-6">
                        <div>
                          <p className="text-sm text-slate-400">Total Members</p>
                          <p className="text-3xl font-bold text-blue-400 mt-1">{members.length}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {isLoadingMembers ? (
                        <LoadingSpinner />
                    ) : members.length === 0 ? (
                        <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-xl">
                          <Users size={48} className="mx-auto text-slate-600 mb-4" />
                          <p className="text-slate-400 font-medium mb-2">No students enrolled</p>
                          <p className="text-slate-500 text-sm">Students will appear here once they are enrolled in this subject</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                          {members.map((member) => (
                              <div
                                  key={member.id}
                                  className="p-4 bg-slate-900 border border-slate-700/50 rounded-lg flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                    {member.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-white">{member.name}</p>
                                    <p className="text-xs text-slate-400">{member.email}</p>
                                  </div>
                                </div>
                                {member.studentNumber && (
                                    <span className="text-sm text-slate-400">{member.studentNumber}</span>
                                )}
                              </div>
                          ))}
                        </div>
                    )}
                  </div>
              )}

              {/* Create Folder Modal */}
              {showCreateFolder && (
                  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md border border-slate-700/50 bg-slate-900">
                      <CardContent className="pt-6 space-y-4">
                        <h2 className="text-xl font-bold text-white">Create Folder</h2>
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="Folder name"
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                              onClick={() => {
                                setShowCreateFolder(false)
                                setNewFolderName("")
                              }}
                              variant="outline"
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleCreateFolder} disabled={isSubmitting} className="bg-primary">
                            {isSubmitting ? "Creating..." : "Create Folder"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
              )}

              {/* Create Submission Modal */}
              {showCreateSubmission && (
                  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-2xl border border-slate-700/50 bg-slate-900 max-h-[90vh] overflow-y-auto">
                      <CardContent className="pt-6 space-y-4">
                        <h2 className="text-xl font-bold text-white">Create Submission</h2>

                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Title *</label>
                          <input
                              type="text"
                              value={newSubmissionData.name}
                              onChange={(e) => setNewSubmissionData({ ...newSubmissionData, name: e.target.value })}
                              placeholder="Submission title"
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Description</label>
                          <textarea
                              value={newSubmissionData.description}
                              onChange={(e) => setNewSubmissionData({ ...newSubmissionData, description: e.target.value })}
                              placeholder="Submission description"
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary resize-none"
                              rows={3}
                          />
                        </div>

                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Folder *</label>
                          <select
                              value={newSubmissionData.folderId || ""}
                              onChange={(e) => setNewSubmissionData({ ...newSubmissionData, folderId: e.target.value || null })}
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
                          >
                            <option value="">Select a folder</option>
                            {Object.entries(folders).map(([id, folder]) => (
                                <option key={id} value={id}>
                                  {folder.name}
                                </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-slate-400 mb-2 block">Due Date</label>
                            <input
                                type="date"
                                value={newSubmissionData.dueDate}
                                onChange={(e) => setNewSubmissionData({ ...newSubmissionData, dueDate: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-slate-400 mb-2 block">Due Time</label>
                            <input
                                type="time"
                                value={newSubmissionData.dueTime}
                                onChange={(e) => setNewSubmissionData({ ...newSubmissionData, dueTime: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Maximum Submission Attempts</label>
                          <input
                              type="number"
                              value={newSubmissionData.maxAttempts}
                              onChange={(e) =>
                                  setNewSubmissionData({
                                    ...newSubmissionData,
                                    maxAttempts: parseInt(e.target.value) || 1,
                                  })
                              }
                              min="1"
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
                          />
                        </div>

                        <label className="flex items-center gap-2 text-white">
                          <input
                              type="checkbox"
                              checked={newSubmissionData.isVisible}
                              onChange={(e) => setNewSubmissionData({ ...newSubmissionData, isVisible: e.target.checked })}
                              className="w-4 h-4"
                          />
                          Visible to Students
                        </label>

                        <div className="flex gap-2 justify-end">
                          <Button
                              onClick={() => {
                                setShowCreateSubmission(false)
                                setNewSubmissionData({
                                  name: "",
                                  description: "",
                                  folderId: null,
                                  isVisible: true,
                                  dueDate: "",
                                  dueTime: "",
                                  maxAttempts: 1,
                                  files: [],
                                })
                              }}
                              variant="outline"
                          >
                            Cancel
                          </Button>
                          <Button
                              onClick={handleCreateSubmission}
                              disabled={isSubmitting || !newSubmissionData.name.trim() || !newSubmissionData.folderId}
                              className="bg-primary"
                          >
                            {isSubmitting ? "Creating..." : "Create Submission"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
              )}

              {/* Edit Submission Modal */}
              {showEditSubmission && (
                  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-2xl border border-slate-700/50 bg-slate-900 max-h-[90vh] overflow-y-auto">
                      <CardContent className="pt-6 space-y-4">
                        <h2 className="text-xl font-bold text-white">Edit Submission</h2>

                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Title *</label>
                          <input
                              type="text"
                              value={newSubmissionData.name}
                              onChange={(e) => setNewSubmissionData({ ...newSubmissionData, name: e.target.value })}
                              placeholder="Submission title"
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Description</label>
                          <textarea
                              value={newSubmissionData.description}
                              onChange={(e) => setNewSubmissionData({ ...newSubmissionData, description: e.target.value })}
                              placeholder="Submission description"
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary resize-none"
                              rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-slate-400 mb-2 block">Due Date</label>
                            <input
                                type="date"
                                value={newSubmissionData.dueDate}
                                onChange={(e) => setNewSubmissionData({ ...newSubmissionData, dueDate: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-slate-400 mb-2 block">Due Time</label>
                            <input
                                type="time"
                                value={newSubmissionData.dueTime}
                                onChange={(e) => setNewSubmissionData({ ...newSubmissionData, dueTime: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Maximum Submission Attempts</label>
                          <input
                              type="number"
                              value={newSubmissionData.maxAttempts}
                              onChange={(e) =>
                                  setNewSubmissionData({
                                    ...newSubmissionData,
                                    maxAttempts: parseInt(e.target.value) || 1,
                                  })
                              }
                              min="1"
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
                          />
                        </div>

                        <label className="flex items-center gap-2 text-white">
                          <input
                              type="checkbox"
                              checked={newSubmissionData.isVisible}
                              onChange={(e) => setNewSubmissionData({ ...newSubmissionData, isVisible: e.target.checked })}
                              className="w-4 h-4"
                          />
                          Visible to Students
                        </label>

                        <div className="flex gap-2 justify-end">
                          <Button
                              onClick={() => {
                                setShowEditSubmission(false)
                                setEditingSubmissionId(null)
                                setEditingFolderId(null)
                                setNewSubmissionData({
                                  name: "",
                                  description: "",
                                  folderId: null,
                                  isVisible: true,
                                  dueDate: "",
                                  dueTime: "",
                                  maxAttempts: 1,
                                  files: [],
                                })
                              }}
                              variant="outline"
                          >
                            Cancel
                          </Button>
                          <Button
                              onClick={handleEditSubmission}
                              disabled={isSubmitting || !newSubmissionData.name.trim()}
                              className="bg-primary"
                          >
                            {isSubmitting ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
              )}

              {/* Context Menu for Submissions */}
              {contextMenu && (
                  <div
                      className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1"
                      style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
                      onClick={(e) => e.stopPropagation()}
                  >
                    <button
                        onClick={() => {
                          const submission = folders[contextMenu.folderId]?.submissions.find(
                              (s) => s.id === contextMenu.submissionId
                          )
                          if (submission) openEditSubmission(contextMenu.folderId, submission)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-700 text-white text-sm"
                    >
                      Edit
                    </button>
                    <button
                        onClick={() => handleDeleteSubmission(contextMenu.folderId, contextMenu.submissionId)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-700 text-red-400 text-sm"
                    >
                      Delete
                    </button>
                  </div>
              )}

              {/* Context Menu for Folders */}
              {folderContextMenu && (
                  <div
                      className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1"
                      style={{ top: `${folderContextMenu.y}px`, left: `${folderContextMenu.x}px` }}
                      onClick={(e) => e.stopPropagation()}
                  >
                    <button
                        onClick={() => handleEditFolder(folderContextMenu.folderId)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-700 text-white text-sm"
                    >
                      Edit
                    </button>
                    <button
                        onClick={() => handleDeleteFolder(folderContextMenu.folderId)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-700 text-red-400 text-sm"
                    >
                      Delete
                    </button>
                  </div>
              )}
            </>
        )}
      </div>
  )
}