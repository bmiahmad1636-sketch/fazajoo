const crypto = require("crypto");
const { query } = require("../db/pool");

async function issueSessionToken(user) {
  const { createToken } = require("../utils/token");
  const sid = crypto.randomUUID();
  await query(`INSERT INTO auth_sessions (id, user_id, auth_version)
               VALUES ($1,$2,$3)`, [sid, user.id, user.auth_version]);
  return createToken(user, sid);
}

async function validSession(userId, sid, authVersion) {
  if (typeof sid !== "string" || !/^[0-9a-f-]{36}$/i.test(sid)) return false;
  const result = await query(`SELECT 1 FROM auth_sessions
    WHERE id=$1 AND user_id=$2 AND auth_version=$3 AND revoked_at IS NULL
    LIMIT 1`, [sid,userId,authVersion]);
  return result.rowCount === 1;
}

async function revokeSession(userId, sid) {
  await query(`UPDATE auth_sessions SET revoked_at=NOW()
    WHERE user_id=$1 AND id=$2 AND revoked_at IS NULL`,[userId,sid]);
}

async function revokeAllSessions(userId) {
  await query(`UPDATE auth_sessions SET revoked_at=NOW()
    WHERE user_id=$1 AND revoked_at IS NULL`,[userId]);
}
module.exports={issueSessionToken,validSession,revokeSession,revokeAllSessions};
