// Minimal typings for the jsmediatags tag reader (no bundled types upstream).
declare module "jsmediatags" {
  export interface TagType {
    type: string;
    tags: {
      title?: string;
      artist?: string;
      album?: string;
      year?: string;
      genre?: string;
      track?: string;
      picture?: unknown;
      [key: string]: unknown;
    };
  }
  export interface ReadCallbacks {
    onSuccess: (tag: TagType) => void;
    onError: (error: unknown) => void;
  }
  const jsmediatags: {
    read: (file: Blob, callbacks: ReadCallbacks) => void;
  };
  export default jsmediatags;
}

// Minimal File System Access API typings (still non-standard in TS DOM lib).
// Kept narrow on purpose: only what localLibrary.ts uses. Safe to remove once
// TS ships these natively or when the Capacitor native bridge replaces this.
interface FileSystemHandlePermissionDescriptor {
  mode?: "read" | "readwrite";
}

interface FileSystemHandle {
  readonly kind: "file" | "directory";
  readonly name: string;
  queryPermission?: (desc?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>;
  requestPermission?: (desc?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>;
}

interface FileSystemFileHandle extends FileSystemHandle {
  readonly kind: "file";
  getFile(): Promise<File>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  readonly kind: "directory";
  values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>;
}

interface Window {
  showDirectoryPicker?: (options?: { id?: string; mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
}
