const hasSDK = typeof PluginMessageHandler !== 'undefined';
let count = 0;
const counterEl = document.getElementById('counter');
const statusEl = document.getElementById('status');

function flashStatus(text) {
  statusEl.textContent = text;
  statusEl.classList.add('show');
  clearTimeout(flashStatus._t);
  flashStatus._t = setTimeout(() => statusEl.classList.remove('show'), 1500);
}

window.addEventListener('scrollUp', () => {
  count++;
  counterEl.textContent = 'scroll: ' + count;
});

window.addEventListener('scrollDown', () => {
  count--;
  counterEl.textContent = 'scroll: ' + count;
});

window.addEventListener('sideClick', () => {
  if (hasSDK) {
    PluginMessageHandler.postMessage(JSON.stringify({
      message: 'Say hello world, in one short cheerful sentence.',
      useLLM: true,
      wantsR1Response: true
    }));
    flashStatus('speaking...');
  } else {
    flashStatus('open on r1');
  }
});

window.onPluginMessage = function (data) {
  flashStatus('got reply');
};

if (!hasSDK) {
  document.getElementById('hint').textContent =
    'run on an r1 device to enable hardware + voice';
}
