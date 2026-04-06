import axios from "axios";
import { logger } from "../logger";
import { BackendApiError } from "../errors";

const backendClient = axios.create({
  baseURL: process.env.BACKEND_API_URL, // TODO: set BACKEND_API_URL in .env (e.g. http://localhost:3000)
  timeout: 8_000,
  headers: {
    Authorization: `Bearer ${process.env.BACKEND_INTERNAL_SECRET}`, // TODO: set BACKEND_INTERNAL_SECRET in .env — shared secret with api-http
    "Content-Type": "application/json",
  },
});

backendClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status >= 500) {
      const endpoint = error.config?.url ?? "unknown";
      logger.error(
        { statusCode: error.response.status, endpoint },
        "Backend 5xx error"
      );
      throw new BackendApiError(error.response.status, endpoint);
    }
    return Promise.reject(error);
  }
);

export default backendClient;
