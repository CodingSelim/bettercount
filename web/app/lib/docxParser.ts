import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import {
  DocxBlock,
  BodyParseResult,
  countAcademicBodyWords,
  countAcademicBodyWordsFromBlocks,
} from "./academicParser";

export type AcademicInput =
  | { kind: "plain"; text: string }
  | { kind: "docx"; data: ArrayBuffer };

export async function countAcademicWords(input: AcademicInput): Promise<BodyParseResult> {
  if (input.kind === "plain") {
    return countAcademicBodyWords(input.text);
  }

  const blocks = await parseDocxBlocks(input.data);
  return countAcademicBodyWordsFromBlocks(blocks);
}

export async function parseDocxBlocks(data: ArrayBuffer): Promise<DocxBlock[]> {
  const zip = await JSZip.loadAsync(data);
  const documentXml = await readZipFile(zip, "word/document.xml");
  if (!documentXml) {
    throw new Error("DOCX document.xml not found");
  }

  const stylesXml = await readZipFile(zip, "word/styles.xml");
  const stylesDoc = stylesXml ? parseXml(stylesXml) : null;
  const styleMap = stylesDoc ? buildStyleMap(stylesDoc) : new Map<string, string>();

  const documentDoc = parseXml(documentXml);
  const body = documentDoc.getElementsByTagName("w:body")[0];
  if (!body) {
    return [];
  }

  const blocks: DocxBlock[] = [];
  const childNodes = body.childNodes;
  for (let i = 0; i < childNodes.length; i += 1) {
    const node = childNodes.item(i);
    if (!node || node.nodeType !== 1) {
      continue;
    }

    const element = node as Element;
    if (element.tagName === "w:p") {
      const paragraphInfo = extractParagraphInfo(element, styleMap);
      blocks.push(paragraphInfo);
    } else if (element.tagName === "w:tbl") {
      blocks.push({ kind: "table", text: "" });
    }
  }

  return blocks;
}

async function readZipFile(zip: JSZip, path: string): Promise<string | null> {
  const file = zip.file(path);
  if (!file) return null;
  return file.async("string");
}

function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, "application/xml");
}

function buildStyleMap(stylesDoc: Document): Map<string, string> {
  const map = new Map<string, string>();
  const styles = stylesDoc.getElementsByTagName("w:style");
  for (let i = 0; i < styles.length; i += 1) {
    const style = styles.item(i);
    if (!style) continue;
    const styleId = style.getAttribute("w:styleId");
    if (!styleId) continue;

    const nameNode = style.getElementsByTagName("w:name")[0];
    const name = nameNode?.getAttribute("w:val");
    if (name) {
      map.set(styleId, name);
    }
  }
  return map;
}

function extractParagraphInfo(paragraph: Element, styleMap: Map<string, string>): DocxBlock {
  const text = extractParagraphText(paragraph);
  const styleId = getParagraphStyleId(paragraph);
  const styleName = styleId ? styleMap.get(styleId) || styleId : undefined;
  const normalizedStyle = (styleName || "").toLowerCase();

  const isCaption = normalizedStyle.includes("caption");
  const isHeading = isHeadingStyle(normalizedStyle) || paragraphHasOutline(paragraph);

  if (isCaption) {
    return { kind: "caption", text, styleName };
  }

  if (isHeading) {
    return { kind: "heading", text, styleName };
  }

  return { kind: "paragraph", text, styleName };
}

function extractParagraphText(paragraph: Element): string {
  const parts: string[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === 1) {
      const element = node as Element;
      switch (element.tagName) {
        case "w:t":
          parts.push(element.textContent || "");
          return;
        case "w:tab":
          parts.push(" ");
          return;
        case "w:br":
        case "w:cr":
          parts.push("\n");
          return;
        case "w:delText":
          return;
        default:
          break;
      }
    }

    const children = node.childNodes;
    if (!children) return;
    for (let i = 0; i < children.length; i += 1) {
      const child = children.item(i);
      if (child) {
        walk(child);
      }
    }
  };

  walk(paragraph);
  return parts.join("").replace(/\s+/g, " ").trim();
}

function getParagraphStyleId(paragraph: Element): string | undefined {
  const pPr = paragraph.getElementsByTagName("w:pPr")[0];
  if (!pPr) return undefined;
  const pStyle = pPr.getElementsByTagName("w:pStyle")[0];
  const styleId = pStyle?.getAttribute("w:val");
  return styleId || undefined;
}

function paragraphHasOutline(paragraph: Element): boolean {
  const pPr = paragraph.getElementsByTagName("w:pPr")[0];
  if (!pPr) return false;
  return pPr.getElementsByTagName("w:outlineLvl").length > 0;
}

function isHeadingStyle(styleName: string): boolean {
  return styleName.startsWith("heading");
}
