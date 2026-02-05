import { QuizQuestion } from "@/lib/types";

type Props = {
  question: QuizQuestion;
  index: number;
  total: number;
  selected: number | undefined;
  onAnswer: (choice: number) => void;
  locked: boolean;
};

export function QuizCard({ question, index, total, selected, onAnswer, locked }: Props) {
  return (
    <section className="quiz-card" aria-live="polite">
      <p className="quiz-progress">Question {index + 1} of {total}</p>
      <h2>Pick the word that matches this meaning:</h2>
      <p className="quiz-prompt">{question.prompt}</p>
      <div className="quiz-options">
        {question.options.map((option, optionIndex) => {
          const chosen = selected === optionIndex;
          return (
            <button
              className={chosen ? "option-btn selected" : "option-btn"}
              disabled={locked}
              key={option}
              onClick={() => onAnswer(optionIndex)}
              type="button"
            >
              {option}
            </button>
          );
        })}
      </div>
    </section>
  );
}
