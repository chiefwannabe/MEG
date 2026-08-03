window.BoxSearch = (function () {
  function filterAndSort(items, query, sortBy, category = 'all') {
    let result = [...items];

    if (query && query.trim() !== '') {
      const q = query.toLowerCase().trim();
      result = result.filter(item => item.name.toLowerCase().includes(q));
    }

    if (category !== 'all') {
      result = result.filter(item => {
        if (category === 'dir') return item.type === 'dir';
        if (item.type === 'dir') return false;
        const type = BoxPreview.getFileType(item.name);
        if (category === 'file') return type === 'binary' && !/\.(zip|rar|7z|tar|gz|bz2)$/i.test(item.name);
        if (category === 'document') return ['pdf', 'markdown', 'text'].includes(type);
        if (category === 'archive') return /\.(zip|rar|7z|tar|gz|bz2)$/i.test(item.name);
        return type === category;
      });
    }

    result.sort((a, b) => {
      // Always put folders first
      if (a.type === 'dir' && b.type !== 'dir') return -1;
      if (a.type !== 'dir' && b.type === 'dir') return 1;

      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'size-desc':
          return (b.size || 0) - (a.size || 0);
        case 'size-asc':
          return (a.size || 0) - (b.size || 0);
        default:
          return 0;
      }
    });

    return result;
  }

  return { filterAndSort };
})();
