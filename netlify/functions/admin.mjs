// /api/admin/*: Website Manager API. Requires a Netlify Identity login with the
// "admin" (or "editor") role; write requests must come from this site's origin.
import { getStore } from '@netlify/blobs';
import { getUser, verifyRequestOrigin } from '@netlify/identity';
import { handleAdmin } from '../lib/cms.mjs';
import { defaults } from '../lib/defaults.mjs';

export default async (req) =>
  handleAdmin(req, {
    contentStore: getStore({ name: 'site-content', consistency: 'strong' }),
    mediaStore: getStore({ name: 'site-media', consistency: 'strong' }),
    defaults,
    getUser,
    verifyOrigin: (r) => verifyRequestOrigin(r),
  });

export const config = { path: '/api/admin/*' };
