let audioContext = null;
let oscillator = null;
let gainNode = null;
let wakeLock = null;

export function startKeepAlive() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    oscillator = audioContext.createOscillator();
    gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    oscillator.start();
    console.log("[保活] 后台音频保活已启动");
  } catch (e) {
    console.error("[保活] 音频启动失败:", e);
  }
}

export async function requestWakeLock() {
  if ("wakeLock" in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      console.log("[保活] 屏幕常亮已启动");
      // 页面重新可见时重新申请
      document.addEventListener("visibilitychange", async () => {
        if (document.visibilityState === "visible" && wakeLock === null) {
          try {
            wakeLock = await navigator.wakeLock.request("screen");
            console.log("[保活] 屏幕常亮已恢复");
          } catch {}
        }
      });
    } catch (e) {
      console.log("[保活] 屏幕常亮不可用:", e.message);
    }
  }
}

export function stopKeepAlive() {
  try {
    if (oscillator) {
      oscillator.stop();
      oscillator = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    if (wakeLock) {
      wakeLock.release();
      wakeLock = null;
    }
    console.log("[保活] 保活已停止");
  } catch {}
}

export function isKeepAliveActive() {
  return audioContext !== null && audioContext.state === "running";
}
