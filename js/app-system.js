const appPage = document.getElementById("appPage");

function openApp() {
  appPage.classList.add("show");

  state.currentApp = "camera";
}

function closeApp() {
  appPage.classList.remove("show");

  state.currentApp = null;
}
