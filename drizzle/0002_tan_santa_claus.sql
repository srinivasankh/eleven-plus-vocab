CREATE TABLE "learned_word" (
	"child_id" uuid NOT NULL,
	"headword" text NOT NULL,
	"learned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learned_word_child_id_headword_pk" PRIMARY KEY("child_id","headword")
);
--> statement-breakpoint
CREATE TABLE "quiz_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"total" integer NOT NULL,
	"score" integer NOT NULL,
	"finished_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_attempt_total_check" CHECK ("quiz_attempt"."total" in (5, 10, 20)),
	CONSTRAINT "quiz_attempt_score_check" CHECK ("quiz_attempt"."score" between 0 and "quiz_attempt"."total")
);
--> statement-breakpoint
ALTER TABLE "child" ADD COLUMN "preferred_quiz_length" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "learned_word" ADD CONSTRAINT "learned_word_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_attempt_child_finished_idx" ON "quiz_attempt" USING btree ("child_id","finished_at");--> statement-breakpoint
ALTER TABLE "child" ADD CONSTRAINT "child_preferred_quiz_length_check" CHECK ("child"."preferred_quiz_length" in (5, 10, 20));