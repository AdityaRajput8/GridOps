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

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [kpis, setKpis] = useState({ total_active_stores: 42, critical_stockouts: 2, cache_hit_rate: "80%", avg_latency_ms: 850 });
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
        fetchAllData();
      }
    };
    checkAuth();
  }, [router]);

  const fetchAllData = async () => {
    setIsRefreshing(true);
    try {
      const [kpiRes, storesRes, eventsRes, trendRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/metrics").catch(() => null),
        fetch("http://127.0.0.1:8000/stores/status").catch(() => null),
        fetch("http://127.0.0.1:8000/events/latest").catch(() => null),
        fetch("http://127.0.0.1:8000/stores/history").catch(() => null),
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

  useEffect(() => {
    if (loading) return;
    const interval = setInterval(fetchAllData, 15000);
    return () => clearInterval(interval);
  }, [loading]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                GRIDOPS COMMAND
              </span>
            </div>
            <nav className="flex space-x-1">
              <Link href="/" className="px-3 py-1.5 text-sm font-medium rounded-md bg-slate-800 text-white">Dashboard</Link>
              <Link href="/copilot" className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white transition">AI Copilot</Link>
              <Link href="/metrics" className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white transition">Observability</Link>
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={fetchAllData} disabled={isRefreshing} className="border-slate-700 bg-slate-900 text-slate-300">
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} /> Sync
            </Button>
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="text-slate-400 hover:text-red-400">
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Top KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Active Stores</CardTitle>
              <Store className="h-5 w-5 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpis.total_active_stores}</div>
              <p className="text-xs text-slate-500 mt-1">Real-time monitored nodes</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Critical Stockouts</CardTitle>
              <AlertTriangle className="h-5 w-5 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-rose-500">{kpis.critical_stockouts}</div>
              <p className="text-xs text-slate-500 mt-1">Depletion expected &lt; 4 hours</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Cache Hit Rate</CardTitle>
              <Zap className="h-5 w-5 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-400">{kpis.cache_hit_rate}</div>
              <p className="text-xs text-slate-500 mt-1">Upstash Semantic Vector</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Avg Query Latency</CardTitle>
              <Activity className="h-5 w-5 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpis.avg_latency_ms}ms</div>
              <p className="text-xs text-slate-500 mt-1">LangGraph execution time</p>
            </CardContent>
          </Card>
        </section>

        {/* Store Grid + Live Kafka Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Store Health Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Dark Store Inventory Health</h2>
              <Link href="/copilot">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  <Bot className="h-4 w-4 mr-2" /> Launch Copilot
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stores.map((store, idx) => (
                <Card key={idx} className={`bg-slate-900 border ${store.status === "Critical" ? "border-rose-500/60 shadow-lg shadow-rose-950/40 animate-pulse" : store.status === "Warning" ? "border-amber-500/40" : "border-slate-800"}`}>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">{store.store}</CardTitle>
                      <p className="text-xs text-slate-400">{store.city}</p>
                    </div>
                    <Badge variant="outline" className={store.status === "Critical" ? "border-rose-500 text-rose-400 bg-rose-500/10" : store.status === "Warning" ? "border-amber-500 text-amber-400 bg-amber-500/10" : "border-emerald-500 text-emerald-400 bg-emerald-500/10"}>
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
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">At-Risk SKUs</div>
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

          {/* Right: Real-Time Kafka Stream Feed */}
          <div className="border border-slate-800 bg-slate-900 rounded-lg p-4 flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="font-bold text-sm flex items-center">
                <Radio className="w-4 h-4 mr-2 text-rose-500 animate-pulse" /> Live Kafka Stream
              </h3>
              <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">inventory-events</Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {events.map((ev) => (
                <div key={ev.id} className="text-xs bg-slate-950 p-2.5 rounded border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">{ev.store}</div>
                    <div className="text-slate-400 text-[11px]">{ev.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-slate-300 font-bold">{ev.stock} units</div>
                    <div className={`text-[10px] flex items-center justify-end ${ev.change.startsWith("+") ? "text-emerald-400" : "text-rose-400"}`}>
                      {ev.change.startsWith("+") ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                      {ev.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: SKU Depletion Recharts Line Chart */}
        <section className="border border-slate-800 bg-slate-900 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold">12-Hour SKU Depletion Trend (Amul Taaza Milk 500ml)</h3>
            <p className="text-xs text-slate-400">Comparing real-time stock velocity across metro hubs</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
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