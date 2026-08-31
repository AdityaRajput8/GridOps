"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Activity, Terminal, CheckCircle2, History, RefreshCw, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface TraceStep {
  step: string;
  detail: string;
  latency: string;
}

interface Message {
  role: "user" | "ai";
  content: string;
  traces?: TraceStep[];
}

export default function CopilotPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentTraces, setCurrentTraces] = useState<TraceStep[]>([]);
  const [pastQueries, setPastQueries] = useState<any[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const activeTracesRef = useRef<TraceStep[]>([]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("query_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6);
    if (data) setPastQueries(data);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/chat");

    ws.onopen = () => console.log("Connected to GridOps Agent WebSocket");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "trace") {
        const newTrace: TraceStep = { step: data.step, detail: data.detail, latency: data.latency };
        activeTracesRef.current = [...activeTracesRef.current, newTrace];
        setCurrentTraces([...activeTracesRef.current]);
      } else if (data.type === "token") {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          
          if (lastIndex >= 0 && updated[lastIndex].role === "ai") {
            // FIX: Deep copy the object to prevent React Strict Mode double-mutation
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: updated[lastIndex].content + data.content
            };
          }
          return updated;
        });
      } else if (data.type === "done") {
        setIsTyping(false);
        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].role === "ai") {
            updated[lastIndex] = { ...updated[lastIndex], traces: [...activeTracesRef.current] };
          }
          return updated;
        });
        activeTracesRef.current = [];
        loadHistory();
      }
    };

    wsRef.current = ws;
    return () => {
      ws.close();
    };
  }, []);

  const sendQuery = (queryText: string) => {
    if (!queryText.trim() || !wsRef.current || isTyping) return;

    activeTracesRef.current = [];
    setCurrentTraces([]);
    setIsTyping(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: queryText },
      { role: "ai", content: "", traces: [] }
    ]);

    wsRef.current.send(JSON.stringify({ message: queryText }));
    setInput("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/60 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                GRIDOPS COMMAND
              </span>
            </div>
            <nav className="flex space-x-1">
              <Link href="/" className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white transition">Dashboard</Link>
              <Link href="/copilot" className="px-3 py-1.5 text-sm font-medium bg-slate-800 text-white rounded-md">AI Copilot</Link>
              <Link href="/metrics" className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white transition">Observability</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-4rem)]">
        
        <div className="hidden lg:flex flex-col border border-slate-800 bg-slate-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center text-slate-300 text-sm">
              <History className="w-4 h-4 mr-2 text-indigo-400" /> Recent Supabase Logs
            </h3>
            <button onClick={loadHistory} className="text-slate-500 hover:text-slate-300">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 overflow-y-auto pr-1">
            {pastQueries.map((item) => (
              <div
                key={item.id}
                onClick={() => sendQuery(item.query)}
                className="text-xs bg-slate-950 p-3 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer transition"
              >
                <p className="text-slate-200 font-medium line-clamp-2">{item.query}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-slate-500">
                  <Badge variant="outline" className={item.cache_hit ? "border-emerald-500/30 text-emerald-400" : "border-indigo-500/30 text-indigo-400"}>
                    {item.cache_hit ? "Cache Hit" : "Agent Run"}
                  </Badge>
                  <span>{item.latency_ms}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col border border-slate-800 bg-slate-900 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
            <div className="flex items-center">
              <Bot className="w-5 h-5 text-indigo-400 mr-2" />
              <h2 className="font-semibold text-slate-200">Supply Chain Reasoning Agent</h2>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">
              Live WebSocket
            </Badge>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {messages.length === 0 && (
                <div className="text-center py-24 text-slate-500 space-y-3">
                  <Bot className="w-12 h-12 mx-auto opacity-30 text-indigo-400" />
                  <p className="text-sm">Ask any question to trigger the LangGraph supply chain pipeline.</p>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[90%] p-4 rounded-xl text-sm leading-relaxed ${
                    msg.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-950 text-slate-200 border border-slate-800 prose prose-invert max-w-none"
                  }`}>
                    {msg.role === "ai" ? (
                      <ReactMarkdown>
                        {msg.content || (isTyping && idx === messages.length - 1 ? "Analyzing telemetry..." : "")}
                      </ReactMarkdown>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>

                  {msg.role === "ai" && ((msg.traces && msg.traces.length > 0) || (isTyping && idx === messages.length - 1 && currentTraces.length > 0)) && (
                    <div className="mt-2.5 w-[90%] bg-slate-950/90 rounded-lg border border-slate-800 p-3 font-mono text-xs text-slate-400">
                      <div className="flex items-center text-slate-500 mb-2 font-semibold">
                        <Terminal className="w-3.5 h-3.5 mr-2 text-indigo-400" /> Agent Execution Trace
                      </div>
                      {(msg.traces || currentTraces).map((tr, i) => (
                        <div key={i} className="flex items-center justify-between py-1 border-b border-slate-900 last:border-0">
                          <span className="flex items-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mr-2" />
                            <span className="text-slate-300 font-semibold">{tr.step}</span>
                            <span className="mx-2 text-slate-600">→</span>
                            <span className="text-indigo-300">{tr.detail}</span>
                          </span>
                          <span className="text-slate-500 font-mono">{tr.latency}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <form onSubmit={(e) => { e.preventDefault(); sendQuery(input); }} className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., Which dark store in Mumbai has high stockout risk?"
                className="bg-slate-900 border-slate-800 focus-visible:ring-indigo-500 text-sm"
                disabled={isTyping}
              />
              <Button type="submit" disabled={isTyping || !input.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>

        <div className="hidden lg:flex flex-col border border-slate-800 bg-slate-900/50 rounded-lg p-4 space-y-4">
          <h3 className="font-semibold flex items-center text-slate-300 text-sm">
            <Activity className="w-4 h-4 mr-2 text-cyan-400" /> Live Architecture Metrics
          </h3>
          <Card className="bg-slate-950 border-slate-800">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">Agent Pipeline</span>
              <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30">LangGraph v2</Badge>
            </CardContent>
          </Card>
          <Card className="bg-slate-950 border-slate-800">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">Semantic Cache</span>
              <span className="text-sm font-bold text-emerald-400 flex items-center">
                <Zap className="w-3.5 h-3.5 mr-1" /> Active
              </span>
            </CardContent>
          </Card>
          <Card className="bg-slate-950 border-slate-800">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">Vector Store</span>
              <span className="text-sm font-mono text-cyan-400">Qdrant Cloud</span>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}