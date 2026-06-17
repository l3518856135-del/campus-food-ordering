// 校园点餐 PWA Service Worker
const CACHE_NAME = 'campus-order-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/customer.html',
  '/merchant.html',
  '/css/style.css',
  '/js/data.js',
  '/js/common.js',
  '/js/customer.js',
  '/js/merchant.js',
  '/js/menu-manager.js',
  '/icons/customer-192.png',
  '/icons/customer-512.png',
  '/icons/merchant-192.png',
  '/icons/merchant-512.png',
  '/manifest-customer.json',
  '/manifest-merchant.json'
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {
        // 部分资源失败不影响安装
      });
    })
  );
  self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 请求拦截 - 缓存优先策略
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    }).catch(() => {
      // 离线时返回缓存，如果都没有则返回首页
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});