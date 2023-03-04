let arcMath = (t) => {
  return Math.sqrt(1 - Math.pow(t - 1, 2));
};

const DELTA = 300; // in ms
let arc = [];
for (let t = 0; t < DELTA; t++) {
  arc.push(arcMath(t / DELTA));
}

$("img").each(function (index, imghtml) {
  var rub = new SuperGif({ gif: imghtml });
  console.log(rub);
  let transi = 0;
  let goal = 0;
  let totalDistance = 0;
  let lastDframe = 0;
  rub.load(function () {
    console.log("oh hey, now the gif is loaded");
    rub.pause();
    const maxFrame = rub.get_length();
    $(window).scroll(function (scroll) {
      let percent =
        1 - (window.scrollMaxY - window.scrollY) / window.scrollMaxY;
      let start = rub.get_current_frame(); // begin transition frame index
      goal = Math.floor(percent * maxFrame); // end transition frame index
      totalDistance = goal - start; // transition length in frame
      transi = 0;
    });
    const reachGoalInDeltaSeconds = () => {
      let frameIndex = rub.get_current_frame();
      if (Math.abs(frameIndex - goal) >= 2) {  // 2 is arbitrary, but it's the minimum frame difference to be noticeable
        let dframe = lastDframe + arc[transi + 1] * totalDistance - arc[transi] * totalDistance; // total distance is relative
        if (Math.floor(dframe) == 0) {  // If the last dframe plus this one still is 0 frame, then wait for next ms
          lastDframe = dframe;
        } else {
          lastDframe = dframe - Math.floor(dframe);
          frameIndex += Math.floor(dframe);
          rub.move_to(frameIndex);
        }
        transi++;
      }
    };
    setInterval(reachGoalInDeltaSeconds, 1);
  });
  rub.get_canvas().style.position = "fixed";
  rub.get_canvas().style.zindex = "-10";
  previous = 0;
});
