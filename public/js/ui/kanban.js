/* Lightweight HTML5 drag-drop kanban. */
window.kanban = (function () {
  function bind(rootEl, opts) {
    // opts.onMove(taskId, newStatus, newOrder)
    let dragId = null;

    rootEl.querySelectorAll('.kanban-card').forEach((card) => {
      card.draggable = true;

      card.addEventListener('dragstart', (e) => {
        dragId = card.dataset.id;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', dragId); } catch {}
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        dragId = null;
        rootEl.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
      });
    });

    rootEl.querySelectorAll('.kanban-list').forEach((list) => {
      list.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        list.classList.add('drag-over');
      });
      list.addEventListener('dragleave', () => list.classList.remove('drag-over'));
      list.addEventListener('drop', (e) => {
        e.preventDefault();
        list.classList.remove('drag-over');
        const id = dragId || e.dataTransfer.getData('text/plain');
        if (!id) return;
        const status = list.dataset.status;
        const order = list.querySelectorAll('.kanban-card').length;
        opts.onMove && opts.onMove(id, status, order);
      });
    });

    // Mobile: tap-to-cycle status (simpler than drag on touch)
    rootEl.querySelectorAll('.kanban-card .status-cycle').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.kanban-card');
        const id = card.dataset.id;
        const next = btn.dataset.next;
        opts.onMove && opts.onMove(id, next, 0);
      });
    });
  }

  return { bind };
})();
