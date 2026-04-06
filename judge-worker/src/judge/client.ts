import axios from "axios";

const judge0Client = axios.create({
  baseURL: process.env.JUDGE0_API_URL, // TODO: set JUDGE0_API_URL=https://judge029.p.rapidapi.com in .env
  timeout: 10_000,
  headers: {
    "X-RapidAPI-Host": process.env.JUDGE0_RAPIDAPI_HOST, // TODO: set JUDGE0_RAPIDAPI_HOST=judge029.p.rapidapi.com
    "X-RapidAPI-Key": process.env.JUDGE0_RAPIDAPI_KEY, // TODO: set JUDGE0_RAPIDAPI_KEY in .env — never commit this
    "Content-Type": "application/json",
  },
});

export default judge0Client;
