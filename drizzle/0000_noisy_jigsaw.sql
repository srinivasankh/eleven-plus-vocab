CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TABLE "vocab_set" (
	"number" integer PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "word" (
	"id" integer PRIMARY KEY NOT NULL,
	"set_number" integer NOT NULL,
	"word" text NOT NULL,
	"headword" text NOT NULL,
	"type" text NOT NULL,
	"meaning" text NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"synonyms" text[] NOT NULL,
	"antonyms" text[] NOT NULL,
	"examples" text[] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "word" ADD CONSTRAINT "word_set_number_vocab_set_number_fk" FOREIGN KEY ("set_number") REFERENCES "public"."vocab_set"("number") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "word_difficulty_idx" ON "word" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "word_headword_idx" ON "word" USING btree ("headword");--> statement-breakpoint
CREATE INDEX "word_set_number_idx" ON "word" USING btree ("set_number");