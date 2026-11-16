// Serves the web build from sunsteps.eu and sends every other host there:
// www.sunsteps.eu and the old fettle-life.com domains get a permanent
// redirect that keeps the path and query. *.workers.dev (including preview
// aliases) is served as-is so previews keep working.
const CANONICAL_HOST = 'sunsteps.eu';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname !== CANONICAL_HOST && !url.hostname.endsWith('.workers.dev')) {
      url.protocol = 'https:';
      url.hostname = CANONICAL_HOST;
      url.port = '';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
