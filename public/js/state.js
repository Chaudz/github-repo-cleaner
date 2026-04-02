// Shared application state & DOM helpers

export const state = {
  allRepos:      [],   // repos fetched from API
  filtered:      [],   // after search/filter applied
  selected:      new Set(),
  token:         '',
  currentFilter: 'all',
};

/** @param {string} id */
export const $  = (id) => document.getElementById(id);

/** Navigate between page sections */
export function showPage(name) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  $(`page-${name}`).classList.add('active');
}
