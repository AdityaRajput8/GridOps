"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Activity, ArrowRight, Lock, BrainCircuit, Database, Radio } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050A18] text-slate-100">
      <div className="bg-dot-grid absolute inset-0 opacity-60 pointer-events-none" />
      <div className="absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      <div className="relative grid min-h-screen lg:grid-cols-2">
        <section className="relative flex flex-col justify-between border-b border-emerald-500/15 px-6 py-8 sm:px-10 lg:border-b-0 lg:border-r lg:px-16 lg:py-14 xl:px-24">
          <div className="max-w-xl">
            <div className="mb-14 flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_#10B981] animate-pulse" />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Network live</span>
            </div>

            <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">Operations intelligence</p>
            <h1 className="text-5xl font-black tracking-[-0.07em] text-white sm:text-7xl xl:text-8xl">
              GRID<span className="text-emerald-400 emerald-text-glow">OPS</span>
            </h1>
            <p className="mt-5 text-xl font-medium tracking-tight text-slate-300 sm:text-2xl">Dark Store Intelligence Agent</p>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">Monitor every shelf signal, anticipate stockouts, and keep hyperlocal operations ahead of demand.</p>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Live SKU Depletion Trends", icon: Activity },
                { label: "AI Stockout Prediction", icon: BrainCircuit },
                { label: "Real-Time Kafka Stream", icon: Radio },
                { label: "Semantic Cache Engine", icon: Database },
              ].map(({ label, icon: Icon }, index) => (
                <div key={label} className="feature-float flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/35 p-3.5 backdrop-blur-sm transition duration-300 hover:border-emerald-400/40 hover:bg-slate-900/70" style={{ animationDelay: `${index * 350}ms` }}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/10">
                    <Icon className="h-4 w-4 text-emerald-300" />
                  </span>
                  <span className="text-xs font-semibold leading-5 text-slate-300">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 -mx-6 overflow-hidden border-y border-slate-800/80 py-3 sm:-mx-10 lg:mt-8 lg:-mx-16 xl:-mx-24">
            <div className="marquee-track flex items-center gap-7 whitespace-nowrap font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
              {["Zepto", "Blinkit", "Swiggy Instamart", "Quick Commerce", "Dark Store Ops", "Hyperlocal Intelligence", "Zepto", "Blinkit", "Swiggy Instamart", "Quick Commerce", "Dark Store Ops", "Hyperlocal Intelligence"].map((item, index) => (
                <span key={`${item}-${index}`} className="flex items-center gap-7"><span>{item}</span><span className="h-1 w-1 rounded-full bg-emerald-400" /></span>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
          <Card className="emerald-glow w-full max-w-md border-slate-700/70 bg-slate-900/80 p-2 text-slate-100 backdrop-blur-xl">
            <CardHeader className="space-y-4 pb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight text-white">Operator sign in</CardTitle>
                <CardDescription className="mt-2 text-sm text-slate-400">Authenticate to enter the GridOps command center.</CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Operator Email</label>
                  <Input type="email" placeholder="operator@gridops.internal" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 border-slate-700 bg-[#050A18]/80 px-3 text-slate-100 placeholder:text-slate-600 focus-visible:border-emerald-400 focus-visible:ring-emerald-500/30" required />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Security Credential</label>
                  <Input type="password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 border-slate-700 bg-[#050A18]/80 px-3 font-mono text-slate-100 placeholder:text-slate-600 focus-visible:border-emerald-400 focus-visible:ring-emerald-500/30" required />
                </div>

                {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-center text-xs font-medium text-rose-300">{error}</div>}

                <Button type="submit" className="mt-1 h-12 w-full bg-emerald-500 font-bold text-[#050A18] shadow-lg shadow-emerald-950/50 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/20" disabled={loading}>
                  {loading ? "Authenticating Session..." : <span className="flex items-center justify-center">Access Command Center <ArrowRight className="ml-2 h-4 w-4" /></span>}
                </Button>

                <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-500">
                  <Lock className="h-3 w-3 text-emerald-500/70" />
                  <span>Role-based access powered by Supabase Auth</span>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
