CREATE TYPE "public"."quiz_status" AS ENUM('in_progress', 'finished');--> statement-breakpoint
CREATE TABLE "quiz_question" (
	"attempt_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"word_id" integer,
	"prompt" text NOT NULL,
	"options" text[] NOT NULL,
	"correct_index" integer NOT NULL,
	"chosen_index" integer,
	"answered_at" timestamp with time zone,
	CONSTRAINT "quiz_question_attempt_id_position_pk" PRIMARY KEY("attempt_id","position"),
	CONSTRAINT "quiz_question_correct_index_check" CHECK ("quiz_question"."correct_index" between 0 and cardinality("quiz_question"."options") - 1),
	CONSTRAINT "quiz_question_chosen_index_check" CHECK ("quiz_question"."chosen_index" is null or "quiz_question"."chosen_index" between 0 and cardinality("quiz_question"."options") - 1)
);
--> statement-breakpoint
ALTER TABLE "quiz_attempt" DROP CONSTRAINT "quiz_attempt_score_check";--> statement-breakpoint
ALTER TABLE "quiz_attempt" ALTER COLUMN "score" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ALTER COLUMN "finished_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ALTER COLUMN "finished_at" DROP NOT NULL;--> statement-breakpoint
-- Hand-edited before first apply: rows that already exist are finished rounds (stage 3 only
-- stored finished ones), so backfill them as 'finished' before switching the default.
ALTER TABLE "quiz_attempt" ADD COLUMN "status" "quiz_status" DEFAULT 'finished' NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ALTER COLUMN "status" SET DEFAULT 'in_progress';--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD COLUMN "started_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "quiz_attempt" SET "started_at" = "finished_at" WHERE "finished_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_question" ADD CONSTRAINT "quiz_question_attempt_id_quiz_attempt_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_question" ADD CONSTRAINT "quiz_question_word_id_word_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."word"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempt_one_in_progress_idx" ON "quiz_attempt" USING btree ("child_id") WHERE "quiz_attempt"."status" = 'in_progress';--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_finished_check" CHECK (("quiz_attempt"."status" = 'finished') = ("quiz_attempt"."score" is not null and "quiz_attempt"."finished_at" is not null));--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_score_check" CHECK ("quiz_attempt"."score" is null or "quiz_attempt"."score" between 0 and "quiz_attempt"."total");