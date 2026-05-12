function updateTime(){

    const now =
    new Date();

    let h =
    now.getHours();

    let m =
    now.getMinutes();

    if(m < 10){

        m = "0" + m;
    }

    document
    .getElementById("timeText")
    .innerText =
    `${h}:${m}`;
}

function initTime(){

    updateTime();

    setInterval(
        updateTime,
        1000
    );
}