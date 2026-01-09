import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in server/.env");
}

export function signToken(user) {
  // keep payload small
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
