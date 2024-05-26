import { EventEmitter } from "events";

export function listedForKeyHold() {
  const emmiter = new EventEmitter();

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  let start: number = 0;
  let timeout: number = 0;

  function resetTimeout() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = 0;
    }
  }

  process.stdin.on("data", (key: string) => {
    // ctrl + c
    if (key === "\u0003") {
      emmiter.emit("exit");
    }

    if (key === " ") {
      if (!start) {
        start = Date.now();
        emmiter.emit("start");
      }

      emmiter.emit("hold");

      resetTimeout();
      timeout = setTimeout(() => {
        emmiter.emit("stop");
        start = 0;
        resetTimeout();
      }, 500);
    }
  });

  return emmiter;
}

// const e = listedForKeyHold();
// e.addListener("hold", () => Bun.write(Bun.stdin, "."));
// e.addListener("start", () => console.log("\n[STARTED]"));
// e.addListener("stop", () => console.log("\n[STOPPED]"));
// e.addListener("exit", () => {
//   console.log("\n[EXITED]");
//   process.exit();
// });
