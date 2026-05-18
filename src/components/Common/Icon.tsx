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

export default function Icon({
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