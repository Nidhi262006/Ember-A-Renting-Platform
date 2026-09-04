// Inline validation messages. The browser already knows what is wrong with each
// field; this just puts that message next to the field instead of letting the
// submit go through and bounce back from the server. Progressive enhancement —
// without JavaScript the browser still blocks the submit and the server still
// validates and flashes.
(() => {
  'use strict';

  const clearError = (field) => {
    field.classList.remove('invalid');
    const parent = field.parentElement;
    const existing = parent && parent.querySelector('.field-error');
    if (existing) {
      existing.remove();
    }
  };

  const showError = (field) => {
    clearError(field);
    field.classList.add('invalid');
    const note = document.createElement('small');
    note.className = 'field-error';
    note.textContent = field.validationMessage;
    (field.parentElement || field).appendChild(note);
  };

  document.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (form.checkValidity()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      let firstInvalid = null;
      form.querySelectorAll('input, select, textarea').forEach((field) => {
        if (field.checkValidity()) {
          clearError(field);
        } else {
          showError(field);
          if (!firstInvalid) {
            firstInvalid = field;
          }
        }
      });

      if (firstInvalid) {
        firstInvalid.focus();
      }
    });

    // Take the message away as soon as they fix it.
    form.addEventListener('input', (event) => {
      if (event.target.checkValidity && event.target.checkValidity()) {
        clearError(event.target);
      }
    });
  });
})();

// Client-side search filter
function filterListings() {
  const query = document.getElementById('searchInput')?.value.toLowerCase();
  const category = document.getElementById('categoryFilter')?.value;
  if (query || category) {
    let url = '/listings?';
    if (query) url += `search=${encodeURIComponent(query)}&`;
    if (category) url += `category=${encodeURIComponent(category)}`;
    window.location.href = url;
  }
}

// Enter key on search
document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') filterListings();
});
