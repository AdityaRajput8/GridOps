"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Database, RefreshCw } from "lucide-react";

export default function MetricsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("query_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const exportCSV = () => {
    if (!logs.length) return;
    const headers = "Timestamp,Query,Cache_Hit,Latency_MS\n";
    const rows = logs.map((l) => `"${l.created_at}","${l.query.replace(/"/g, '""')}",${l.cache_hit},${l.latency_ms}`);
    
    // Cleanly concatenate the string, then wrap in the array required by Blob
    const csvContent = headers + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gridops-observability-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
              <Link href="/copilot" className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white transition">AI Copilot</Link>
              <Link href="/metrics" className="px-3 py-1.5 text-sm font-medium bg-slate-800 text-white rounded-md">Observability</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">System Observability</h1>
            <p className="text-slate-400 text-sm mt-1">Live telemetry metrics streamed to Supabase</p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={fetchLogs} variant="outline" className="border-slate-700 bg-slate-900 text-slate-300">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Sync
            </Button>
            <Button onClick={exportCSV} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900">
          <Table>
            <TableHeader className="bg-slate-950/50">
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">Timestamp</TableHead>
                <TableHead className="text-slate-400">User Query</TableHead>
                <TableHead className="text-slate-400">Routing Status</TableHead>
                <TableHead className="text-slate-400 text-right">Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/50">
                  <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium max-w-md truncate text-slate-300">
                    {log.query}
                  </TableCell>
                  <TableCell>
                    {log.cache_hit ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/50">Cache Hit</Badge>
                    ) : (
                      <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/50">Agent Execution</Badge>
                    )}
                  </TableCell>
                  <TableCell className={`text-right font-mono ${log.latency_ms > 1000 ? "text-amber-400" : "text-emerald-400"}`}>
                    {log.latency_ms}ms
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No query logs recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}