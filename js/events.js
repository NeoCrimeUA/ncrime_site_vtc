document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('events-container');
  if (!container) return;
  try {
    const events = await eventCatalog.load();
    eventCatalog.render(container, events.filter(item => !item.archived).slice(0, 9));
  } catch (error) {
    console.error('[Events]', error);
    eventCatalog.render(container, [], eventCatalog.labels.error);
  }
});
