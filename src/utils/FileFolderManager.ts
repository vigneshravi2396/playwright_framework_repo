/**
 * Utility class for file and folder operations with safe filename handling
 * @description Provides static methods for common file system operations including filename sanitization,
 * directory management, and path operations. All methods are designed to be safe and handle edge cases.
 * @example
 * ```typescript
 * // Sanitize a filename
 * const safeName = FileFolderManager.sanitizeFilename('test/file:name');
 * console.log(safeName); // 'test_file_name'
 * 
 * // Ensure directory exists
 * FileFolderManager.ensureDirExists('./test-results');
 * ```
 */
// utils/FileFolderManager.ts
import fs from 'fs';
import path from 'path';

export class FileFolderManager {
  /**
   * Sanitizes a filename by removing or replacing invalid characters
   * @param name - Original filename that may contain invalid characters
   * @returns Sanitized filename safe for filesystem operations
   * @description Replaces invalid filesystem characters (\ / : * ? " < > |) with underscores and normalizes whitespace
   * @example
   * ```typescript
   * const safeName = FileFolderManager.sanitizeFilename('test/file:name');
   * console.log(safeName); // 'test_file_name'
   * 
   * const safeName2 = FileFolderManager.sanitizeFilename('report 2024/01/15');
   * console.log(safeName2); // 'report_2024_01_15'
   * ```
   */
  static sanitizeFilename(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
  }

  /**
   * Ensures a directory exists, creating it if necessary
   * @param dirPath - Path to the directory to create
   * @throws Error if directory creation fails
   * @description Creates the directory and all parent directories if they don't exist. Uses recursive creation.
   * @example
   * ```typescript
   * FileFolderManager.ensureDirExists('./test-results');
   * FileFolderManager.ensureDirExists('./reports/2024/january');
   * ```
   */
  static ensureDirExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Clears all contents of a directory
   * @param dirPath - Path to the directory to clear
   * @throws Error if folder clearing fails
   * @description Removes all files and subdirectories from the specified directory. The directory itself is also removed.
   * @example
   * ```typescript
   * FileFolderManager.clearFolder('./temp-files');
   * FileFolderManager.clearFolder('./test-artifacts');
   * ```
   */
  static clearFolder(dirPath: string): void {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`🗑️ Cleared folder: ${dirPath}`);
    }
  }

  /**
   * Safely joins path segments using the appropriate path separator for the operating system
   * @param parts - Variable number of path segments to join
   * @returns Joined path string with correct separators
   * @description Uses Node.js path.join() to handle different operating systems (Windows vs Unix)
   * @example
   * ```typescript
   * const fullPath = FileFolderManager.joinPath('reports', '2024', 'test-results.json');
   * console.log(fullPath); // 'reports/2024/test-results.json' on Unix, 'reports\2024\test-results.json' on Windows
   * 
   * const configPath = FileFolderManager.joinPath(process.cwd(), 'config', 'test.json');
   * ```
   */
  static joinPath(...parts: string[]): string {
    return path.join(...parts);
  }

  /**
   * Checks if a file exists at the specified path
   * @param filePath - Path to the file to check
   * @returns True if file exists, false otherwise
   * @description Uses fs.existsSync() to synchronously check file existence
   * @example
   * ```typescript
   * if (FileFolderManager.fileExists('./config.json')) {
   *   console.log('Config file found');
   * } else {
   *   console.log('Config file not found');
   * }
   * 
   * const hasReport = FileFolderManager.fileExists('./reports/test-report.html');
   * ```
   */
  static fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }
}
