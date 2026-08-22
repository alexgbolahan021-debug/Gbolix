import app from "./app";
import { logger } from "./lib/logger";
import { startExchangeRateRefresh } from "./lib/exchange-rate";
import { ensureFeedbackTable } from "./lib/feedback-bootstrap";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function startServer() {
  try {
    await ensureFeedbackTable();
  } catch (err) {
    logger.error({ err }, "Unable to prepare the feedback table");
    process.exit(1);
    return;
  }

  startExchangeRateRefresh();

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

void startServer();
