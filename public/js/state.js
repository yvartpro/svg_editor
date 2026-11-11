// Shared, mutable editor state. Modules read and write it through this one
// object, because ES module `let` exports can't be reassigned by importers.
export const state = {
  root: null,        // the <svg> element being edited
  sel: null,         // selected element
  hover: null,       // element under the pointer
  tool: 'select',
  scale: 1, panX: 0, panY: 0,
  artW: 300, artH: 150,
  spaceDown: false,
  activeTab: 'props',
};
