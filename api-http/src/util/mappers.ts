import { ContestType, Role } from "@prisma/client";
import { Contest, ContestPhase, ContestWithQuestions } from "../schema/contest.schema";
import { generateUserBoilerplate } from "./boilerplate";
import type { BoilerplateSignature } from "./boilerplate";
import * as contestRepo from "../repositories/contest.repository";

/** Matches getContestByIdWithProblems result (dsa has signature + testCases; boilerplate derived at runtime) */
type ContestWithQuestionsDB = NonNullable<Awaited<ReturnType<typeof contestRepo.getContestByIdWithProblems>>>;

export const getContestPhase = (startTime: Date | null, endTime: Date | null): ContestPhase | undefined => {
    if (!startTime || !endTime) {
        return;
    }

    const now = new Date();
    if (now < startTime) {
        return "upcoming";
    }
    if (now >= startTime && now <= endTime) {
        return "running";
    }
    if (now > endTime) {
        return "ended";
    }
};


export const mapDBContestToContest = (contest: ContestWithQuestionsDB, includeQuestions: boolean, userRole?: Role): Contest | ContestWithQuestions => {

    // Calculate mcqCount and dsaCount
    const mcqCount = contest.questions.filter((q) => q.mcq !== null).length;
    const dsaCount = contest.questions.filter((q) => q.dsa !== null).length;

    const phase =
        contest.type === ContestType.practice
            ? "running"
            : getContestPhase(contest.startTime, contest.endTime);

    // Base contest data matching ContestSchema
    const baseContest = {
        id: contest.id,
        title: contest.title,
        description: contest.description,
        startTime: contest.startTime?.toISOString() ?? null,
        endTime: contest.endTime?.toISOString() ?? null,
        maxDurationMs: contest.maxDurationMs,
        type: contest.type,
        status: contest.status,
        phase,
        createdAt: contest.createdAt.toISOString(),
        updatedAt: contest.updatedAt.toISOString(),
        creatorId: contest.creatorId,
        mcqCount,
        dsaCount,
    };


    // If questions should be included, format them according to ContestWithQuestionsSchema
    if (includeQuestions && (userRole === Role.creator || contest.type === ContestType.practice)) {
        const formattedQuestions = contest.questions
            .sort((a, b) => a.order - b.order)
            .map((q) => {
                const questionBase = {
                    id: q.id,
                    order: q.order,
                    type: q.mcq ? "mcq" : "dsa",
                };

                if (q.mcq) {
                    // Format MCQ question
                    const mcq = {
                        id: q.id,
                        questionText: q.mcq.questionText,
                        options: Array.isArray(q.mcq.options)
                            ? q.mcq.options
                            : typeof q.mcq.options === "string"
                                ? JSON.parse(q.mcq.options)
                                : [],
                        correctOptionIndex: q.mcq.correctOptionIndex,
                        points: q.mcq.points,
                        maxDurationMs: q.mcq.maxDurationMs ?? undefined,
                        createdAt: q.mcq.createdAt.toISOString(),
                        updatedAt: q.mcq.updatedAt.toISOString(),
                        creatorId: q.mcq.creatorId,
                    };
                    return {
                        ...questionBase,
                        mcq,
                    };
                } else if (q.dsa) {
                    // Format DSA problem: derive boilerplate from signature (never stored)
                    const sig = q.dsa.signature as BoilerplateSignature | null;
                    const boilerplate =
                        sig && typeof sig === "object" && "functionName" in sig
                            ? generateUserBoilerplate(sig as BoilerplateSignature)
                            : {};
                    const dsa = {
                        id: q.id,
                        title: q.dsa.title,
                        description: q.dsa.description,
                        tags: q.dsa.tags,
                        points: q.dsa.points,
                        timeLimit: q.dsa.timeLimit,
                        memoryLimit: q.dsa.memoryLimit,
                        difficulty: q.dsa.difficulty ?? undefined,
                        maxDurationMs: q.dsa.maxDurationMs ?? undefined,
                        signature: q.dsa.signature,
                        boilerplate,
                        inputFormat: q.dsa.inputFormat ?? null,
                        outputFormat: q.dsa.outputFormat ?? null,
                        constraints: q.dsa.constraints ?? [],
                        createdAt: q.dsa.createdAt.toISOString(),
                        updatedAt: q.dsa.updatedAt.toISOString(),
                        creatorId: q.dsa.creatorId,
                        testCases: q.dsa.testCases.map((tc) => ({
                            id: tc.id,
                            input: tc.input,
                            expectedOutput: tc.expectedOutput,
                            isHidden: tc.isHidden,
                            createdAt: (tc.createdAt as Date).toISOString(),
                            problemId: tc.problemId,
                        })),
                    };
                    return {
                        ...questionBase,
                        dsa,
                    };
                }
                return questionBase;
            });

        return {
            ...baseContest,
            questions: formattedQuestions,
        } as ContestWithQuestions;
    }

    return baseContest as Contest;

}