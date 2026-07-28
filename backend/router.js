// router.js — a tiny dependency-free router for Node's built-in http module.
'use strict';

class Router {
  constructor() {
    this.routes = []; // { method, pattern: RegExp, keys: string[], handler }
  }

  _add(method, path, handler) {
    const keys = [];
    const pattern = path
      .replace(/\/:([A-Za-z0-9_]+)/g, (_, key) => {
        keys.push(key);
        return '/([^/]+)';
      });
    const regex = new RegExp(`^${pattern}$`);
    this.routes.push({ method, regex, keys, handler });
  }

  get(path, handler) { this._add('GET', path, handler); }
  post(path, handler) { this._add('POST', path, handler); }
  put(path, handler) { this._add('PUT', path, handler); }
  patch(path, handler) { this._add('PATCH', path, handler); }
  delete(path, handler) { this._add('DELETE', path, handler); }

  match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const m = route.regex.exec(pathname);
      if (!m) continue;
      const params = {};
      route.keys.forEach((key, i) => { params[key] = decodeURIComponent(m[i + 1]); });
      return { handler: route.handler, params };
    }
    return null;
  }
}

module.exports = Router;
