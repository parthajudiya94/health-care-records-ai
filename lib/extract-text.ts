import { Buffer } from "node:buffer";

const PDF_MIMES = new Set(["application/pdf", "application/x-pdf"]);
const TEXT_MIMES = new Set([
  "text/plain",
  "text/csv",
  "application/json",
  "text/markdown",
]);
const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
]);

const OK_EXT = /\.(pdf|txt|md|csv|json|jpe?g|png|heic|heif)$/i;

export function isAllowedFile(mime: string, name: string) {
  if (PDF_MIMES.has(mime)) return true;
  if (TEXT_MIMES.has(mime) || mime.startsWith("text/")) return true;
  if (IMAGE_MIMES.has(mime) || mime.startsWith("image/")) return OK_EXT.test(name);
  return OK_EXT.test(name);
}

let ocrWorkerPromise: Promise<
  import("tesseract.js").Worker
> | null = null;

async function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      return worker;
    })();
  }
  return ocrWorkerPromise;
}

async function ocrImageBuffer(buffer: Buffer): Promise<string> {
  const sharp = (await import("sharp")).default;
  // Normalize to a format OCR likes; keep it lightweight.
  const normalized = await sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({ width: 2200, withoutEnlargement: true })
    .grayscale()
    .png()
    .toBuffer();

  const worker = await getOcrWorker();
  const res = await worker.recognize(normalized);
  return (res.data.text || "").trim();
}

export async function extractText(
  buffer: Buffer,
  mime: string,
  fileName: string
): Promise<{ text: string; error?: string }> {
  const asPdf = PDF_MIMES.has(mime) || /\.pdf$/i.test(fileName);
  if (asPdf) {
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      await parser.destroy();
      return { text: (result.text || "").trim() };
    } catch {
      return { text: "", error: "Could not read this PDF. Try a text export." };
    }
  }
  const asImage =
    IMAGE_MIMES.has(mime) || /\.((jpe?g)|(png)|(heic)|(heif))$/i.test(fileName);
  if (asImage) {
    try {
      const text = await ocrImageBuffer(buffer);
      if (text.length < 20) {
        return {
          text: "",
          error:
            "We could not detect enough readable text in this image. Try a clearer photo or upload a PDF/text export.",
        };
      }
      return { text };
    } catch {
      return {
        text: "",
        error:
          "Could not OCR this image. Try JPG/PNG (or a clearer image) or upload a PDF/text export.",
      };
    }
  }
  if (
    TEXT_MIMES.has(mime) ||
    mime.startsWith("text/") ||
    /\.(txt|md|csv|json)$/i.test(fileName)
  ) {
    return { text: buffer.toString("utf8").trim() };
  }
  return { text: "", error: "Unsupported file type." };
}
