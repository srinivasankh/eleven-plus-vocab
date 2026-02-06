"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QuizCard } from "@/components/QuizCard";
import { useProgressState } from "@/hooks/useProgressState";
import { generateQuizQuestions, questionForEntry, scoreQuiz } from "@/lib/quiz";
import { QuizLength, QuizQuestion } from "@/lib/types";
import { getVocabEntries } from "@/lib/vocabData";

const entries = getVocabEntries();
const questionLengths: QuizLength[] = [5, 10, 20];

function band(score: number, total: number): string {
  const ratio = score / total;
  if (ratio >= 0.85) return "Excellent";
  if (ratio >= 0.65) return "Great effort";
  if (ratio >= 0.4) return "Good start";
  return "Keep practising";
}

function QuizPageContent() {
  const params = useSearchParams();
  const { progress, setProgress } = useProgressState();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const selectedLength = progress?.preferences.questionsPerQuiz ?? 10;

  const canResume = Boolean(progress?.activeQuiz);
  const mode = params.get("mode");

  const result = useMemo(() => {
    if (!submitted || questions.length === 0) return null;
    return scoreQuiz(questions, answers);
  }, [submitted, questions, answers]);

  const reviewRows = useMemo(() => {
    if (!submitted || questions.length === 0) return [];

    return questions.map((question, questionIndex) => {
      const selectedIndex = answers[questionIndex];
      const selectedWord =
        typeof selectedIndex === "number" && selectedIndex >= 0
          ? question.options[selectedIndex]
          : "No answer";
      const correctWord = question.options[question.correctOptionIndex];
      const isCorrect = selectedIndex === question.correctOptionIndex;

      return {
        id: question.id,
        prompt: question.prompt,
        selectedWord,
        correctWord,
        isCorrect,
      };
    });
  }, [submitted, questions, answers]);

  function createNewQuiz(length: QuizLength) {
    const newQuestions = generateQuizQuestions(entries, length);
    setQuestions(newQuestions);
    setAnswers(new Array(newQuestions.length).fill(-1));
    setIndex(0);
    setSubmitted(false);

    if (!progress) return;
    setProgress({
      ...progress,
      preferences: {
        questionsPerQuiz: length,
      },
      activeQuiz: {
        questionIndex: 0,
        answers: new Array(newQuestions.length).fill(-1),
        questionIds: newQuestions.map((question) => question.id),
      },
    });
  }

  function resumeQuiz() {
    if (!progress?.activeQuiz) return;

    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    const rebuilt = progress.activeQuiz.questionIds
      .map((id) => Number(id.replace("q-", "")))
      .map((id) => byId.get(id))
      .filter((entry): entry is (typeof entries)[number] => Boolean(entry))
      .map((entry) => questionForEntry(entry, entries));

    if (rebuilt.length === 0) {
      createNewQuiz(selectedLength);
      return;
    }

    setQuestions(rebuilt);
    setAnswers(progress.activeQuiz.answers);
    setIndex(progress.activeQuiz.questionIndex);
    setSubmitted(false);
  }

  function answerQuestion(choice: number) {
    const nextAnswers = [...answers];
    nextAnswers[index] = choice;
    setAnswers(nextAnswers);

    if (!progress) return;
    setProgress({
      ...progress,
      activeQuiz: {
        questionIndex: index,
        answers: nextAnswers,
        questionIds: questions.map((question) => question.id),
      },
    });
  }

  function nextQuestion() {
    if (index + 1 < questions.length) {
      const nextIndex = index + 1;
      setIndex(nextIndex);

      if (!progress) return;
      setProgress({
        ...progress,
        activeQuiz: {
          questionIndex: nextIndex,
          answers,
          questionIds: questions.map((question) => question.id),
        },
      });
      return;
    }

    setSubmitted(true);

    if (!progress) return;
    const score = scoreQuiz(questions, answers);
    setProgress({
      ...progress,
      quizHistory: [...progress.quizHistory, { ts: new Date().toISOString(), ...score }],
      activeQuiz: undefined,
    });
  }

  const current = questions[index];

  return (
    <section className="page quiz quiz-shell">
      <header className="section-head page-banner">
        <h1>Quiz Missions</h1>
        <p>Pick the word that best matches each meaning.</p>
      </header>

      {questions.length === 0 ? (
        <section className="panel setup-panel">
          <h2>Launch a New Mission</h2>
          <p>Choose your round size and train speed plus accuracy.</p>
          <div className="length-pills" role="group" aria-label="Quiz length options">
            {questionLengths.map((length) => (
              <button className="length-btn" key={length} onClick={() => createNewQuiz(length)} type="button">
                {length} questions
              </button>
            ))}
          </div>
          {canResume || mode === "resume" ? (
            <button className="cta ghost" onClick={resumeQuiz} type="button">Resume Saved Quiz</button>
          ) : null}
        </section>
      ) : null}

      {current && !submitted ? (
        <>
          <QuizCard
            index={index}
            locked={answers[index] !== -1}
            onAnswer={answerQuestion}
            question={current}
            selected={answers[index] === -1 ? undefined : answers[index]}
            total={questions.length}
          />

          <div className="quiz-controls">
            <button
              className="cta"
              disabled={answers[index] === -1}
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
            <button className="cta" onClick={() => createNewQuiz(selectedLength)} type="button">Try Again</button>
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

export default function QuizPage() {
  return (
    <Suspense fallback={<section className="page quiz"><p>Loading quiz...</p></section>}>
      <QuizPageContent />
    </Suspense>
  );
}
