/**
 * Simple logger utility with timestamp and level prefixes.
 */

function formatTimestamp() {
  return new Date().toISOString();
}

function formatMessage(level, message, data) {
  const prefix = {
    info: '📘 INFO',
    warn: '⚠️  WARN',
    error: '🔴 ERROR',
    debug: '🔍 DEBUG',
  }[level];

  let output = `[${formatTimestamp()}] ${prefix}: ${message}`;

  if (data !== undefined) {
    if (data instanceof Error) {
      output += `\n${data.stack || data.message}`;
    } else if (typeof data === 'object') {
      output += `\n${JSON.stringify(data, null, 2)}`;
    } else {
      output += ` ${data}`;
    }
  }

  return output;
}

const logger = {
  info(message, data) {
    console.log(formatMessage('info', message, data));
  },

  warn(message, data) {
    console.warn(formatMessage('warn', message, data));
  },

  error(message, data) {
    console.error(formatMessage('error', message, data));
  },

  debug(message, data) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      console.log(formatMessage('debug', message, data));
    }
  },

  /**
   * Log LLM-specific information (prompt, model, tokens)
   */
  llm(action, details = {}) {
    const level = details.error ? 'error' : 'info';
    const emoji = details.error ? '🔴' : '🤖';

    let message = `${emoji} LLM ${action}`;

    const parts = [];
    if (details.model) parts.push(`model=${details.model}`);
    if (details.promptLength) parts.push(`prompt_len=${details.promptLength}`);
    if (details.responseLength) parts.push(`response_len=${details.responseLength}`);
    if (details.tokensUsed) parts.push(`tokens=${details.tokensUsed}`);
    if (details.latencyMs) parts.push(`latency=${details.latencyMs}ms`);

    if (parts.length > 0) {
      message += ` [${parts.join(', ')}]`;
    }

    if (details.error) {
      this.error(message, details.error);
    } else {
      this.info(message);
    }
  },
};

module.exports = { logger };
