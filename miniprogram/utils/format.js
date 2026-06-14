function formatScore(score) {
  if (typeof score !== 'number') return '-';
  return (score * 100).toFixed(1) + '%';
}

function formatPercent(value) {
  if (typeof value !== 'number') return '-';
  return value.toFixed(1) + '%';
}

function formatNumber(value, decimals = 2) {
  if (typeof value !== 'number') return '-';
  return value.toFixed(decimals);
}

function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

module.exports = {
  formatScore,
  formatPercent,
  formatNumber,
  formatDate,
  formatTime,
};