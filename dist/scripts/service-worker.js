self.addEventListener("install",e=>{e.waitUntil(caches.open("workout-timer-v1").then(e=>e.addAll(["./","./index.html","./editor.html","./styles/main.css","./styles/variables.css","./styles/player.css","./styles/editor.css"])))}),self.addEventListener("fetch",e=>{e.respondWith(caches.match(e.request).then(s=>s||fetch(e.request)))});
//# sourceMappingURL=service-worker.js.map
