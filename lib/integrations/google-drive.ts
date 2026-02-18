/**
 * Google Drive integration for agent memory files.
 * Uses the drive.file scope (only accesses files created by Volition).
 */

import { google } from 'googleapis';
import { getOAuth2Client } from './google';
import { sql } from '@/lib/db';

const VOLITION_FOLDER_NAME = 'Volition';
export const MEMORY_FILES = ['soul.md', 'preferences.md', 'knowledge.md', 'journal.md'] as const;
export type MemoryFileName = typeof MEMORY_FILES[number];

/**
 * Get or create the root "Volition" folder in the user's Drive.
 */
export async function getVolitionFolder(userId: string): Promise<string> {
  const auth = await getOAuth2Client(userId);
  const drive = google.drive({ version: 'v3', auth });

  // Search for existing folder
  const res = await drive.files.list({
    q: `name='${VOLITION_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name: VOLITION_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  return folder.data.id!;
}

/**
 * Get or create an agent subfolder under "Volition/".
 */
export async function getAgentFolder(userId: string, agentId: string, agentName: string): Promise<string> {
  // Check if we already have the folder ID cached
  const agents = await sql`SELECT drive_folder_id FROM agents WHERE id = ${agentId}`;
  if (agents[0]?.drive_folder_id) {
    return agents[0].drive_folder_id;
  }

  const auth = await getOAuth2Client(userId);
  const drive = google.drive({ version: 'v3', auth });
  const parentId = await getVolitionFolder(userId);
  const folderName = `Agent - ${agentName}`;

  // Search for existing
  const res = await drive.files.list({
    q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });

  let folderId: string;
  if (res.data.files && res.data.files.length > 0) {
    folderId = res.data.files[0].id!;
  } else {
    const folder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
    });
    folderId = folder.data.id!;
  }

  // Cache the folder ID
  await sql`UPDATE agents SET drive_folder_id = ${folderId} WHERE id = ${agentId}`;
  return folderId;
}

/**
 * Write (create or update) a memory file in the agent's Drive folder.
 */
export async function writeMemoryFile(
  userId: string,
  agentId: string,
  agentName: string,
  filename: string,
  content: string
): Promise<string> {
  const auth = await getOAuth2Client(userId);
  const drive = google.drive({ version: 'v3', auth });
  const folderId = await getAgentFolder(userId, agentId, agentName);

  // Check if file already exists (from cached IDs)
  const agents = await sql`SELECT drive_file_ids FROM agents WHERE id = ${agentId}`;
  const fileIds: Record<string, string> = agents[0]?.drive_file_ids || {};
  const existingFileId = fileIds[filename];

  if (existingFileId) {
    // Update existing file
    await drive.files.update({
      fileId: existingFileId,
      media: {
        mimeType: 'text/markdown',
        body: content,
      },
    });
    return existingFileId;
  }

  // Create new file
  const file = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
      mimeType: 'text/markdown',
    },
    media: {
      mimeType: 'text/markdown',
      body: content,
    },
    fields: 'id',
  });

  const newFileId = file.data.id!;

  // Cache the file ID
  const updatedIds = { ...fileIds, [filename]: newFileId };
  await sql`UPDATE agents SET drive_file_ids = ${JSON.stringify(updatedIds)} WHERE id = ${agentId}`;

  return newFileId;
}

/**
 * Read a memory file from Google Drive.
 */
export async function readMemoryFile(
  userId: string,
  agentId: string,
  filename: string
): Promise<string | null> {
  const agents = await sql`SELECT drive_file_ids FROM agents WHERE id = ${agentId}`;
  const fileIds: Record<string, string> = agents[0]?.drive_file_ids || {};
  const fileId = fileIds[filename];

  if (!fileId) return null;

  const auth = await getOAuth2Client(userId);
  const drive = google.drive({ version: 'v3', auth });

  try {
    const res = await drive.files.get({
      fileId,
      alt: 'media',
    });
    return res.data as string;
  } catch {
    return null;
  }
}

/**
 * Append content to a memory file without replacing existing content.
 * Reads the current file, appends the new content with a separator, and writes back.
 */
export async function appendMemoryFile(
  userId: string,
  agentId: string,
  agentName: string,
  filename: string,
  content: string
): Promise<{ fileId: string; fullContent: string }> {
  const existing = await readMemoryFile(userId, agentId, filename);
  const fullContent = existing ? `${existing}\n\n${content}` : content;
  const fileId = await writeMemoryFile(userId, agentId, agentName, filename, fullContent);
  return { fileId, fullContent };
}

/**
 * List all memory files for an agent.
 * Discovers files dynamically from the agent's Drive folder, falling back to cached drive_file_ids.
 */
export async function listMemoryFiles(
  userId: string,
  agentId: string
): Promise<Array<{ filename: string; fileId: string | null }>> {
  const agents = await sql`SELECT drive_folder_id, drive_file_ids FROM agents WHERE id = ${agentId}`;
  const fileIds: Record<string, string> = agents[0]?.drive_file_ids || {};
  const folderId = agents[0]?.drive_folder_id;

  // Try to list files dynamically from Drive folder
  if (folderId) {
    try {
      const auth = await getOAuth2Client(userId);
      const drive = google.drive({ version: 'v3', auth });
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false and mimeType='text/markdown'`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (res.data.files && res.data.files.length > 0) {
        return res.data.files.map((f) => ({
          filename: f.name || 'unknown',
          fileId: f.id || null,
        }));
      }
    } catch {
      // Fall through to cached IDs
    }
  }

  // Fallback: return all files from cached drive_file_ids
  const filenames = new Set<string>([...MEMORY_FILES, ...Object.keys(fileIds)]);
  return Array.from(filenames).map((filename) => ({
    filename,
    fileId: fileIds[filename] || null,
  }));
}
