/**
 * Creates an object composed of the picked properties from the given object.
 *
 * @template T - The type of the input object
 * @param {T} object - The source object from which to pick properties
 * @param {Array<keyof T>} keys - The keys to pick from the object
 * @returns {Partial<T>} - A new object with only the specified properties
 */
const pick = <T extends Record<string, any>>(
  object: T,
  keys: Array<keyof T>
): Partial<T> => {
  return Object.fromEntries(
    keys.filter((key) => key in object).map((key) => [key, object[key]])
  ) as Partial<T>;
};

export default pick;
