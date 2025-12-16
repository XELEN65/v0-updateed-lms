"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Bell, AlertCircle, RefreshCw, Loader2, Inbox, FileText, Users, Calendar, CheckCircle } from "lucide-react"

interface SubjectForRedirect {
  id: number
  name: string
  code: string
  sectionName: string
  gradeLevelName: string
  semesterName: string
  schoolYear: string
  studentCount: number
  color: string
}

interface InboxItem {
  id: string
  type: "submission" | "attendance" | "grades" | "enrollment" | "notification"
  message: string
  subjectId: number
  subjectName: string
  subjectCode: string
  sectionName: string
  gradeLevelName: string
  schoolYear: string
  semesterName: string
  color: string
  time: string
  priority: "high" | "medium" | "low"
  metadata?: any
}

interface InboxStats {
  pendingTasks: number
  newSubmissions: number
  unreviewed: number
}

interface InstructorInboxProps {
  teacherId?: number | null
  onItemClick?: (subject: SubjectForRedirect, type: "grades" | "attendance" | "members" | "content") => void
}

export default function InstructorInbox({ teacherId, onItemClick }: InstructorInboxProps) {
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([])
  const [stats, setStats] = useState<InboxStats>({ pendingTasks: 0, newSubmissions: 0, unreviewed: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<"all" | "submission" | "attendance" | "grades" | "enrollment">("all")

  const fetchInbox = useCallback(async () => {
    if (!teacherId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/teacher/inbox?teacherId=${teacherId}&limit=50`)
      const data = await response.json()

      if (data.success) {
        setInboxItems(data.items)
        setStats(data.stats)
      } else {
        setError(data.error || "Failed to fetch inbox")
      }
    } catch (err) {
      console.error("Failed to fetch inbox:", err)
      setError("Failed to connect to server")
    } finally {
      setIsLoading(false)
    }
  }, [teacherId])

  useEffect(() => {
    fetchInbox()
  }, [fetchInbox])

  const handleItemClick = (item: InboxItem) => {
    const subject: SubjectForRedirect = {
      id: item.subjectId,
      name: item.subjectName,
      code: item.subjectCode,
      sectionName: item.sectionName,
      gradeLevelName: item.gradeLevelName,
      semesterName: item.semesterName,
      schoolYear: item.schoolYear,
      studentCount: 0,
      color: item.color,
    }

    // Determine which tab to open based on item type
    let tabType: "grades" | "attendance" | "members" | "content" = "content"
    if (item.type === "submission" || item.type === "grades") {
      tabType = "grades"
    } else if (item.type === "attendance") {
      tabType = "attendance"
    } else if (item.type === "enrollment") {
      tabType = "members"
    }

    onItemClick?.(subject, tabType)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "submission":
        return <FileText className="w-5 h-5" />
      case "attendance":
        return <Calendar className="w-5 h-5" />
      case "grades":
        return <CheckCircle className="w-5 h-5" />
      case "enrollment":
        return <Users className="w-5 h-5" />
      default:
        return <Bell className="w-5 h-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "submission":
        return "text-blue-400 bg-blue-500/20"
      case "attendance":
        return "text-green-400 bg-green-500/20"
      case "grades":
        return "text-purple-400 bg-purple-500/20"
      case "enrollment":
        return "text-cyan-400 bg-cyan-500/20"
      default:
        return "text-slate-400 bg-slate-500/20"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-900/30 text-red-300"
      case "medium":
        return "bg-amber-900/30 text-amber-300"
      case "low":
        return "bg-green-900/30 text-green-300"
      default:
        return "bg-slate-900/30 text-slate-300"
    }
  }

  const filteredItems = filterType === "all"
      ? inboxItems
      : inboxItems.filter(item => item.type === filterType)

  // No teacher ID
  if (!teacherId) {
    return (
        <div className="space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Inbox</h1>
            <p className="text-slate-400">View your notifications and recent activities</p>
          </div>
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
            <p className="text-yellow-400">Unable to load inbox. Please log in again.</p>
          </div>
        </div>
    )
  }

  // Loading state
  if (isLoading && inboxItems.length === 0) {
    return (
        <div className="space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Inbox</h1>
            <p className="text-slate-400">View your notifications and recent activities</p>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <span className="ml-3 text-slate-400">Loading inbox...</span>
          </div>
        </div>
    )
  }

  // Error state
  if (error && inboxItems.length === 0) {
    return (
        <div className="space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Inbox</h1>
            <p className="text-slate-400">View your notifications and recent activities</p>
          </div>
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
            <p className="text-red-400">{error}</p>
            <button
                onClick={fetchInbox}
                className="ml-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
    )
  }

  return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Inbox</h1>
            <p className="text-slate-400">View your notifications and recent activities</p>
          </div>
          <button
              onClick={fetchInbox}
              disabled={isLoading}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Pending Tasks</p>
                  <p className="text-3xl font-bold text-blue-400 mt-1">{stats.pendingTasks}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">New Submissions (24h)</p>
                  <p className="text-3xl font-bold text-green-400 mt-1">{stats.newSubmissions}</p>
                </div>
                <Bell className="h-8 w-8 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Unreviewed (7 days)</p>
                  <p className="text-3xl font-bold text-amber-400 mt-1">{stats.unreviewed}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-amber-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "all", label: "All" },
            { value: "submission", label: "Submissions" },
            { value: "grades", label: "Grades" },
            { value: "attendance", label: "Attendance" },
            { value: "enrollment", label: "Enrollments" },
          ].map((tab) => (
              <button
                  key={tab.value}
                  onClick={() => setFilterType(tab.value as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterType === tab.value
                          ? "bg-blue-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                  }`}
              >
                {tab.label}
              </button>
          ))}
        </div>

        {/* Activities List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Recent Activities</h2>
            <span className="text-sm text-slate-400">
            {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
          </span>
          </div>

          {filteredItems.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-xl">
                <Inbox size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400 font-medium mb-2">No activities found</p>
                <p className="text-slate-500 text-sm">
                  {filterType !== "all"
                      ? "Try selecting a different filter"
                      : "Your recent activities will appear here"}
                </p>
              </div>
          ) : (
              filteredItems.map((item) => (
                  <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="w-full text-left p-4 bg-slate-900 border border-slate-700/50 hover:border-blue-500/50 rounded-xl transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Type Icon */}
                      <div className={`p-2 rounded-lg ${getTypeColor(item.type)}`}>
                        {getTypeIcon(item.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white mb-1">{item.message}</h3>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                        <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded">
                          {item.subjectName}
                        </span>
                              <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded">
                          {item.gradeLevelName} - {item.sectionName}
                        </span>
                              <span>{item.time}</span>
                            </div>
                          </div>

                          {/* Priority Badge */}
                          <span
                              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getPriorityColor(item.priority)}`}
                          >
                      {item.priority}
                    </span>
                        </div>
                      </div>
                    </div>
                  </button>
              ))
          )}
        </div>
      </div>
  )
}