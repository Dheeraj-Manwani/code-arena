export interface Judge0SubmitRequest {
  language_id: number;
  source_code: string;
  stdin: string;
}

export interface Judge0SubmitResponse {
  token: string;
}

export interface Judge0StatusResponse {
  token: string;
  status: { id: number; description: string };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string | null;
  memory: number | null;
}

export interface ParseResult {
  testCasesPassed: number;
  verdict: "accepted" | "wrong_answer" | "runtime_error";
  stoppedAtCase: number | null;
}
