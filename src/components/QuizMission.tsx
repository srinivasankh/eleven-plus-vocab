"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { answerQuestionAction, finishQuizAction, startQuizAction } from "@/app/actions/quiz";
import { QuizCard } from "@/components/QuizCard";
import { QuizLength, QuizView } from "@/lib/types";

const questionLengths: QuizLength[] = [5, 10, 20];

function band(score: number, total: number): string {
  const ratio = score / total;
  if (ratio >= 0.85) return "Excellent";
  if (ratio >= 0.65) return "Great effort";
  if (ratio >= 0.4) return "Good start";
  return "Keep practising";
}

/** Where to pick up a saved round: the first unanswered question (or the last one). */
function resumeIndex(quiz: QuizView): number {
  const firstOpen = quiz.questions.findIndex((question) => question.chosenIndex === null);
  return firstOpen === -1 ? quiz.questions.length - 1 : firstOpen;
}

type Props = {
  initialQuizLength: QuizLength;
  /** The child's unfinished round from the server, if any. */
  activeQuiz: QuizView | null;
  /** Open the saved round straight away (Home's "Resume saved quiz mission" link). */
  resumeOnOpen?: boolean;
};

/**
 * The quiz runs on the server: it builds the questions, keeps each answer hidden until the
 * child has answered, and scores the round. This component only shows what the server says.
 */
export function QuizMission({ initialQuizLength, activeQuiz, resumeOnOpen = false }: Props) {
  const openSaved = resumeOnOpen && activeQuiz !== null;
  const [quiz, setQuiz] = useState<QuizView | null>(openSaved ? activeQuiz : null);
  const [savedQuiz, setSavedQuiz] = useState<QuizView | null>(activeQuiz);
  const [index, setIndex] = useState(openSaved && activeQuiz ? resumeIndex(activeQuiz) : 0);
  const [pendingChoice, setPendingChoice] = useState<number | null>(null);
  const [selectedLength, setSelectedLength] = useState<QuizLength>(initialQuizLength);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const questions = useMemo(() => quiz?.questions ?? [], [quiz]);
  const submitted = quiz?.status === "finished";

  const result = useMemo(() => {
    if (!quiz || quiz.status !== "finished" || quiz.score === null) return null;
    return { score: quiz.score, total: quiz.total };
  }, [quiz]);

  const reviewRows = useMemo(() => {
    if (!submitted) return [];

    return questions.map((question) => {
      const selectedWord = question.chosenIndex === null ? "No answer" : question.options[question.chosenIndex];
      const correctWord = question.correctIndex === null ? "" : question.options[question.correctIndex];

      return {
        id: `q-${question.position}`,
        prompt: question.prompt,
        selectedWord,
        correctWord,
        isCorrect: question.chosenIndex !== null && question.chosenIndex === question.correctIndex,
      };
    });
  }, [submitted, questions]);

  function createNewQuiz(length: QuizLength) {
    setError(null);
    startTransition(async () => {
      const started = await startQuizAction(length);
      if (!started.ok) {
        setError(started.error);
        return;
      }
      setQuiz(started.data);
      setSavedQuiz(null); // starting a new round replaces any saved one
      setIndex(0);
      setSelectedLength(length);
    });
  }

  function resumeQuiz() {
    if (!savedQuiz) return;
    setError(null);
    setQuiz(savedQuiz);
    setIndex(resumeIndex(savedQuiz));
  }

  async function answerQuestion(choice: number) {
    const question = quiz?.questions[index];
    if (!quiz || !question || question.chosenIndex !== null || pendingChoice !== null) return;

    setError(null);
    setPendingChoice(choice);
    const answered = await answerQuestionAction({
      attemptId: quiz.attemptId,
      position: question.position,
      chosenIndex: choice,
    });
    setPendingChoice(null);

    if (!answered.ok) {
      setError(answered.error);
      return;
    }
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((item) => (item.position === question.position ? { ...item, ...answered.data } : item)),
    });
  }

  function nextQuestion() {
    if (!quiz) return;
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      return;
    }

    setError(null);
    startTransition(async () => {
      const finished = await finishQuizAction(quiz.attemptId);
      if (!finished.ok) {
        setError(finished.error);
        return;
      }
      setQuiz(finished.data);
    });
  }

  const current = questions[index];

  return (
    <section className="page quiz quiz-shell">
      <header className="section-head page-banner">
        <h1>Quiz Missions</h1>
        <p>Pick the word that best matches each meaning.</p>
      </header>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {questions.length === 0 ? (
        <section className="panel setup-panel">
          <h2>Launch a New Mission</h2>
          <p>Choose your round size and train speed plus accuracy.</p>
          <div className="length-pills" role="group" aria-label="Quiz length options">
            {questionLengths.map((length) => (
              <button className="length-btn" disabled={busy} key={length} onClick={() => createNewQuiz(length)} type="button">
                {length} questions
              </button>
            ))}
          </div>
          {savedQuiz ? (
            <button className="cta ghost" disabled={busy} onClick={resumeQuiz} type="button">Resume Saved Quiz</button>
          ) : null}
        </section>
      ) : null}

      {current && !submitted ? (
        <>
          <QuizCard
            index={index}
            locked={current.chosenIndex !== null}
            onAnswer={answerQuestion}
            question={{
              prompt: current.prompt,
              options: current.options,
              correctOptionIndex: current.correctIndex ?? -1,
            }}
            selected={current.chosenIndex ?? pendingChoice ?? undefined}
            total={questions.length}
          />

          <div className="quiz-controls">
            <button
              className="cta"
              disabled={current.chosenIndex === null || busy}
              onClick={nextQuestion}
              type="button"
            >
              {index === questions.length - 1 ? "Finish Quiz" : "Next Question"}
            </button>
          </div>
        </>
      ) : null}

      {submitted && result ? (
        <section className="panel result-panel">
          <h2>{band(result.score, result.total)}</h2>
          <p className="score-line">You scored {result.score} out of {result.total}.</p>
          <div className="result-actions">
            <button className="cta" disabled={busy} onClick={() => createNewQuiz(selectedLength)} type="button">Try Again</button>
            <Link className="cta ghost" href="/progress">See Progress</Link>
          </div>

          <div className="quiz-review-wrap">
            <h3>Review Your Answers</h3>
            <div className="quiz-review-scroll">
              <table className="quiz-review-table">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Your Answer</th>
                    <th>Correct Answer</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.prompt}</td>
                      <td>{row.selectedWord}</td>
                      <td>{row.correctWord}</td>
                      <td>
                        <span className={row.isCorrect ? "result-badge correct" : "result-badge wrong"}>
                          {row.isCorrect ? "Correct" : "Wrong"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
}
