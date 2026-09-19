export interface FilesystemForCleanup {
  unlink(path: string): Promise<void>
}

export async function cleanup<T extends { videoPath?: string; audioPath?: string }>(
  input: T,
  fs: FilesystemForCleanup,
): Promise<T> {
  if (input.videoPath) {
    await fs.unlink(input.videoPath)
  }
  if (input.audioPath) {
    await fs.unlink(input.audioPath)
  }
  return input
}
