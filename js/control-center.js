const controlCenter = document.getElementById("controlCenter");

const statusBar = document.querySelector(".status-bar");

let startY = 0;

function initControlCenter() {
  /* 打开 */

  statusBar.addEventListener("touchstart", (e) => {
    startY = e.touches[0].clientY;
  });

  statusBar.addEventListener("touchmove", (e) => {
    let moveY = e.touches[0].clientY;

    let diff = moveY - startY;

    if (diff > 80) {
      openControlCenter();
    }
  });

  /* 关闭 */

  controlCenter.addEventListener("touchstart", (e) => {
    startY = e.touches[0].clientY;
  });

  controlCenter.addEventListener("touchmove", (e) => {
    let moveY = e.touches[0].clientY;

    let diff = startY - moveY;

    if (diff > 80) {
      closeControlCenter();
    }
  });
}

function openControlCenter() {
  controlCenter.classList.add("show");

  state.controlCenterOpen = true;
}

function closeControlCenter() {
  controlCenter.classList.remove("show");

  state.controlCenterOpen = false;
}
