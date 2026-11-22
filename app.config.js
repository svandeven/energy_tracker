/* global __dirname */
const { execFileSync } = require('node:child_process');

/**
 * The number Settings shows for the JavaScript that's running: the commit
 * count, so it rises with every merge without anyone bumping it, with a '+'
 * for uncommitted changes. Worked out wherever `eas update` or the web export
 * runs. EAS build machines don't have the git history, so it's null there and
 * the native build number identifies that code instead.
 */
function updateNumber() {
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  try {
    if (git('rev-parse', '--is-shallow-repository') === 'true') return null;
    const count = git('rev-list', '--count', 'HEAD');
    return git('status', '--porcelain') ? `${count}+` : count;
  } catch {
    return null;
  }
}

// Everything else is in app.json, which Expo passes in as `config`.
module.exports = ({ config }) => ({
  ...config,
  extra: { ...config.extra, updateNumber: updateNumber() },
});
