/**
 * @param {string} content 
 */
export const selectState = (content) => {
  /**
   * a ? b : c
   * a && b && c || d
   * a.toFixed(2)
   * fn(a)
   * a[1]
   * a.b.c
   */
  const varReg = /^[0-9a-zA-Z_]*/
  
}