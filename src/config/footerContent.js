// Public footer content. Keep unverified items pending. Never put secrets here.
// For a page: add its reserved public route first, then set status: 'ready'.
// For a license: verify its official verification URL and local image before activation.
// Pending slots are visible in Vite development, hidden in production by default.
export const footerContent = {
  showPendingInProduction: false,
  pages: [
    { id: 'about', label: 'درباره فضاجو', status: 'pending', path: '/about' },
    { id: 'faq', label: 'سؤالات متداول', status: 'pending', path: '/faq' },
    { id: 'guide', label: 'راهنمای کاربران', status: 'pending', path: '/guide' },
    { id: 'terms', label: 'قوانین و مقررات', status: 'pending', path: '/terms' },
    { id: 'privacy', label: 'حریم خصوصی', status: 'pending', path: '/privacy' },
    { id: 'contact', label: 'تماس با ما', status: 'pending', path: '/contact' },
  ],
  contacts: [
    { id: 'phone', label: 'تلفن پشتیبانی', type: 'phone', status: 'pending', value: '' },
    { id: 'email', label: 'ایمیل پشتیبانی', type: 'email', status: 'pending', value: '' },
    { id: 'address', label: 'نشانی مجموعه', type: 'text', status: 'pending', value: '' },
  ],
  licenses: [
    { id: 'enamad', label: 'نماد اعتماد الکترونیکی', status: 'pending', verificationUrl: '', imagePath: '' },
    { id: 'business', label: 'مجوز فعالیت', status: 'pending', verificationUrl: '', imagePath: '' },
  ],
};

function internalPath(item) {
  const paths = { about: '/about', faq: '/faq', guide: '/guide', terms: '/terms', privacy: '/privacy', contact: '/contact' };
  return Object.hasOwn(paths, item.id) && item.path === paths[item.id] ? item.path : null;
}
function httpsUrl(value) {
  if (typeof value !== 'string' || !/^https:\/\//i.test(value) || /\s/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
function localImage(value) {
  return typeof value === 'string' && /^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:png|webp|jpe?g|svg)$/i.test(value) ? value : null;
}
function contactValue(item) {
  const value = typeof item.value === 'string' ? item.value.trim() : '';
  if (!value) return null;
  if (item.type === 'phone') {
    const number = value.replace(/[\s()-]/g, '');
    return /^\+?\d{7,15}$/.test(number) ? { value, href: `tel:${number}` } : null;
  }
  if (item.type === 'email') return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value) ? { value, href: `mailto:${value}` } : null;
  if (item.type === 'text') return { value };
  return null;
}

// Pure resolver; incomplete or invalid ready entries fail closed.
export function resolveFooterContent({ development = false, content = footerContent } = {}) {
  const showPending = development === true || content.showPendingInProduction === true;
  const select = (items, resolve) => items.flatMap(item => {
    if (item.status === 'ready') {
      const data = resolve(item);
      if (data) return [{ id: item.id, label: item.label, ready: true, ...data }];
    }
    return showPending ? [{ id: item.id, label: item.label, ready: false }] : [];
  });
  return {
    pages: select(content.pages, item => { const path = internalPath(item); return path ? { path } : null; }),
    contacts: select(content.contacts, contactValue),
    licenses: select(content.licenses, item => {
      const href = httpsUrl(item.verificationUrl);
      return href ? { href, imagePath: localImage(item.imagePath) } : null;
    }),
  };
}
