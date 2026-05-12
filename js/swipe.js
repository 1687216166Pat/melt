const pages = document.getElementById("pages");

const dots = document.querySelectorAll(".dot");

let startX = 0;

function initSwipe() {
  pages.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
  });

  pages.addEventListener("touchend", (e) => {
    let endX = e.changedTouches[0].clientX;

    let diff = startX - endX;

    if (diff > 50) {
      state.currentPage++;

      if (state.currentPage > 1) {
        state.currentPage = 1;
      }
    }

    if (diff < -50) {
      state.currentPage--;

      if (state.currentPage < 0) {
        state.currentPage = 0;
      }
    }

    updatePage();
  });
}

function updatePage() {
  pages.style.transform = `translateX(
        -${state.currentPage * 100}vw
    )`;

  dots.forEach((dot) => {
    dot.classList.remove("active");
  });

  dots[state.currentPage].classList.add("active");
}
