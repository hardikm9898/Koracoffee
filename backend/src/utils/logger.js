const pino = require("pino");

// Structured JSON logging. This is the one thing that was completely
// missing before: errorHandler caught every error but never logged it
// anywhere, so a production 500 left no trace beyond morgan's one-line
// request log (method/path/status, no message, no stack).
//
// Pretty-prints in development (readable in a terminal); plain JSON lines
// in production (the shape an actual log aggregator — CloudWatch, Datadog,
// etc. — expects). No external log-shipping service is wired up here; pipe
// stdout to whatever the deploy environment uses.
const isProduction = process.env.NODE_ENV === "production";

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
      },
});

module.exports = logger;
