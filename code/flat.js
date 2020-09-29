function flatDeep (arr, d = 1) {
  return d > 0 ? arr.reduce((arr, val) => arr.concat(Array.isArray(val) ? flatDeep(val, d - 1) : val), []) : arr.slice();
}

const array = [1, [2, 3], [5, 6, [7], [8, 9, [10, 11]]], [12]];
const result = flatDeep(array, 2);
console.log(result)