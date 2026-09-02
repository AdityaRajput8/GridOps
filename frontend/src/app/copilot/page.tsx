"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Activity, Terminal, CheckCircle2, History, RefreshCw, Zap, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface TraceStep {
  step: string;
  detail: string;
  latency: string;
}

interface Message {
  role: "user" | "ai";
  content: string;
  traces: TraceStep[];
}

export default function CopilotPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [liveTraces, setLiveTraces] = useState<TraceStep[]>([]);
  const [pastQueries, setPastQueries] = useState<any[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const accumulatedTraces = useRef<TraceStep[]>([]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("query_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8);
    if (data) setPastQueries(data);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL 
      ? `${process.env.NEXT_PUBLIC_WS_URL}/ws/chat` 
      : "ws://127.0.0.1:8000/ws/chat";

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => console.log("Connected to GridOps LangGraph Pipeline");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "trace") {
        const step: TraceStep = { step: data.step, detail: data.detail, latency: data.latency };
        accumulatedTraces.current.push(step);
        setLiveTraces([...accumulatedTraces.current]);
      } else if (data.type === "token") {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "ai") {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + data.content,
              traces: [...accumulatedTraces.current],
            };
          }
          return updated;
        });
      } else if (data.type === "done") {
        setIsTyping(false);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "ai") {
            updated[updated.length - 1] = {
              ...last,
              traces: [...accumulatedTraces.current],
            };
          }
          return updated;
        });
        accumulatedTraces.current = [];
        setLiveTraces([]);
        loadHistory();
      }
    };

    wsRef.current = ws;
    return () => ws.close();
  }, []);

  const sendQuery = (queryText: string) => {
    if (!queryText.trim() || !wsRef.current || isTyping) return;

    accumulatedTraces.current = [];
    setLiveTraces([]);
    setIsTyping(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: queryText, traces: [] },
      { role: "ai", content: "", traces: [] },
    ]);

    wsRef.current.send(JSON.stringify({ message: queryText }));
    setInput("");
  };

  return (
    <div className="min-h-screen bg-[#050A18] text-slate-100 flex flex-col">
      {/* Solid Dark Navbar */}
      <header className="border-b border-emerald-500/60 bg-[#050A18] sticky top-0 z-50 shadow-[0_1px_18px_rgba(16,185,129,0.08)]">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                GRIDOPS COMMAND
              </span>
            </div>
            <nav className="flex space-x-2">
              <Link href="/" className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition">
                Dashboard
              </Link>
              <Link href="/copilot" className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider bg-slate-900 text-emerald-400 border border-slate-800 rounded-md">
                AI Copilot
              </Link>
              <Link href="/metrics" className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition">
                Observability
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs py-1">
              LangGraph WebSocket Active
            </Badge>
          </div>
        </div>
      </header>

      {/* 3-Column Layout */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-4rem)]">
        {/* Left: History */}
        <div className="hidden lg:flex flex-col border border-slate-800 bg-slate-900/60 rounded-xl p-4 overflow-hidden shadow-xl shadow-black/10">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <h3 className="font-semibold flex items-center text-slate-300 text-xs tracking-wider uppercase">
              <History className="w-3.5 h-3.5 mr-2 text-emerald-400" /> Supabase Audit Logs
            </h3>
            <button onClick={loadHistory} className="text-slate-500 hover:text-slate-300 transition">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-2">
              {pastQueries.map((item) => (
                <div
                  key={item.id}
                  onClick={() => sendQuery(item.query)}
                  className="text-xs bg-slate-950 p-3 rounded-lg border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition group"
                >
                  <p className="text-slate-300 font-medium line-clamp-2 group-hover:text-emerald-300 transition">
                    {item.query}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900 text-[11px] text-slate-500">
                    <Badge variant="outline" className={item.cache_hit ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.18)]" : "border-amber-400/60 bg-amber-400/15 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.14)]"}>
                      {item.cache_hit ? "Cache Hit" : "Agent Run"}
                    </Badge>
                    <span className="font-mono">{item.latency_ms}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Center: Streaming Chat */}
        <div className="lg:col-span-2 flex flex-col border border-slate-800 bg-slate-900/80 rounded-xl overflow-hidden shadow-2xl shadow-black/30">
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Autonomous Supply Chain Copilot
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Model: Gemini 2.5 Flash</span>
          </div>

          <ScrollArea className="scanlines flex-1 p-5">
            <div className="space-y-6">
              {messages.length === 0 && (
                <div className="text-center py-20 text-slate-500 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-emerald-500 opacity-60" />
                  </div>
                  <p className="text-xs max-w-xs mx-auto text-slate-400">
                    Ask any inventory, stockout window, or dark store telemetry question to invoke the LangGraph pipeline.
                  </p>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[90%] p-4 rounded-xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-emerald-600 text-slate-950 font-medium"
                        : "bg-slate-950 text-slate-200 border border-slate-800 font-mono text-[13px] shadow-inner"
                    }`}
                  >
                    {msg.role === "ai" ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>
                          {msg.content || (isTyping && idx === messages.length - 1 ? "Executing LangGraph pipeline..." : "")}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div>{msg.content}</div>
                    )}
                  </div>

                  {/* Agent Execution Trace Section */}
                  {msg.role === "ai" && (msg.traces.length > 0 || (isTyping && idx === messages.length - 1 && liveTraces.length > 0)) && (
                    <div className="mt-2.5 w-[90%] bg-slate-950 rounded-lg border border-slate-800/90 p-3 font-mono text-xs shadow-inner">
                      <div className="flex items-center text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                        <Terminal className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> LangGraph Execution Trace
                      </div>
                      <div className="relative space-y-0 before:absolute before:bottom-4 before:left-[7px] before:top-4 before:w-px before:bg-gradient-to-b before:from-emerald-400/60 before:via-slate-700 before:to-transparent">
                        {(msg.traces.length > 0 ? msg.traces : liveTraces).map((tr, i) => (
                          <div key={i} className="relative flex items-center justify-between gap-3 py-2 pl-6 pr-2 transition-colors duration-300 hover:bg-slate-900/60">
                            <CheckCircle2 className="absolute left-0 z-10 h-3.5 w-3.5 rounded-full bg-slate-950 text-emerald-400" />
                            <span className="min-w-0">
                              <span className="text-slate-200 font-semibold">{tr.step}</span>
                              <span className="mx-2 text-slate-600">→</span>
                              <span className="text-emerald-300/90">{tr.detail}</span>
                            </span>
                            {tr.latency && <span className="shrink-0 text-slate-500 text-[10px]">{tr.latency}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-3 bg-slate-950 border-t border-slate-800">
            <form onSubmit={(e) => { e.preventDefault(); sendQuery(input); }} className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., Which store in Mumbai has critical stockout risk?"
                className="bg-slate-900 border-slate-800 focus-visible:ring-emerald-500 text-sm h-11"
                disabled={isTyping}
              />
              <Button type="submit" disabled={isTyping || !input.trim()} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-11 px-5">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Right: Architecture Metrics */}
        <div className="hidden lg:flex flex-col border border-slate-800 bg-slate-900/60 rounded-xl p-4 space-y-3 shadow-xl shadow-black/10">
          <h3 className="font-semibold flex items-center text-slate-300 text-xs tracking-wider uppercase">
            <Activity className="w-3.5 h-3.5 mr-2 text-cyan-400" /> Pipeline Topology
          </h3>

          <Card className="bg-slate-950 border-slate-800">
            <CardContent className="p-3.5 flex items-center justify-between">
              <span className="text-xs text-slate-400">Agent Framework</span>
              <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-mono text-[10px]">
                LangGraph v2
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-slate-950 border-slate-800">
            <CardContent className="p-3.5 flex items-center justify-between">
              <span className="text-xs text-slate-400">Semantic Cache</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center font-mono">
                <Zap className="w-3 h-3 mr-1" /> Upstash Vector (0.97)
              </span>
            </CardContent>
          </Card>

          <Card className="bg-slate-950 border-slate-800">
            <CardContent className="p-3.5 flex items-center justify-between">
              <span className="text-xs text-slate-400">Vector Store</span>
              <span className="text-xs font-mono text-cyan-400">Qdrant Cloud</span>
            </CardContent>
          </Card>

          <Card className="bg-slate-950 border-slate-800">
            <CardContent className="p-3.5 flex items-center justify-between">
              <span className="text-xs text-slate-400">Live Simulator</span>
              <span className="text-xs font-mono text-amber-400">APScheduler (30s)</span>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
