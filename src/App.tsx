import React,{
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  getProjects,
  saveProject,
  deleteProject,

  getNotesByProject,
  saveNote,
  deleteNote,
  exportData,
  importData,

  type Project,
  type Note,
} from "./db"

import {
  encryptString,
  decryptString,
} from "./crypto"

import CodeMirror from "@uiw/react-codemirror"

import {
  markdown,
} from "@codemirror/lang-markdown"

import {
  EditorView,
  keymap,
} from "@codemirror/view"

import {
  syntaxHighlighting,
  HighlightStyle,
} from "@codemirror/language"

import {
  tags,
} from "@lezer/highlight"

import "./App.css"

type IconName =
  | "archive"
  | "cloudDownload"
  | "download"
  | "filePlus"
  | "folder"
  | "key"
  | "menu"
  | "plus"
  | "save"
  | "search"
  | "shield"
  | "trash"
  | "upload"

const iconPaths: Record<IconName, string> = {
  archive:
    "M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8m18 0H3m18 0-2-5H5L3 8m7 4h4",
  cloudDownload:
    "M12 13v8m0 0-4-4m4 4 4-4M20 16.6A4.5 4.5 0 0 0 18 8h-1.3A7 7 0 1 0 5 14.7",
  download:
    "M12 3v12m0 0-4-4m4 4 4-4M5 21h14",
  filePlus:
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8m-6-6 6 6m-6-6v6h6M12 12v6m-3-3h6",
  folder:
    "M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z",
  key:
    "M15 7a4 4 0 1 0 2 3.5L22 16v3h-3v-2h-2v-2h-2l-2.5-2.5A4 4 0 0 0 15 7Zm-7 1h.01",
  menu:
    "M4 7h16M4 12h16M4 17h16",
  plus:
    "M12 5v14M5 12h14",
  save:
    "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2ZM7 3v6h8M7 21v-8h10v8",
  search:
    "m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z",
  shield:
    "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Zm-3-10 2 2 4-5",
  trash:
    "M3 6h18M8 6V4h8v2m-1 5v6M9 11v6m-3-11 1 16h10l1-16",
  upload:
    "M12 21V9m0 0-4 4m4-4 4 4M5 3h14",
}

function Icon({
  name,
}: {
  name: IconName
}) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d={iconPaths[name]} />
    </svg>
  )
}

export default function App() {
  //
  // PROJECTS
  //

  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [projects, setProjects] =
    useState<Project[]>([])

  const [
    selectedProjectId,
    setSelectedProjectId,
  ] = useState<string | null>(null)

  const [
    editingPassword,
    setEditingPassword,
  ] = useState("")

  const [
    activePassword,
    setActivePassword,
  ] = useState("")

  const [
    workerUrl,
    setWorkerUrl,
  ] = useState(
    localStorage.getItem(
      "worker-url"
    ) || ""
  )

  //
  // NOTES
  //


  const [notes, setNotes] = useState<
    Note[]
  >([])

  const [
    selectedNoteId,
    setSelectedNoteId,
  ] = useState<string | null>(null)

  const [
    noteSearch,
    setNoteSearch,
  ] = useState("")

  //
  // 初期読み込み
  //

  const [
    saveStatus,
    setSaveStatus,
  ] = useState("Saved")

  useEffect(() => {
    async function init() {
      const allProjects =
        await getProjects()

        setProjects(
          allProjects.sort(
            (a, b) =>
              b.updatedAt -
              a.updatedAt
          )
        )

      if (allProjects.length > 0) {
        setSelectedProjectId(
          allProjects[0].id
        )
      }
          // ★ここ追加：起動時自動復元
    }

    init()
  }, [])

  //
  // project変更時
  //

  useEffect(() => {
    async function loadNotes() {
      if (!selectedProjectId) {
        setNotes([])

        return
      }

      const result =
        await getNotesByProject(
          selectedProjectId
        )

        setNotes(
          result.sort(
            (a, b) =>
              b.updatedAt -
              a.updatedAt
          )
        )

      if (result.length > 0) {
        setSelectedNoteId(
          result[0].id
        )
      } else {
        setSelectedNoteId(null)
      }
    }

    loadNotes()
    }, [selectedProjectId])

  useEffect(() => {
    async function loadHandle() {
      const saved = await getHandle("backupDir")

      if (!saved) return

      try {
        const permission = await saved.queryPermission({ mode: "readwrite" })

        if (permission !== "granted") {
          console.log("No permission for backup folder")
          return
        }

        setBackupDirHandle(saved)
        console.log("Backup folder restored")
      } catch (e) {
        console.error("Handle restore failed", e)
      }
    }

    loadHandle()
  }, [])

  //
  // selected note
  //

  const selectedNote = useMemo(() => {
    return notes.find(
      (n) => n.id === selectedNoteId
    )
  }, [notes, selectedNoteId])

  const wikiLinks = useMemo(() => {
    if (!selectedNote) return []

    const matches =
      selectedNote.content.match(
        /\[\[(.*?)\]\]/g
      ) || []

    return matches
      .map((match) =>
        match.slice(2, -2)
      )
      .filter(
        (title, index, self) =>
          self.indexOf(title) ===
          index
      )
  }, [selectedNote])

  useEffect(() => {
    if (
      selectedNoteId &&
      !notes.some(
        (n) => n.id === selectedNoteId
      )
    ) {
      setSelectedNoteId(
        notes[0]?.id ?? null
      )
    }
  }, [notes, selectedNoteId])

  const filteredNotes =
    notes.filter((note) =>
      note.title
        .toLowerCase()
        .includes(
          noteSearch.toLowerCase()
        )
    )

  const [
    backupDirHandle,
    setBackupDirHandle,
  ] = useState<any>(null)

  //
  // 定期バックアップ
  //

  useEffect(() => {
    if (!backupDirHandle) return

    const interval = setInterval(() => {
    if (Date.now() - lastEditTime < 60_000) {
      runLocalBackup()
    }
  }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [backupDirHandle])

  //
  // project作成
  //

  async function createProject() {
    const newProject: Project = {
      id: crypto.randomUUID(),

      name: "New Project",

      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await saveProject(newProject)

    setProjects((prev) => [
      newProject,
      ...prev,
    ])

    setSelectedProjectId(
      newProject.id
    )
  }

  function updateProjectName(
    projectId: string,
    name: string
  ) {
    const target = projects.find(
      (p) => p.id === projectId
    )

    if (!target) return

    const updated: Project = {
      ...target,

      name,

      updatedAt: Date.now(),
    }

    setProjects((prev) =>
      prev
        .map((project) =>
          project.id === projectId
            ? updated
            : project
        )
        .sort(
          (a, b) =>
            b.updatedAt -
            a.updatedAt
        )
    )

    saveProject(updated)
  }
  
  async function removeProject(projectId: string) 
  {
      await deleteProject(projectId)

      const next = projects.filter(
        (p) => p.id !== projectId
      )

      setProjects(next)

      if (
        selectedProjectId === projectId
      ) {
        setSelectedProjectId(
          next[0]?.id ?? null
        )
      }
    }

  //
  // note作成
  //

  async function createNote() {
    if (!selectedProjectId) return

    const newNote: Note = {
      id: crypto.randomUUID(),

      projectId:
        selectedProjectId,

      title: "Untitled",
      content: "",

      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await saveNote(newNote)

    setNotes((prev) => [
      newNote,
      ...prev,
    ])

    setSelectedNoteId(
      newNote.id
    )
  }

  async function removeNote(
  noteId: string
  ) {
    await deleteNote(noteId)

    const next = notes.filter(
      (n) => n.id !== noteId
    )

    setNotes(next)

    if (
      selectedNoteId === noteId
    ) {
      setSelectedNoteId(
        next[0]?.id ?? null
      )
    }
  }

  //
  // note更新
  //

  let lastEditTime = Date.now()
  
  function updateNoteContent(
    content: string
  ) {
    if (!selectedNote) return

   setSaveStatus("Saving...") 

    const updated: Note = {
      ...selectedNote,

      content,


      updatedAt: Date.now(),
    }

      setNotes((prev) =>
        prev
          .map((note) =>
            note.id === updated.id
              ? updated
              : note
          )
          .sort(
            (a, b) =>
              b.updatedAt -
              a.updatedAt
          )
      )
  }

  function updateNoteTitle(
    title: string
  ) {
    if (!selectedNote) return

    const updated: Note = {
      ...selectedNote,

      title,

      updatedAt: Date.now(),
    }

    setNotes((prev) =>
      prev
        .map((note) =>
          note.id === updated.id
            ? updated
            : note
        )
        .sort(
          (a, b) =>
            b.updatedAt -
            a.updatedAt
        )
    )
  }

  //
  // debounce保存
  //

  useEffect(() => {
    if (!selectedNote) return

    const timer = setTimeout(() => {
      saveNote(selectedNote)

      if (backupDirHandle) {
        ;(async () => {
          const permission =
            await backupDirHandle.queryPermission({
              mode: "readwrite",
            })

          if (permission !== "granted") {
            setSaveStatus(
              "Backup permission lost"
            )

            return
          }

          const data =
            await exportData()

          const fileHandle =
            await backupDirHandle.getFileHandle(
              "notes-backup.json",
              {
                create: true,
              }
            )

          const writable =
            await fileHandle.createWritable()

          await writable.write(
            JSON.stringify(
              data,
              null,
              2
            )
          )

          await writable.close()
        })()
      }

      uploadEncryptedBackup()
      setSaveStatus("Saved")
    }, 500)

    return () => {
      clearTimeout(timer)
    }
  }, [selectedNote])

  async function runLocalBackup() {
    if (!backupDirHandle) return

    try {
      const permission = await backupDirHandle.queryPermission({
        mode: "readwrite",
      })

      if (permission !== "granted") return

      const data = await exportData()

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")

      const fileName = `backup-${timestamp}.json`

      const fileHandle = await backupDirHandle.getFileHandle(
        fileName,
        { create: true }
      )

      const writable = await fileHandle.createWritable()

      await writable.write(JSON.stringify(data, null, 2))
      await writable.close()

      await cleanupOldBackups()

      console.log("local backup saved")
    } catch (e) {
      console.error("backup failed", e)
    }
  }

  async function cleanupOldBackups() {
    const files: FileSystemFileHandle[] = []

    for await (const entry of backupDirHandle.values()) {
      if (entry.kind === "file" && entry.name.startsWith("backup-")) {
        files.push(entry)
      }
    }

    if (files.length <= 500) return

    const sorted = files.sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    const toDelete = sorted.slice(0, sorted.length - 500)

    for (const file of toDelete) {
      await backupDirHandle.removeEntry(file.name)
    }
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
      }}
    >
      <button
        onClick={() => setSidebarOpen(v => !v)}
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1000,
        }}
      >
        ☰
      </button>
      {sidebarOpen && (
        <>
      {/* PROJECTS */}
      <div
        style={{
          width: 240,
          borderRight:
            "1px solid #ccc",
          padding: 12,
        }}
      >

        <h2>Projects</h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <input
            type="password"
            placeholder="Encryption Password"
            value={editingPassword}
            onChange={(e) =>
              setEditingPassword(
                e.target.value
              )
            }
            style={{
              width: "100%",
            }}
          />

          <button
            onClick={() =>
              setActivePassword(
                editingPassword
              )
            }
          >
            <Icon name="shield" />
            <span>Set Password</span>
          </button>

          <div
            style={{
              fontSize: 12,
              color: "#666",
            }}
          >
            {activePassword
              ? "Password loaded"
              : "No password"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <input
            placeholder="Worker URL"
            value={workerUrl}
            onChange={(e) =>
              setWorkerUrl(
                e.target.value
              )
            }
          />

          <button
            onClick={saveWorkerUrl}
          >
            <Icon name="save" />
            <span>Save Worker URL</span>
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,

            marginTop: 12,
            marginBottom: 12,
          }}
        >
          <button
            onClick={
              handlePlainExport
            }
          >
            <Icon name="download" />
            <span>Export JSON</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Import JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={
                handlePlainImport
              }
            />
          </div>

          <button
            onClick={
              handleEncryptedExport
            }
          >
            <Icon name="archive" />
            <span>Export Encrypted</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Import Encrypted</span>
            <input
              type="file"
              accept=".json"
              onChange={
                handleEncryptedImport
              }
            />
          </div>
        </div>

        <button
          onClick={restoreFromR2}
        >
          <Icon name="cloudDownload" />
          <span>Restore From R2</span>
        </button>

        <button
          onClick={selectBackupFolder}
        >
          <Icon name="folder" />
          <span>Select Backup Folder</span>
        </button>

        <button
          onClick={createProject}
        >
          <Icon name="plus" />
          <span>New Project</span>
        </button>

        <div
          style={{
            marginTop: 12,
          }}
        >
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() =>
                setSelectedProjectId(
                  project.id
                )
              }
              style={{
                padding: 8,
                cursor: "pointer",

                background:
                  project.id ===
                  selectedProjectId
                    ? "#eee"
                    : "transparent",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <input
                  value={project.name}
                  onChange={(e) =>
                    updateProjectName(
                      project.id,
                      e.target.value
                    )
                  }
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                  style={{
                    flex: 1,
                  }}
                />

                <button
                  onClick={(e) => {
                    e.stopPropagation()

                    removeProject(project.id)
                  }}
                >
                  <Icon name="trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NOTES */}
      <div
        style={{
          width: 240,
          borderRight:
            "1px solid #ccc",
          padding: 12,
        }}
      >
        <h2>Notes</h2>

        <input
          placeholder="Search notes"
          value={noteSearch}
          onChange={(e) =>
            setNoteSearch(
              e.target.value
            )
          }
          style={{
            width: "100%",
            marginBottom: 12,
          }}
        />

        <button
          onClick={createNote}
          disabled={
            !selectedProjectId
          }
        >
          <Icon name="filePlus" />
          <span>New Note</span>
        </button>

        <div
          style={{
            marginTop: 12,
          }}
        >
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() =>
                setSelectedNoteId(
                  note.id
                )
              }
              style={{
                padding: 8,
                cursor: "pointer",

                background:
                  note.id ===
                  selectedNoteId
                    ? "#eee"
                    : "transparent",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                }}
              >
                <span>{note.title}</span>

                <button
                  onClick={(e) => {
                    e.stopPropagation()

                    removeNote(note.id)
                  }}
                >
                  <Icon name="trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
        </>
      )}

      {/* EDITOR */}
      <div
        style={{
          flex: 1,
          padding: 16,
        }}
      >
      {selectedNote ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            gap: 12,
            alignItems: "stretch",
          }}
        >

          <div
            style={{
              fontSize: 12,
              color: "#666",
            }}
          >
            {saveStatus}
          </div>

          {wikiLinks.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {wikiLinks.map((title) => {
                const target =
                  notes.find(
                    (n) =>
                      n.title === title
                  )

                return (
                  <button
                    key={title}
                    onClick={() => {
                      if (target) {
                        setSelectedNoteId(
                          target.id
                        )
                      }
                    }}

                    style={{
                      background: target
                        ? "#eee"
                        : "#ffdddd",

                      border: "1px solid #ccc",

                      borderColor: target
                        ? "#ccc"
                        : "#ff6666",

                      cursor: target
                        ? "pointer"
                        : "not-allowed",

                      padding: "4px 8px",
                    }}
                  >
                    [[{title}]]
                  </button>
                )
              })}
            </div>
          )}

          <input
            value={selectedNote.title}
            onChange={(e) =>
              updateNoteTitle(
                e.target.value
              )
            }
            placeholder="Title"
            style={{
              fontSize: 24,
              padding: 8,
            }}
          />

            <CodeMirror
              value={selectedNote.content}
              height="100%"
              extensions={[
                markdown(),
                EditorView.lineWrapping,

                keymap.of([
                  {
                    key: "Mod-s",

                    run: () => {
                      if (selectedNote) {
                        saveNote(selectedNote)

                        console.log("saved")
                      }

                      return true
                    },
                  },
                ]),

                EditorView.theme({
                  "&": {
                    fontSize: "16px",
                    textAlign: "left",
                  },

                  ".cm-content": {
                    fontFamily:
                      "sans-serif",

                    padding: "16px",

                    lineHeight: "1.6",

                    textAlign: "left",

                    whiteSpace: "pre-wrap",
                  },

                  ".cm-line": {
                    textAlign: "left",
                  },

                  ".cm-header-1": {
                    fontSize: "2em",
                    fontWeight: "bold",
                  },

                  ".cm-header-2": {
                    fontSize: "1.5em",
                    fontWeight: "bold",
                  },

                  ".cm-header-3": {
                    fontSize: "1.2em",
                    fontWeight: "bold",
                  },
                }),
                  syntaxHighlighting(
                    HighlightStyle.define([
                      {
                        tag: tags.heading1,
                        fontSize: "2em",
                        fontWeight: "bold",
                      },

                      {
                        tag: tags.heading2,
                        fontSize: "1.5em",
                        fontWeight: "bold",
                      },

                      {
                        tag: tags.heading3,
                        fontSize: "1.2em",
                        fontWeight: "bold",
                      },

                      {
                        tag: tags.quote,
                        color: "#666",
                        fontStyle: "italic",
                      },

                      {
                        tag: tags.monospace,
                        fontFamily: "monospace",
                        backgroundColor: "#f0f0f0",
                      },

                      {
                        tag: tags.link,
                        color: "#3b82f6",
                        textDecoration: "underline",
                      },

                      {
                        tag: tags.strong,
                        fontWeight: "bold",
                      },

                      {
                        tag: tags.emphasis,
                        fontStyle: "italic",
                      },
                    ])
                  ),
              ]}
              onChange={(value) =>
                updateNoteContent(value)
              }
            />
        </div>
      ) : (
        <p>No note selected</p>
      )}
      </div>
    </div>
  )

  async function handlePlainExport() {
    const data = await exportData()

    const blob = new Blob(
      [
        JSON.stringify(
          data,
          null,
          2
        ),
      ],
      {
        type: "application/json",
      }
    )

    const url =
      URL.createObjectURL(blob)

    const a =
      document.createElement("a")

    a.href = url

    a.download =
      "notes-backup.json"

    a.click()

    URL.revokeObjectURL(url)
  }

  async function handleEncryptedExport() {
    if (!activePassword) {
      alert(
        "Password required"
      )

      return
    }

    const data = await exportData()

    const json =
      JSON.stringify(data)

    const encrypted =
      await encryptString(
        json,
        activePassword
      )

    const blob = new Blob(
      [
        JSON.stringify(
          encrypted,
          null,
          2
        ),
      ],
      {
        type: "application/json",
      }
    )

    const url =
      URL.createObjectURL(blob)

    const a =
      document.createElement("a")

    a.href = url

    a.download =
      "notes-backup.enc.json"

    a.click()

    URL.revokeObjectURL(url)
  }

  async function handlePlainImport(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0]

    if (!file) return

    const text =
      await file.text()

    const data = JSON.parse(text)

    await importData(data)

    location.reload()
  }

  async function handleEncryptedImport(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    if (!activePassword) {
      alert(
        "Password required"
      )

      return
    }

    const file =
      event.target.files?.[0]

    if (!file) return

    try {
      const text =
        await file.text()

      const encrypted =
        JSON.parse(text)

      const json =
        await decryptString(
          encrypted,
          activePassword
        )

      const data =
        JSON.parse(json)

      await importData(data)

      location.reload()
    } catch {
      alert(
        "Decrypt failed"
      )
    }
  }

    async function uploadEncryptedBackup() {
    if (!activePassword) {
      return
    }

    try {
      const data =
        await exportData()

      const json =
        JSON.stringify(data)

      const encrypted =
        await encryptString(
          json,
          activePassword
        )

      await fetch(
        `${workerUrl}/upload`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            encrypted
          ),
        }
      )

      console.log(
        "R2 backup uploaded"
      )
    } catch (error) {
      console.error(error)
    }
  }

  async function restoreFromR2() {
    if (!activePassword) {
      alert(
        "Password required"
      )

      return
    }

    try {
      const response =
        await fetch(
          `${workerUrl}/latest`
        )

      if (!response.ok) {
        alert("No backup found")

        return
      }

      const encrypted =
        await response.json()

      const json =
        await decryptString(
          encrypted,
          activePassword
        )

      const data =
        JSON.parse(json)

      await importData(data)

      alert(
        "Restore completed"
      )

      location.reload()
    } catch (error) {
      console.error(error)

      alert(
        "Restore failed"
      )
    }
  }

  function saveWorkerUrl() {
    localStorage.setItem(
      "worker-url",
      workerUrl
    )

    alert("Worker URL saved")
  }

async function selectBackupFolder() {
  try {
    const dir = await window.showDirectoryPicker()

    setBackupDirHandle(dir)

    await saveHandle("backupDir", dir)

    alert("Backup folder selected")
  } catch {
    alert("Folder selection cancelled")
  }
}
}

// ← Appコンポーネントの外ならどこでもOK

const DB_NAME = "mininote-db"
const STORE_NAME = "handles"

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)

    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveHandle(key: string, value: any) {
  const db = await openDB()

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.objectStore(STORE_NAME).put(value, key)

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function getHandle(key: string): Promise<any> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const req = tx.objectStore(STORE_NAME).get(key)

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
