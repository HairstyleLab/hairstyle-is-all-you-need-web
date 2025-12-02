document.addEventListener("DOMContentLoaded", () => {
    const hairdoBtn = document.getElementById("hairdoBtn");
    const pictorialBook = document.getElementById("pictorial-book");
    const closePictorialBtn = document.getElementById("closePictorialBtn");

    // 패널 열기
    hairdoBtn.addEventListener("click", () => {
        pictorialBook.classList.add("open");
    });

    // 패널 닫기
    closePictorialBtn.addEventListener("click", () => {
        pictorialBook.classList.remove("open");
    });
});