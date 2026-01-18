// Logger with Brazilian timezone

function getTimestamp() {
  return new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const logger = {
  log(tag, message) {
    console.log(`[${getTimestamp()}] [${tag}] ${message}`);
  },
  warn(tag, message) {
    console.warn(`[${getTimestamp()}] [${tag}] ${message}`);
  },
  error(tag, message) {
    console.error(`[${getTimestamp()}] [${tag}] ${message}`);
  },
};
