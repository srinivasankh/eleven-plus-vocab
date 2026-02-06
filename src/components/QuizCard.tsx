import { QuizQuestion } from "@/lib/types";

type Props = {
  question: QuizQuestion;
  index: number;
  total: number;
  selected: number | undefined;
  onAnswer: (choice: number) => void;
  locked: boolean;
};

const labels = ["A", "B", "C", "D"];

export function QuizCard({ question, index, total, selected, onAnswer, locked }: Props) {
  return (
    <section className="quiz-card" aria-live="polite">
      <div className="quiz-top">
        <p className="quiz-progress">Question {index + 1} of {total}</p>
        <span className="quiz-stage-badge">Focus Round</span>
      </div>

      <h2>Choose the strongest match for this meaning</h2>
      <p className="quiz-prompt">{question.prompt}</p>

      <div className="quiz-options">
        {question.options.map((option, optionIndex) => {
          const chosen = selected === optionIndex;
          const isCorrectOption = optionIndex === question.correctOptionIndex;
          const isWrongSelection = locked && chosen && !isCorrectOption;
          const revealCorrect = locked && isCorrectOption;
          const className = [
            "option-btn",
            !locked && chosen ? "selected" : "",
            isWrongSelection ? "wrong" : "",
            revealCorrect ? "correct" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              className={className}
              disabled={locked}
              key={option}
              onClick={() => onAnswer(optionIndex)}
              type="button"
            >
              <span aria-hidden="true" className="option-bullet">{labels[optionIndex] ?? "?"}</span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
