const counterEl = R1.$("counter");
const statusEl = R1.$("status");
let count = 0;
const flashStatus = (text) => R1.toast(statusEl, text, 1500);

function ptt() {
  if (R1.hasSDK) {
    PluginMessageHandler.postMessage(
      JSON.stringify({
        message: "Say hello world, in one short cheerful sentence.",
        useLLM: true,
        wantsR1Response: true,
      }),
    );
    flashStatus("speaking...");
  } else {
    flashStatus("open on r1");
  }
}

R1.bindControls({
  wheel: (d) => {
    count += d;
    counterEl.textContent = `scroll: ${count}`;
  },
  ptt,
});

window.onPluginMessage = () => flashStatus("got reply");

if (!R1.hasSDK) R1.$("hint").textContent = "run on an r1 device to enable hardware + voice";
