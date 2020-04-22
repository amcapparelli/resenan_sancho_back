module.exports.removeKeys = (object, ...keysToRemove) => Object.entries(object).reduce(
  (result, [key, value]) => keysToRemove.includes(key) ? result : { ...result, [key]: value }
  , {});
