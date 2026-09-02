import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  RadialBarChart, RadialBar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { api } from "../../lib/api";
import DashboardLayout from "../../components/layout/DashboardLayout";

interface Recommendation {
  opportunity: { id: string; title: string };
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export default function StudentAIHub() {
  const [readiness, setReadiness] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetRole, setTargetRole] = useState("");
  const [skillGap, setSkillGap] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const [readinessRes, recRes] = await Promise.all([
        api.get("/ai/readiness-score"),
        api.get("/ai/recommendations"),
      ]);
      setReadiness(readinessRes.data.data.placementReadinessScore);
      setRecommendations(recRes.data.data);
      setLoading(false);
    })();
  }, []);

  async function runSkillGap() {
    if (!targetRole) return;
    const { data } = await api.post("/ai/skill-gap", { targetRole });
    setSkillGap(data.data);
  }

  const readinessChartData = [{ name: "Readiness", value: readiness ?? 0, fill: "#6D5EF0" }];
  const matchChartData = recommendations.slice(0, 6).map((r) => ({
    name: r.opportunity.title.slice(0, 18),
    match: r.score,
  }));

  return (
    <DashboardLayout>
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl md:text-3xl font-bold text-ink mb-6"
      >
        AI Career Hub
      </motion.h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Placement Readiness Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel rounded-2xl shadow-card border border-stroke p-6 flex flex-col items-center"
        >
          <h2 className="font-semibold text-ink mb-2">Placement Readiness</h2>
          <ResponsiveContainer width="100%" height={180}>
            <RadialBarChart innerRadius="70%" outerRadius="100%" data={readinessChartData} startAngle={90} endAngle={-270}>
              <RadialBar background dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="text-3xl font-bold text-accent-600 -mt-4">
            {loading ? "…" : `${readiness}%`}
          </p>
        </motion.div>

        {/* Top Opportunity Matches */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel rounded-2xl shadow-card border border-stroke p-6 lg:col-span-2"
        >
          <h2 className="font-semibold text-ink mb-4">Top AI-Matched Opportunities</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={matchChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="match" fill="#6D5EF0" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Recommendation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {recommendations.map((rec, i) => (
          <motion.div
            key={rec.opportunity.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="glass-panel rounded-xl border border-stroke p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
          >
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-ink">{rec.opportunity.title}</h3>
              <span className="text-sm font-bold text-accent-600">{rec.score}% match</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {rec.matchedSkills.slice(0, 4).map((s) => (
                <span key={s} className="text-xs bg-growth-soft text-growth px-2 py-0.5 rounded-full">{s}</span>
              ))}
              {rec.missingSkills.slice(0, 2).map((s) => (
                <span key={s} className="text-xs bg-warn-soft text-warn px-2 py-0.5 rounded-full">missing: {s}</span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Skill Gap Engine */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-panel rounded-2xl border border-stroke p-6 mt-6 shadow-card"
      >
        <h2 className="font-semibold text-ink mb-3">Skill Gap Analysis</h2>
        <div className="flex gap-2 mb-4">
          <input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Frontend Developer"
            className="flex-1 border border-stroke-strong rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={runSkillGap}
            className="bg-brand-gradient text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-glow hover:brightness-105"
          >
            Analyze
          </button>
        </div>
        {skillGap && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-growth mb-1">Matching skills</p>
              <ul className="list-disc list-inside text-ink-muted">
                {skillGap.matchingSkills.map((s: string) => <li key={s}>{s}</li>)}
              </ul>
            </div>
            <div>
              <p className="font-medium text-warn mb-1">Missing skills (gap score {skillGap.gapScore}%)</p>
              <ul className="list-disc list-inside text-ink-muted">
                {skillGap.missingSkills.map((s: string) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
