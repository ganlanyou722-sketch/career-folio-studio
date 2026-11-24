import { AIError } from "./ai-error.mjs";

const maxBytes = 8 * 1024 * 1024;
const imageTypes = { png: "png", jpg: "jpeg", jpeg: "jpeg", webp: "webp" };
const visibleText = value => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();

async function readPDF(bytes, transcribe) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({data: bytes, isEvalSupported: false, useSystemFonts: true, verbosity: 0});
  try {
    const info = await parser.getInfo();
    if (info.total > 16) throw new AIError(422, "PDF 超过 16 页，请上传简历或 JD 对应的页面。");
    const { pages } = await parser.getText();
    const blank = pages.filter(p => !/[\p{L}\p{N}]/u.test(p.text)).map(p => p.num);
    if (blank.length > 4) throw new AIError(422, "扫描页超过 4 页，请拆分文件或上传对应页面的截图。");
    const images = blank.length ? (await parser.getScreenshot({
      partial: blank, desiredWidth: 1150, imageDataUrl: true, imageBuffer: false,
    })).pages : [];
    const result = await Promise.all(pages.map(async page => {
      const image = images.find(img => img.pageNumber === page.num);
      if (blank.includes(page.num) && !image?.dataUrl) throw new AIError(422, "无法转录其中的扫描页，请上传该页截图。");
      return image ? transcribe([image.dataUrl]) : page.text;
    }));
    return result.join("\n\n");
  } finally {
    await parser.destroy();
  }
}

export async function extractDocument(body, transcribe) {
  const filename = typeof body?.name === "string" ? body.name : "";
  const extension = filename.split(".").at(-1)?.toLowerCase();
  const data = typeof body?.data === "string" ? body.data : "";
  if (!data || data.length > Math.ceil(maxBytes / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    throw new AIError(413, "请选择 8 MB 以内的有效文件。");
  }
  const buffer = Buffer.from(data, "base64");
  if (buffer.length > maxBytes) throw new AIError(413, "文件超过 8 MB。");
  let value;
  try {
    if (extension === "pdf" && buffer.subarray(0, 5).toString() === "%PDF-") {
      value = await readPDF(buffer, transcribe);
    } else if (extension === "docx" && buffer.subarray(0, 2).toString() === "PK") {
      const { default: mammoth } = await import("mammoth");
      value = (await mammoth.extractRawText({ buffer })).value;
    } else if (imageTypes[extension]) {
      const jpeg = extension === "jpg" || extension === "jpeg";
      const matches = jpeg ? buffer[0] === 0xff && buffer[1] === 0xd8 :
        extension === "png" ? buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a","hex")) :
          buffer.toString("ascii",0,4) === "RIFF" && buffer.toString("ascii",8,12) === "WEBP";
      if (!matches) throw new AIError(422, "图片内容与文件格式不一致。");
      value = await transcribe(["data:image/" + imageTypes[extension] + ";base64," + data]);
    } else {
      throw new AIError(415, "请上传 PDF、DOCX 或 JPG／PNG／WebP 图片。");
    }
  } catch (error) {
    if (error instanceof AIError) throw error;
    throw new AIError(422, "无法读取这份文件。请检查是否加密或受损，也可粘贴原文。");
  }
  const result = visibleText(value);
  if (!result) throw new AIError(422, "文件里没有可读取的正文，请检查文件或粘贴原文。");
  if (result.length > 18000) throw new AIError(422, "识别的正文超过 18,000 字符，请缩小文件范围。");
  return { text: result };
}
