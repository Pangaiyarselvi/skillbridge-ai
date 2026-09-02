import { FormEvent, useState } from "react";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Badge, Button, Card, Input, Label, PageHeader, Textarea } from "../../components/ui";

interface Question {
  question: string;
  type: "technical" | "behavioral";
  idealAnswerPoints?: string[];
}

interface Evaluation {
  score: number;
  feedback: string;
  improvedAnswer?: string;
}

export default function StudentMockInterview() {
  const [targetRole, setTargetRole] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluations, setEvaluations] = useState<Record<number, Evaluation>>({});
  const { push } = useToast();

  async function generate(e: FormEvent) {
    e.preventDefault();
    if (!targetRole.trim()) return;
    setLoadingQuestions(true);
    try {
      const { data } = await api.post("/ai/mock-interview/questions", { targetRole: targetRole.trim() });
      setQuestions(data.data.questions ?? []);
      setCurrent(0);
      setEvaluations({});
      setAnswer("");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function submitAnswer(e: FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    setEvaluating(true);
    try {
      const { data } = await api.post("/ai/mock-interview/evaluate", {
        question: questions[current].question,
        answer: answer.trim(),
      });
      setEvaluations((prev) => ({ ...prev, [current]: data.data }));
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setEvaluating(false);
    }
  }

  function next() {
    setCurrent((c) => Math.min(c + 1, questions.length - 1));
    setAnswer("");
  }
  function prev() {
    setCurrent((c) => Math.max(c - 1, 0));
    setAnswer("");
  }

  return (
    <DashboardLayout>
      <PageHeader title="Mock Interview" subtitle="Practice with AI-generated questions and get instant feedback." />

      <Card className="mb-6 p-4">
        <form onSubmit={generate} className="flex flex-wrap gap-3">
          <div className="min-w-[240px] flex-1">
            <Label>Target role</Label>
            <Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Backend Developer" />
          </div>
          <div className="flex items-end">
            <Button type="submit" loading={loadingQuestions}>Generate questions</Button>
          </div>
        </form>
      </Card>

      {questions.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <Badge tone={questions[current].type === "technical" ? "brand" : "amber"}>{questions[current].type}</Badge>
            <span className="text-xs text-ink-faint">Question {current + 1} of {questions.length}</span>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-ink">{questions[current].question}</h3>

          <form onSubmit={submitAnswer} className="mt-4">
            <Label>Your answer</Label>
            <Textarea rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer here…" />
            <div className="mt-3 flex gap-2">
              <Button type="submit" loading={evaluating}>Get AI feedback</Button>
              <Button type="button" variant="outline" onClick={prev} disabled={current === 0}>Previous</Button>
              <Button type="button" variant="outline" onClick={next} disabled={current === questions.length - 1}>Next</Button>
            </div>
          </form>

          {evaluations[current] && (
            <div className="mt-5 rounded-xl border border-stroke bg-surface-2 p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-brand-600">{evaluations[current].score}/10</span>
                <span className="text-sm text-ink-muted">AI score</span>
              </div>
              <p className="mt-2 text-sm text-ink">{evaluations[current].feedback}</p>
              {evaluations[current].improvedAnswer && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-ink-muted">Suggested improved answer</p>
                  <p className="mt-1 text-sm text-ink-muted">{evaluations[current].improvedAnswer}</p>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </DashboardLayout>
  );
}
