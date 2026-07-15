import axios from "axios";

/**
 * Axios client for Judge0 (RapidAPI). Ported from judge-worker so the monolith
 * can run the judge pipeline in-process (Economy Service Phase 1).
 */
const judge0Client = axios.create({
  baseURL: process.env.JUDGE0_API_URL,
  timeout: 10_000,
  headers: {
    "X-RapidAPI-Host": process.env.JUDGE0_RAPIDAPI_HOST,
    "X-RapidAPI-Key": process.env.JUDGE0_RAPIDAPI_KEY,
    "Content-Type": "application/json",
  },
});

export default judge0Client;
