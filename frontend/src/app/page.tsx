"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Store, 
  AlertTriangle, 
  Zap, 
  Activity, 
  LogOut, 
  Bot, 
  RefreshCw, 
  Clock, 
  Radio, 
  TrendingDown, 
  TrendingUp, 
  PackageCheck 
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

const AVAILABLE_SKUS = [
  "Amul Taaza Milk 500ml",
  "Farm Fresh Eggs 6pcs",
  "Britannia White Bread",
  "Coca Cola 500ml",
  "Lay's Classic Salted"
];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSku, setSelectedSku] = useState("Amul Taaza Milk 500ml");
  const [kpis, setKpis] = useState({ total_active_stores: 42, critical_stockouts: 2, cache_hit_rate: "82%", avg_latency_ms: 780 });
  const [stores, setStores] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        setLoading(false);
        fetchAllData(selectedSku);
      }
    };
    checkAuth();
  }, [router]);

  const fetchAllData = async (skuName = selectedSku) => {
    setIsRefreshing(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

    try {
      const [kpiRes, storesRes, eventsRes, trendRes] = await Promise.all([
        fetch(`${apiBase}/metrics`).catch(() => null),
        fetch(`${apiBase}/stores/status`).catch(() => null),
        fetch(`${apiBase}/events/latest`).catch(() => null),
        fetch(`${apiBase}/stores/history?sku=${encodeURIComponent(skuName)}`).catch(() => null),
      ]);

      if (kpiRes?.ok) setKpis(await kpiRes.json());
      if (storesRes?.ok) setStores(await storesRes.json());
      if (eventsRes?.ok) setEvents(await eventsRes.json());
      if (trendRes?.ok) setTrendData(await trendRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSkuChange = (newSku: string) => {
    setSelectedSku(newSku);
    fetchAllData(newSku);
  };

  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => fetchAllData(selectedSku), 15000);
    return () => clearInterval(interval);
  }, [loading, selectedSku]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#050A18] text-slate-100 flex flex-col">
      {/* Solid Dark Navbar */}
      <header className="border-b border-emerald-500/60 bg-[#050A18] sticky top-0 z-50 shadow-[0_1px_18px_rgba(16,185,129,0.08)]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 h-[4.5rem] flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                GRIDOPS COMMAND
              </span>
            </div>
            <nav className="flex space-x-2">
              <Link href="/" className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider bg-slate-900 text-emerald-400 border border-slate-800 rounded-md">
                Dashboard
              </Link>
              <Link href="/copilot" className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition">
                AI Copilot
              </Link>
              <Link href="/metrics" className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition">
                Observability
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            <Link href="/copilot">
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold">
                <Bot className="h-4 w-4 mr-1.5" /> Launch Copilot
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => fetchAllData(selectedSku)} disabled={isRefreshing} className="border-slate-800 bg-slate-900 text-slate-300">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} /> Sync
            </Button>
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="text-slate-400 hover:text-rose-400">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="bg-slate-900/90 border-slate-800 transition-all duration-500 hover:-translate-y-0.5 hover:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Stores</CardTitle>
              <Store className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{kpis.total_active_stores}</div>
              <p className="text-[11px] text-slate-500 mt-1">Real-time monitored nodes</p>
            </CardContent>
          </Card>

          <Card className={`bg-slate-900/90 border-slate-800 transition-all duration-500 hover:-translate-y-0.5 hover:border-slate-700 ${kpis.critical_stockouts > 0 ? "emerald-glow border-emerald-500/40" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">Critical Stockouts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-rose-500">{kpis.critical_stockouts}</div>
              <p className="text-[11px] text-slate-500 mt-1">Depletion expected &lt; 4 hours</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">Cache Hit Rate</CardTitle>
              <Zap className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-amber-400">{kpis.cache_hit_rate}</div>
              <p className="text-[11px] text-slate-500 mt-1">Upstash Semantic Vector</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg Agent Latency</CardTitle>
              <Activity className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{kpis.avg_latency_ms}ms</div>
              <p className="text-[11px] text-slate-500 mt-1">LangGraph ReAct loop</p>
            </CardContent>
          </Card>
        </section>

        {/* Store Grid + Live Kafka Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          <div className="lg:col-span-2 space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Dark Store Inventory Health</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {stores.map((store, idx) => (
                <Card
                  key={idx}
                  className={`bg-slate-900/90 border transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-slate-900 ${
                    store.status === "Critical"
                      ? "border-rose-500/60 shadow-lg shadow-rose-950/40"
                      : store.status === "Warning"
                      ? "border-amber-500/40"
                      : "border-slate-800"
                  }`}
                >
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">{store.store}</CardTitle>
                      <p className="text-xs text-slate-400">{store.city}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        store.status === "Critical"
                          ? "border-rose-500 text-rose-300 bg-rose-500/10 animate-pulse shadow-[0_0_0_3px_rgba(244,63,94,0.12),0_0_16px_rgba(244,63,94,0.4)]"
                          : store.status === "Warning"
                          ? "border-amber-500 text-amber-400 bg-amber-500/10"
                          : "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                      }
                    >
                      {store.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1 text-slate-500" /> Stockout Window:
                      </span>
                      <span className="font-mono font-bold text-slate-200">{store.stockout_hrs}h remaining</span>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">At-Risk SKUs</div>
                      {store.at_risk_skus.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {store.at_risk_skus.map((sku: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[10px] bg-slate-800 text-slate-300">{sku}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-400 flex items-center"><PackageCheck className="w-3.5 h-3.5 mr-1" /> Inventory Optimal</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Right: Kafka Stream */}
          <div className="border border-slate-800 bg-slate-900/90 rounded-xl p-5 flex flex-col h-[560px] shadow-xl shadow-black/10 transition-all duration-500">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider flex items-center">
                <Radio className="w-4 h-4 mr-2 text-rose-500 animate-pulse" /> Live Kafka Stream
              </h3>
              <Badge variant="outline" className="border-slate-800 text-slate-400 text-[10px]">inventory-events</Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {events.map((ev) => (
                <div key={ev.id} className="text-xs bg-slate-950 p-2.5 rounded border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">{ev.store}</div>
                    <div className="text-slate-400 text-[11px]">{ev.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-slate-200 font-bold">{ev.stock} units</div>
                    <div className={`text-[10px] flex items-center justify-end font-mono ${ev.change.startsWith("+") ? "text-emerald-400" : "text-rose-400"}`}>
                      {ev.change.startsWith("+") ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                      {ev.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: SKU Trend Chart with Dropdown */}
        <section className="border border-slate-800 bg-slate-900/90 rounded-xl p-7 shadow-xl shadow-black/10 transition-all duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 mb-6 gap-3">
            <div>
              <h3 className="text-base font-bold">12-Hour Stock Velocity & Depletion Forecast</h3>
              <p className="text-xs text-slate-400 mt-0.5">Cross-metro hub inventory comparison</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium">Select SKU:</span>
              <select
                value={selectedSku}
                onChange={(e) => handleSkuChange(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {AVAILABLE_SKUS.map((sku) => (
                  <option key={sku} value={sku}>{sku}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }} />
                <Legend />
                <Line type="monotone" dataKey="Zepto Mumbai" stroke="#f43f5e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Blinkit Delhi" stroke="#38bdf8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Instamart Bangalore" stroke="#a855f7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </main>
    </div>
  );
}
