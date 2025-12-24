"use client";

import FloatingLines from "@/components/FloatingLines";
import RotatingText from "@/components/RotatingText";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Liquid } from "@/components/uilayouts/liquid-gradient";
import ProfileCard from "@/components/ProfileCard";
import type { BodyParseResult, CitationEntry } from "@/app/lib/academicParser";
import { countAcademicWords } from "@/app/lib/docxParser";
import { FileText, Layers, Search, ShieldCheck, UploadCloud } from "lucide-react";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";

const FLOATING_LINES_GRADIENT = ["#7ad8ff", "#8ac1ff", "#7d64ff", "#d68cff"];
const FLOATING_LINES_WAVES = ["top", "middle", "bottom"];
const FLOATING_LINES_COUNT = [6, 4, 6];
const FLOATING_LINES_DISTANCE = [5, 8, 5];
const FLOATING_LINES_TOP_POS = { x: 10, y: 0.5, rotate: -0.4 };
const FLOATING_LINES_MIDDLE_POS = { x: 5, y: 0, rotate: 0.2 };
const FLOATING_LINES_BOTTOM_POS = { x: 2, y: -0.7, rotate: -1 };

export default function Home() {
  const [activeTab, setActiveTab] = useState<"text" | "docx">("text");
  const [textInput, setTextInput] = useState("");
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [result, setResult] = useState<BodyParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCounting, setIsCounting] = useState(false);
  const [citationSearch, setCitationSearch] = useState("");
  const [citationExclusions, setCitationExclusions] = useState<Record<string, boolean>>({});
  const [isLiquidHovered, setIsLiquidHovered] = useState(false);

  const canCount = activeTab === "text" ? textInput.trim().length > 0 : Boolean(docxFile);
  const statusLabel = isCounting
    ? "Counting..."
    : error
      ? "Check Input"
      : result
        ? "Ready"
        : "Awaiting Input";

  const citationCount = result?.citationCount ?? 0;
  const tableCount = result?.tableCount ?? 0;
  const excludedCitationsCount = useMemo(() => {
    if (!result) return 0;
    return result.citations.reduce((sum, citation) => {
      const isExcluded = citationExclusions[citation.text] ?? true;
      return isExcluded ? sum + citation.occurrences : sum;
    }, 0);
  }, [citationExclusions, result]);
  const includedCitationsCount = useMemo(() => {
    if (!result) return 0;
    return result.citations.reduce((sum, citation) => {
      const isExcluded = citationExclusions[citation.text] ?? true;
      return isExcluded ? sum : sum + citation.occurrences;
    }, 0);
  }, [citationExclusions, result]);
  const uniqueCitationsCount = result?.citations.length ?? 0;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setDocxFile(file);
    setError(null);
  };

  const handleCount = async () => {
    setError(null);

    if (activeTab === "text" && !textInput.trim()) {
      setError("Paste your text to count body words.");
      return;
    }

    if (activeTab === "docx" && !docxFile) {
      setError("Upload a DOCX file to count body words.");
      return;
    }

    setIsCounting(true);
    try {
      if (activeTab === "text") {
        const nextResult = await countAcademicWords({ kind: "plain", text: textInput });
        setResult(nextResult);
      } else if (docxFile) {
        const data = await docxFile.arrayBuffer();
        const nextResult = await countAcademicWords({ kind: "docx", data });
        setResult(nextResult);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while counting. Please try again.");
    } finally {
      setIsCounting(false);
    }
  };

  const handleClear = () => {
    setTextInput("");
    setDocxFile(null);
    setFileInputKey((prev) => prev + 1);
    setResult(null);
    setError(null);
    setCitationSearch("");
    setCitationExclusions({});
  };

  useEffect(() => {
    if (!result) {
      setCitationExclusions({});
      return;
    }
    const nextExclusions: Record<string, boolean> = {};
    for (const citation of result.citations) {
      nextExclusions[citation.text] = true;
    }
    setCitationExclusions(nextExclusions);
  }, [result]);

  const filteredCitations = useMemo(() => {
    if (!result) return [];
    const query = citationSearch.trim().toLowerCase();
    const sorted = [...result.citations].sort((a, b) => {
      if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
      return b.words - a.words;
    });
    if (!query) return sorted;
    return sorted.filter((citation) => citation.text.toLowerCase().includes(query));
  }, [citationSearch, result]);

  const toggleCitation = (citation: CitationEntry) => {
    setCitationExclusions((prev) => ({
      ...prev,
      [citation.text]: !(prev[citation.text] ?? true),
    }));
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#050312] via-[#140a43] to-[#080622] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_-5%,rgba(138,193,255,0.25),transparent_50%),radial-gradient(900px_circle_at_80%_10%,rgba(125,100,255,0.18),transparent_65%),radial-gradient(900px_circle_at_30%_90%,rgba(107,59,255,0.2),transparent_75%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background:linear-gradient(120deg,rgba(255,255,255,0.05),transparent_45%),linear-gradient(0deg,rgba(138,193,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(138,193,255,0.06)_1px,transparent_1px)] [background-size:320px_320px,36px_36px,36px_36px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(138,193,255,0.25),transparent_60%),radial-gradient(circle_at_bottom,rgba(125,100,255,0.18),transparent_65%)] opacity-40" />

      <div className="pointer-events-none absolute inset-0 opacity-60">
        <FloatingLines
          linesGradient={FLOATING_LINES_GRADIENT}
          enabledWaves={FLOATING_LINES_WAVES}
          lineCount={FLOATING_LINES_COUNT}
          lineDistance={FLOATING_LINES_DISTANCE}
          topWavePosition={FLOATING_LINES_TOP_POS}
          middleWavePosition={FLOATING_LINES_MIDDLE_POS}
          bottomWavePosition={FLOATING_LINES_BOTTOM_POS}
          animationSpeed={0.8}
          interactive={true}
          bendRadius={5.0}
          bendStrength={-0.5}
          mouseDamping={0.05}
          parallax={true}
          parallaxStrength={0.15}
          mixBlendMode="screen"
        />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl items-stretch gap-8 px-6 pt-24 pb-12 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.1fr)] lg:pt-28 lg:pb-16">
        <Card className="relative glow-panel h-full border border-[#7ad8ff]/35 bg-[#0f0f0f]/85 shadow-[0_0_30px_rgba(122,216,255,0.25),0_45px_100px_rgba(10,6,30,0.65)]">
          <CardHeader className="relative space-y-4 lg:pr-48">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12">
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#050312] via-[#2f1a5d] to-[#4725ae] shadow-[0_0_25px_rgba(122,216,255,0.45)]" />
                  <div className="relative z-10 flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-[#7d64ff] via-[#a754ff] to-[#ff5dc1] text-lg font-bold text-white">
                    BC
                  </div>
                </div>
                <div>
                  <p className="font-display text-xl tracking-tight">BetterCount</p>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/60">Academic body counter</p>
                </div>
              </div>
            </div>
            <div className="absolute top-4 right-4 hidden lg:block pointer-events-auto">
              <ProfileCard
                className="scale-[0.42] origin-top-right"
                avatarUrl="/code-icon.svg"
                iconUrl="/code-icon.svg"
                miniAvatarUrl="/code-icon.svg"
                name="Selim"
                title="Bored engineer"
                showUserInfo={false}
                innerGradient="linear-gradient(145deg,#321464 0%,#5c3dff 60%,#ff5dc1 100%)"
                behindGlowColor="rgba(138,193,255,0.4)"
                behindGlowSize="58%"
                onContactClick={() => {}}
              />
            </div>
            <Badge className="w-fit rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]">
              Precision Mode
            </Badge>
            <CardTitle className="mt-3 font-display flex items-center gap-2 text-[2.25rem] leading-tight text-white sm:text-[2.75rem] whitespace-nowrap">
              <span>Stop counting</span>
              <RotatingText
                texts={["citations", "tables", "captions"]}
                mainClassName="px-2 sm:px-2 md:px-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white overflow-hidden py-0.5 sm:py-1 md:py-1.5 justify-center rounded-lg text-[1.9rem] sm:text-[2.25rem]"
                staggerFrom="last"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-120%" }}
                staggerDuration={0.025}
                splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                rotationInterval={2000}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="mt-12 rounded-3xl border border-white/10 bg-black/40 p-5">
              <TooltipProvider>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "text" | "docx")} className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2 bg-white/5">
                    <TabsTrigger value="text" className="data-[state=active]:bg-white/15">
                      <FileText className="mr-2 h-4 w-4" />
                      Paste Text
                    </TabsTrigger>
                    <TabsTrigger value="docx" className="data-[state=active]:bg-white/15">
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Upload DOCX
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="text" className="space-y-3 min-h-[520px]">
                    <Textarea
                      placeholder="Paste your essay or report body here..."
                      value={textInput}
                      onChange={(event) => {
                        setTextInput(event.target.value);
                        setError(null);
                      }}
                      className="min-h-[360px] border-white/10 bg-black/40 text-white/90 placeholder:text-white/35"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-white/10 text-white/70">Plain text = citations only</Badge>
                      <Badge className="bg-white/10 text-white/70">Headings included</Badge>
                    </div>
                  </TabsContent>
                  <TabsContent value="docx" className="space-y-3 min-h-[520px]">
                    <label className="group relative flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center transition hover:border-purple-500/70 hover:bg-white/10">
                      <Input
                        key={fileInputKey}
                        type="file"
                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        onChange={handleFileChange}
                      />
                      <div className="rounded-full border border-white/20 bg-black/40 p-3">
                        <UploadCloud className="h-6 w-6 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white">
                          {docxFile ? "DOCX ready" : "Drop DOCX here"}
                        </p>
                        <p className="text-sm text-white/60">
                          {docxFile ? docxFile.name : "Best for tables and captioned figures"}
                        </p>
                      </div>
                      <Button variant="outline" className="border-white/20 text-white/80">
                        {docxFile ? "Replace File" : "Browse Files"}
                      </Button>
                    </label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <div className="h-2.5 w-2.5 rounded-full bg-purple-400" />
                          DOCX required for tables and captions
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="border-white/20 bg-black text-white">
                        DOCX keeps structural elements we cannot detect from plain text.
                      </TooltipContent>
                    </Tooltip>
                  </TabsContent>
                </Tabs>
              </TooltipProvider>

              <Separator className="my-5 bg-white/10" />

              <div className="rounded-2xl border border-[#8ac1ff]/40 bg-purple-500/10 p-4 text-sm text-purple-100">
                <strong className="text-purple-300">Important:</strong> Use DOCX when your paper contains tables or captions.
                Plain text only supports in-text citation removal.
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="relative w-full max-w-[360px]">
                  <div className="pointer-events-none absolute inset-0 rounded-full overflow-hidden border border-[#7ad8ff]/40 shadow-[0_0_25px_rgba(122,216,255,0.35)]">
                    <Liquid isHovered={isLiquidHovered} />
                    <div className="absolute inset-0 bg-gradient-to-br from-black/30 to-transparent" />
                  </div>
                  <Button
                    className="relative z-10 w-full rounded-full bg-transparent px-6 py-3 text-base font-semibold text-white backdrop-blur-lg"
                    onClick={handleCount}
                    onMouseEnter={() => setIsLiquidHovered(true)}
                    onMouseLeave={() => setIsLiquidHovered(false)}
                    disabled={!canCount || isCounting}
                  >
                    {isCounting ? "Counting..." : "Count Body Words"}
                  </Button>
                </div>
                <Button variant="outline" className="border-white/20 text-white/80" onClick={handleClear}>
                  Clear
                </Button>
              </div>
              {error ? <p className="text-sm text-red-200">{error}</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card className="glow-panel h-full border border-[#8ac1ff]/35 bg-white/5 shadow-[0_0_24px_rgba(122,216,255,0.2),0_40px_90px_rgba(0,0,0,0.45)]">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-2xl">Output Console</CardTitle>
              <Badge className="bg-white/10 text-white/70">{statusLabel}</Badge>
            </div>
            <CardDescription className="text-white/60">
              Your body-only counts and exclusions will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <p className="text-xs uppercase tracking-[0.32em] text-white/50">Citations + Tables</p>
              <p className="font-display text-5xl text-white">
                {result ? (citationCount + tableCount).toLocaleString() : "0"}
              </p>
              <p className="text-sm text-white/50">
                {result
                  ? `Citations: ${citationCount.toLocaleString()} · Tables: ${tableCount}`
                  : "Waiting for input"}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center justify-between text-sm text-white/60">
                  <span>Citations excluded</span>
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {excludedCitationsCount.toLocaleString()}
                </p>
                <p className="text-xs text-white/50">Based on toggled citations</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm text-white/60">
                  <span>Tables detected</span>
                  <Layers className="h-4 w-4 text-purple-400" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {tableCount.toLocaleString()}
                </p>
                <p className="text-xs text-white/50">Structural blocks skipped</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#07071c]/80 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white/60">
              Use Word's word counter and subtract the number of citations shown above.
            </div>
            <Separator className="bg-white/10" />
            <Tabs defaultValue="citations" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-white/5">
                <TabsTrigger value="citations" className="data-[state=active]:bg-white/15">
                  Citations
                </TabsTrigger>
                <TabsTrigger value="details" className="data-[state=active]:bg-white/15">
                  Citation Details
                </TabsTrigger>
              </TabsList>
              <TabsContent value="citations" className="space-y-3 min-h-[460px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <Input
                    placeholder="Search citations..."
                    value={citationSearch}
                    onChange={(event) => setCitationSearch(event.target.value)}
                    className="pl-9 border-white/10 bg-black/40 text-white/80 placeholder:text-white/35"
                  />
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <div className="grid grid-cols-[1.4fr_0.6fr_0.8fr_0.7fr] border-b border-white/10 text-xs uppercase tracking-[0.2em] text-white/40">
                    <div className="px-4 py-3">In-text citation</div>
                    <div className="px-4 py-3">Words</div>
                    <div className="px-4 py-3">Occurrences</div>
                    <div className="px-4 py-3">Exclude</div>
                  </div>
                  {filteredCitations.length === 0 ? (
                    <div className="px-4 py-5 text-sm text-white/50">
                      {result ? "No citations detected yet." : "Run a count to list citations."}
                    </div>
                  ) : (
                    filteredCitations.map((citation) => {
                      const isExcluded = citationExclusions[citation.text] ?? true;
                      return (
                        <div
                          key={citation.text}
                          className="grid grid-cols-[1.4fr_0.6fr_0.8fr_0.7fr] items-center border-b border-white/10 last:border-b-0"
                        >
                          <div className="px-4 py-3 text-sm text-white/80">{citation.text}</div>
                          <div className="px-4 py-3 text-sm text-white/70">{citation.words}</div>
                          <div className="px-4 py-3 text-sm text-white/70">{citation.occurrences}</div>
                          <div className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => toggleCitation(citation)}
                              className={`relative h-6 w-11 rounded-full border transition ${isExcluded ? "border-[#8ac1ff]/70 bg-gradient-to-r from-[#7d64ff] to-[#ff5dc1] shadow-[0_0_12px_rgba(122,216,255,0.35)]" : "border-white/20 bg-white/10"
                                }`}
                              aria-pressed={isExcluded}
                            >
                              <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${isExcluded ? "left-[calc(100%-1.25rem)]" : "left-0.5"
                                  }`}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>
              <TabsContent value="details" className="space-y-3 min-h-[460px]">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <div className="flex items-center justify-between text-sm text-white/60">
                    <span>Total citations detected</span>
                    <span className="text-lg font-semibold text-white">
                      {uniqueCitationsCount.toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-white/50">
                    {result ? "Unique citations found in the input." : "Run a count to see citations."}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <div className="flex items-center justify-between text-sm text-white/60">
                    <span>Citations currently excluded</span>
                    <span className="text-lg font-semibold text-white">
                      {excludedCitationsCount.toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-white/50">Toggle citations to include them.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <div className="flex items-center justify-between text-sm text-white/60">
                    <span>Citations currently included</span>
                    <span className="text-lg font-semibold text-white">
                      {includedCitationsCount.toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-white/50">These will affect your manual subtraction.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/60">
                  <div className="flex items-center gap-2 text-white/70">
                    <ShieldCheck className="h-4 w-4 text-purple-400" />
                    Output notes
                  </div>
                  <ul className="mt-3 space-y-2">
                    <li>Headings count toward the final body total.</li>
                    <li>References, appendices, and everything after are ignored.</li>
                    <li>DOCX preserves tables and captions for accurate exclusion.</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
