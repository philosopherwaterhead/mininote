import { openDB } from "idb"

const DB_NAME = "notes-db"

const PROJECT_STORE = "projects"
const NOTE_STORE = "notes"

export type Project = {
  id: string
  name: string

  createdAt: number
  updatedAt: number
}

export type Note = {
  id: string

  projectId: string

  title: string
  content: string

  createdAt: number
  updatedAt: number
}

export const dbPromise = openDB(DB_NAME, 2, {
  upgrade(db) {
    // projects
    if (
      !db.objectStoreNames.contains(
        PROJECT_STORE
      )
    ) {
      db.createObjectStore(
        PROJECT_STORE,
        {
          keyPath: "id",
        }
      )
    }

    // notes
    if (
      !db.objectStoreNames.contains(
        NOTE_STORE
      )
    ) {
      const store =
        db.createObjectStore(
          NOTE_STORE,
          {
            keyPath: "id",
          }
        )

      store.createIndex(
        "projectId",
        "projectId"
      )
    }
  },
})

//
// PROJECTS
//

export async function getProjects(): Promise<
  Project[]
> {
  const db = await dbPromise

  return db.getAll(PROJECT_STORE)
}

export async function saveProject(
  project: Project
) {
  const db = await dbPromise

  await db.put(
    PROJECT_STORE,
    project
  )
}

export async function deleteProject(
  projectId: string
) {
  const db = await dbPromise

  // project削除
  await db.delete(
    PROJECT_STORE,
    projectId
  )

  // note cascade delete
  const tx = db.transaction(
    NOTE_STORE,
    "readwrite"
  )

  const index =
    tx.store.index("projectId")

  let cursor =
    await index.openCursor(projectId)

  while (cursor) {
    await cursor.delete()

    cursor = await cursor.continue()
  }

  await tx.done
}

//
// NOTES
//

export async function getNotesByProject(
  projectId: string
): Promise<Note[]> {
  const db = await dbPromise

  return db.getAllFromIndex(
    NOTE_STORE,
    "projectId",
    projectId
  )
}

export async function getNote(
  noteId: string
): Promise<Note | undefined> {
  const db = await dbPromise

  return db.get(
    NOTE_STORE,
    noteId
  )
}

export async function saveNote(
  note: Note
) {
  const db = await dbPromise

  await db.put(
    NOTE_STORE,
    note
  )
}

export async function deleteNote(
  noteId: string
) {
  const db = await dbPromise

  await db.delete(
    NOTE_STORE,
    noteId
  )
}

export async function exportData() {
  const db = await dbPromise

  const projects =
    await db.getAll(PROJECT_STORE)

  const notes =
    await db.getAll(NOTE_STORE)

  return {
    projects,
    notes,
  }
}

export async function importData(data: {
  projects: Project[]
  notes: Note[]
}) {
  const db = await dbPromise

  const tx = db.transaction(
    [PROJECT_STORE, NOTE_STORE],
    "readwrite"
  )

  // 全削除
  await tx.objectStore(
    PROJECT_STORE
  ).clear()

  await tx.objectStore(
    NOTE_STORE
  ).clear()

  // projects復元
  for (const project of data.projects) {
    await tx.objectStore(
      PROJECT_STORE
    ).put(project)
  }

  // notes復元
  for (const note of data.notes) {
    await tx.objectStore(
      NOTE_STORE
    ).put(note)
  }

  await tx.done
}

