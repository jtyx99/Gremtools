/** An error whose message is safe and useful to show to the user as-is. */
export class ToolError extends Error {
  // Set explicitly: class names do not survive minification, and useRun checks this.
  override name = 'ToolError'
}
