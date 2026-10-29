// Create a password hash for the ADMIN_PASSWORD_HASH environment variable.
// Usage: node tools/hash-password.mjs "your new password"
import { hashPassword } from '../netlify/lib/auth.mjs';
const pw = process.argv[2];
if (!pw) { console.error('Usage: node tools/hash-password.mjs "your new password"'); process.exit(1); }
console.log(hashPassword(pw));
