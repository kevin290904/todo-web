self.addEventListener('install', event => {
    console.log('Service Worker installed');
    self.skipWaiting();
  });
  
  self.addEventListener('activate', event => {
    console.log('Service Worker activated');
  });
  
  self.addEventListener('push', event => {
    const data = event.data.json();
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'icon-192.png'
    });
  });
  