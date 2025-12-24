export type BodyParseResult = {
  wordCount: number;
  rawWordCount: number;
  bodyText: string;
  startedBy: "heading" | "fallback" | "none";
  startHeading?: string;
  endHeading?: string;
  citationWordsRemoved: number;
  structuralBlocksExcluded: number;
  citations: CitationEntry[];
  citationCount: number;
  tableCount: number;
};

export type DocxBlockKind = "paragraph" | "heading" | "table" | "caption" | "unknown";

export type DocxBlock = {
  kind: DocxBlockKind;
  text: string;
  styleName?: string;
};

export type CitationEntry = {
  text: string;
  words: number;
  occurrences: number;
};

const BODY_START_KEYWORDS = [
  "introduction",
  "background",
  "rationale",
  "research question",
  "aim",
  "methodology",
  "method",
  "methods",
];

const BODY_END_KEYWORDS = [
  "bibliography",
  "references",
  "works cited",
  "appendix",
  "appendices",
];

const FIGURE_TABLE_LABEL = /^(figure|fig\.?|table)\s+[\dIVXLC]+(?:[.\-]\d+)*\s*[:.\-]?\s*/i;

export function countAcademicBodyWordsFromBlocks(blocks: DocxBlock[]): BodyParseResult {
  let inBody = false;
  let startedBy: BodyParseResult["startedBy"] = "none";
  let startHeading: string | undefined;
  let endHeading: string | undefined;
  let skipCaption = false;
  let totalWords = 0;
  let structuralBlocksExcluded = 0;
  const keptBlocks: string[] = [];
  const citationMap = new Map<string, CitationEntry>();

  for (const block of blocks) {
    const rawBlock = normalizeInput(block.text).trim();
    if (!rawBlock) {
      continue;
    }

    const rawWordCount = countWords(rawBlock);
    const isHeadingBlock = block.kind === "heading" || isHeadingStyle(block.styleName);

    if (!inBody) {
      if (isHeadingBlock) {
        const normalized = normalizeHeading(rawBlock);
        if (isBodyStartHeading(normalized)) {
          inBody = true;
          startedBy = "heading";
          startHeading = normalized;
        }
      }

      if (
        !inBody &&
        block.kind !== "table" &&
        rawWordCount > 20 &&
        !isTitleCaseParagraph(rawBlock)
      ) {
        inBody = true;
        startedBy = "fallback";
      }

      if (!inBody) {
        continue;
      }
    }

    if (isHeadingBlock) {
      const normalized = normalizeHeading(rawBlock);
      if (isBodyEndHeading(normalized)) {
        endHeading = normalized;
        break;
      }
    }

    if (block.kind === "table") {
      structuralBlocksExcluded += 1;
      continue;
    }

    if (block.kind === "caption") {
      continue;
    }

    if (skipCaption) {
      if (isLikelyCaption(rawBlock, rawWordCount) && !isHeadingBlock) {
        skipCaption = false;
        continue;
      }
      skipCaption = false;
    }

    if (isFigureOrTableLabel(rawBlock)) {
      skipCaption = true;
      continue;
    }

    const { cleanedText, citations } = extractCitations(rawBlock);
    for (const citation of citations) {
      addCitation(citationMap, citation);
    }

    const normalizedBlock = cleanedText.replace(/\s+/g, " ").trim();
    if (!normalizedBlock) {
      continue;
    }

    const blockWords = countWords(normalizedBlock);
    totalWords += blockWords;
    keptBlocks.push(normalizedBlock);
  }

  const citationEntries = toCitationEntries(citationMap);
  const citationWordsRemovedTotal = sumCitationWords(citationEntries);
  const citationOccurrencesCount = citationEntries.reduce(
    (sum, citation) => sum + citation.occurrences,
    0,
  );

  return {
    wordCount: totalWords,
    rawWordCount: totalWords + citationWordsRemovedTotal,
    bodyText: keptBlocks.join("\n\n"),
    startedBy,
    startHeading,
    endHeading,
    citationWordsRemoved: citationWordsRemovedTotal,
    structuralBlocksExcluded,
    citations: citationEntries,
    citationCount: citationOccurrencesCount,
    tableCount: structuralBlocksExcluded,
  };
}

export function countAcademicBodyWords(input: string): BodyParseResult {
  const text = normalizeInput(input);
  const blocks = splitIntoBlocks(text);

  let inBody = false;
  let startedBy: BodyParseResult["startedBy"] = "none";
  let startHeading: string | undefined;
  let endHeading: string | undefined;
  let skipCaption = false;
  let totalWords = 0;
  let structuralBlocksExcluded = 0;
  const keptBlocks: string[] = [];
  const citationMap = new Map<string, CitationEntry>();

  for (const block of blocks) {
    const rawBlock = block.text;
    const rawWordCount = countWords(rawBlock);

    if (!inBody) {
      if (isStandaloneHeading(rawBlock, rawWordCount)) {
        const normalized = normalizeHeading(rawBlock);
        if (isBodyStartHeading(normalized)) {
          inBody = true;
          startedBy = "heading";
          startHeading = normalized;
        }
      }

      if (!inBody && rawWordCount > 20 && !isTitleCaseParagraph(rawBlock)) {
        inBody = true;
        startedBy = "fallback";
      }

      if (!inBody) {
        continue;
      }
    }

    if (isStandaloneHeading(rawBlock, rawWordCount)) {
      const normalized = normalizeHeading(rawBlock);
      if (isBodyEndHeading(normalized)) {
        endHeading = normalized;
        break;
      }
    }

    if (skipCaption) {
      if (isLikelyCaption(rawBlock, rawWordCount) && !isStandaloneHeading(rawBlock, rawWordCount)) {
        skipCaption = false;
        continue;
      }
      skipCaption = false;
    }

    if (isTableLikeBlock(block.lines)) {
      structuralBlocksExcluded += 1;
      continue;
    }

    if (isFigureOrTableLabel(rawBlock)) {
      skipCaption = true;
      continue;
    }

    const { cleanedText, citations } = extractCitations(rawBlock);
    for (const citation of citations) {
      addCitation(citationMap, citation);
    }

    const normalizedBlock = cleanedText.replace(/\s+/g, " ").trim();
    if (!normalizedBlock) {
      continue;
    }

    const blockWords = countWords(normalizedBlock);
    totalWords += blockWords;
    keptBlocks.push(normalizedBlock);
  }

  const citationEntries = toCitationEntries(citationMap);
  const citationWordsRemovedTotal = sumCitationWords(citationEntries);
  const citationOccurrencesCount = citationEntries.reduce(
    (sum, citation) => sum + citation.occurrences,
    0,
  );

  return {
    wordCount: totalWords,
    rawWordCount: totalWords + citationWordsRemovedTotal,
    bodyText: keptBlocks.join("\n\n"),
    startedBy,
    startHeading,
    endHeading,
    citationWordsRemoved: citationWordsRemovedTotal,
    structuralBlocksExcluded,
    citations: citationEntries,
    citationCount: citationOccurrencesCount,
    tableCount: structuralBlocksExcluded,
  };
}

function normalizeInput(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\u00a0/g, " ");
}

type TextBlock = {
  text: string;
  lines: string[];
};

function splitIntoBlocks(input: string): TextBlock[] {
  const lines = input.split("\n");
  const blocks: TextBlock[] = [];
  let currentLines: string[] = [];

  const flush = () => {
    if (currentLines.length === 0) return;
    const text = currentLines.join(" ").replace(/\s+/g, " ").trim();
    if (text) {
      blocks.push({ text, lines: currentLines.slice() });
    }
    currentLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      flush();
      continue;
    }

    const lineWordCount = countWords(trimmed);
    if (isStandaloneHeading(trimmed, lineWordCount)) {
      flush();
      blocks.push({ text: trimmed, lines: [trimmed] });
      continue;
    }

    currentLines.push(trimmed);
  }

  flush();
  return blocks;
}

function normalizeHeading(text: string): string {
  const trimmed = text.trim();
  const withoutNumbering = trimmed
    .replace(/^[0-9]+(?:[.\-][0-9]+)*\s+/, "")
    .replace(/^[ivxlcdm]+\.?\s+/i, "");
  return withoutNumbering.replace(/[:.\-]+$/, "").replace(/\s+/g, " ").toLowerCase();
}

function isHeadingStyle(styleName?: string): boolean {
  if (!styleName) return false;
  const normalized = styleName.trim().toLowerCase();
  return normalized.startsWith("heading");
}

function isBodyStartHeading(normalized: string): boolean {
  return BODY_START_KEYWORDS.includes(normalized);
}

function isBodyEndHeading(normalized: string): boolean {
  return BODY_END_KEYWORDS.includes(normalized);
}

function isStandaloneHeading(text: string, wordCount: number): boolean {
  if (!text.trim()) return false;
  if (wordCount > 12) return false;
  if (/[.!?]\s+\w/.test(text)) return false;

  const normalized = normalizeHeading(text);
  if (isBodyStartHeading(normalized) || isBodyEndHeading(normalized)) return true;

  const words = extractWords(text).filter((word) => /[A-Za-z]/.test(word));
  if (words.length === 0) return false;

  const capitalized = words.filter((word) => word[0] === word[0].toUpperCase()).length;
  const ratio = capitalized / words.length;
  return isAllCaps(words) || ratio >= 0.6;
}

function isTitleCaseParagraph(text: string): boolean {
  const words = extractWords(text).filter((word) => /[A-Za-z]/.test(word));
  if (words.length === 0) return false;
  const capitalized = words.filter((word) => word[0] === word[0].toUpperCase()).length;
  return capitalized / words.length >= 0.6;
}

function isAllCaps(words: string[]): boolean {
  let hasLetters = false;
  for (const word of words) {
    if (/[A-Za-z]/.test(word)) {
      hasLetters = true;
      if (word !== word.toUpperCase()) return false;
    }
  }
  return hasLetters;
}

function isFigureOrTableLabel(text: string): boolean {
  return FIGURE_TABLE_LABEL.test(text.trim());
}

function isLikelyCaption(text: string, wordCount: number): boolean {
  if (wordCount === 0) return false;
  if (wordCount > 40) return false;
  return true;
}

function isTableLikeBlock(lines: string[]): boolean {
  if (lines.length < 2) return false;
  const trimmedLines = lines.map((line) => line.trim()).filter(Boolean);
  if (trimmedLines.length < 2) return false;

  const pipeLines = trimmedLines.filter((line) => line.includes("|")).length;
  const tabLines = trimmedLines.filter((line) => line.includes("\t")).length;
  const multiSpaceColumns = trimmedLines.filter((line) => /\S+\s{2,}\S+/.test(line)).length;
  const borderLines = trimmedLines.filter((line) => /^[\-=+|]{3,}$/.test(line)).length;
  const numericRows = trimmedLines.filter((line) => /(\d+\s+){2,}\d+/.test(line)).length;

  const score = pipeLines + tabLines + multiSpaceColumns + borderLines + numericRows;
  return score >= Math.max(2, Math.ceil(trimmedLines.length * 0.6));
}

function stripBracketCitations(text: string): { cleanedText: string; citations: string[] } {
  let depth = 0;
  let result = "";
  let capture = "";
  const citations: string[] = [];
  let lastWasSpace = false;

  for (const char of text) {
    if (char === "[") {
      if (depth === 0) {
        capture = "";
      } else {
        capture += char;
      }
      depth += 1;
      continue;
    }

    if (char === "]") {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0) {
          const trimmed = capture.trim();
          if (trimmed && shouldStripBracket(trimmed)) {
            citations.push(trimmed);
            if (!lastWasSpace) {
              result += " ";
              lastWasSpace = true;
            }
          } else {
            result += `[${capture}]`;
            lastWasSpace = false;
          }
          capture = "";
        } else {
          capture += char;
        }
        continue;
      }
    }

    if (depth > 0) {
      capture += char;
      continue;
    }

    result += char;
    lastWasSpace = char === " ";
  }

  if (depth > 0) {
    result += `[${capture}`;
  }

  return { cleanedText: result, citations };
}

function shouldStripBracket(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\d/.test(normalized) || normalized.includes("et al") || normalized.includes("ibid");
}

const CITATION_REGEX = /([(（][^()（）]*[)）])/g;

function extractCitations(text: string): { cleanedText: string; citations: string[] } {
  const citations: string[] = [];
  const cleaned = text.replace(CITATION_REGEX, (match) => {
    const citationContent = match.slice(1, -1).trim();
    if (citationContent) {
      citations.push(citationContent);
    }
    return " ";
  });
  const { cleanedText, citations: bracketCitations } = stripBracketCitations(cleaned);
  return {
    cleanedText: cleanedText.replace(/\b(?:et al\.?|ibid\.?)\b/gi, " "),
    citations: [...citations, ...bracketCitations],
  };
}

function addCitation(map: Map<string, CitationEntry>, text: string): void {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return;
  const existing = map.get(normalized);
  if (existing) {
    existing.occurrences += 1;
    return;
  }

  map.set(normalized, {
    text: normalized,
    words: countWords(normalized),
    occurrences: 1,
  });
}

function toCitationEntries(map: Map<string, CitationEntry>): CitationEntry[] {
  return Array.from(map.values()).sort((a, b) => {
    if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
    return b.words - a.words;
  });
}

function sumCitationWords(entries: CitationEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.words * entry.occurrences, 0);
}

function extractWords(text: string): string[] {
  const matches = text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g);
  return matches ?? [];
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const isAsianLang = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(trimmed);
  if (isAsianLang) {
    return trimmed.replace(/[\s\p{P}()（）]/gu, "").length;
  }
  return trimmed.split(/\s+/).length;
}
