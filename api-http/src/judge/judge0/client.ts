import axios from "axios";

/**
 * Axios client for Judge0 (RapidAPI).
 *
 * Self-Hosted Judge Phase 1: moved under `judge/judge0/` so the Judge0 transport
 * sits behind the `Executor` seam alongside the local backend that replaces it.
 * The file itself is unchanged.
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
