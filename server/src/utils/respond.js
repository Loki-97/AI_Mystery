export function asyncRoute(handler) { return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next); }
export function publicMystery(mystery) {
  const value = mystery.toObject ? mystery.toObject() : { ...mystery };
  delete value.userId;
  delete value.__v;
  return value;
}
