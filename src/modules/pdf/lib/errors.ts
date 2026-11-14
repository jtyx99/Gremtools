/**
 * An error whose message is safe and useful to show to the user as-is.
 * Lives in its own file so UI code can use it without pulling in pdf-lib.
 */
export class PdfToolError extends Error {
  // Set explicitly: class names do not survive minification, and the UI checks this.
  override name = 'PdfToolError'
}
