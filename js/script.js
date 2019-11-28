const stepLength = 20;
const forkChance = 0.02; // 1 = 100%; default 0.02
const endParticleChance = 0.5;
const midParticleChance = 0.01;
const GLOW_LIFE = 500;
let drawLightning = false;
let boltID = 0;
let lastTime = 0;

let gameArea = {
  canvas: document.querySelector("#canvas"),
  start: function() {
    this.context = this.canvas.getContext("2d")
    this.clear();
    //this.interval = setInterval(updateGameArea, 15);
    window.requestAnimationFrame(updateGameArea);
  },
  clear: function() {
    this.context.clearRect(0, 0, 600, 600);
  }
}

gameArea.start();
let cathode = new zapStart(10, 10);
let anode = new zapEnd(10, 10);

let usedParticleList = [];
let availParticleList = [];/*
for (let i = 0; i < 80; i++) {
  availParticleList[i] = new Particle();
}*/

let usedGlowList = [];
let availGlowList = [];/*
for (let i = 0; i < 60; i++) {
  availGlowList[i] = new Glow();
}*/

function zapStart(x, y) {
  this.x = x;
  this.y = y;
  this.update = function() {
    let ctx = gameArea.context;

    if (drawLightning == true) {
      let dist = Math.sqrt(Math.pow((anode.x - this.x), 2) + Math.pow((anode.y - this.y), 2));
      let dirVect = {
        x: (anode.x - this.x) / dist,
        y: (anode.y - this.y) / dist
      }
      let angle = Math.atan2(dirVect.y, dirVect.x);
      let maxVariance = dist / 4;
      let random = (Math.random() * 2) - 1;

      let forkArray = [];

      let lastPoint = {
        x: this.x,
        y: this.y
      };

      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      for (let i = 0; i < dist; i += stepLength) {
        let posX = this.x + i * dirVect.x;
        let posY = this.y + i * dirVect.y;

        let distVarianceFactor = Math.sin(Math.PI / (dist / i));
        let crackle = Math.random() * 40 - 20;
        let wobble = {
          x: Math.cos(angle + Math.PI / 2) * ((maxVariance * random) + crackle) * distVarianceFactor,
          y: Math.sin(angle + Math.PI / 2) * ((maxVariance * random) + crackle) * distVarianceFactor
        };

        ctx.lineTo(posX + wobble.x, posY + wobble.y);

        if (Math.random() <= midParticleChance) {
          if (availParticleList.length == 0) {
            availParticleList.push(new Particle());
          }

          let speed = Math.random() * 5;
          let direction = ((Math.random() * 2) - 1) * Math.PI;
          let particle = availParticleList.pop();

          particle.x = posX + wobble.x;
          particle.y = posY + wobble.y;
          particle.hspeed = Math.cos(direction) * speed;
          particle.vspeed = Math.sin(direction) * speed;
          particle.alpha = 1;
          particle.available = false;

          usedParticleList.push(particle);
        }

        if (Math.random() <= forkChance && i > 0 && (i + stepLength) < dist) {
          let forkAngle = Math.atan2((posY + wobble.y) - lastPoint.y, (posX + wobble.x) - lastPoint.x);

          forkArray.push({
            x: posX + wobble.x,
            y: posY + wobble.y,
            angle: forkAngle,
            maxLength: Math.floor((dist - i) / 2)
          });
        }

        lastPoint.x = posX + wobble.x;
        lastPoint.y = posY + wobble.y;
      }

      ctx.lineTo(anode.x, anode.y);

      for (let fork of forkArray) {
        looseBolt(fork.x, fork.y, fork.angle, fork.maxLength);
      }

      ctx.strokeStyle = "rgba(200, 200, 255, 0.05)";
      ctx.lineWidth = 80;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      ctx.stroke();

      ctx.strokeStyle = "rgba(200, 200, 255, 0.3)";
      ctx.lineWidth = 30;

      ctx.stroke();

      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 5;

      ctx.stroke();

      if (Math.random() <= endParticleChance) {
        if (availParticleList.length == 0) {
          availParticleList.push(new Particle());
        }

        let speed = Math.random() * 10;
        let direction = ((Math.random() * 2) - 1) * Math.PI;
        let particle = availParticleList.pop();

        particle.x = anode.x;
        particle.y = anode.y;
        particle.hspeed = Math.cos(direction) * speed;
        particle.vspeed = Math.sin(direction) * speed;
        particle.alpha = 1;

        usedParticleList.push(particle);
      }

      if (availGlowList.length == 0) {
        availGlowList.push(new Glow());
      }

      let newGlow = availGlowList.pop();/*
      newGlow.x = anode.x;
      newGlow.y = anode.y;
      newGlow.alpha = 0.5;*/
      setGlowPos(newGlow, anode.x, anode.y);
      newGlow.boltid = boltID;

      usedGlowList.push(newGlow);
    }
  }
}

function zapEnd(x, y) {
  this.x = x;
  this.y = y;
}

function lock() {
  if (drawLightning == false) {
    boltID = Math.random();
    drawLightning = true;
  }
}

function release() {
  drawLightning = false;

  cathode.x = event.offsetX;
  cathode.y = event.offsetY;
}

function updateGameArea(time) {
  gameArea.clear();

  for (let i = 0; i < usedParticleList.length; i++) {
    usedParticleList[i].update();

    if (usedParticleList[i].y > 600 || usedParticleList[i].x < 0 || usedParticleList[i].x > 600 || usedParticleList[i].alpha <= 0) {
      availParticleList.push(usedParticleList.splice(i, 1)[0]);
    }
  }

  for (let i = 0; i < usedGlowList.length; i++) {
    //usedGlowList[i].alpha -= 0.01;
    usedGlowList[i].vars += (time - lastTime) << 20;

    if (i > 0 && usedGlowList[i].boltid == usedGlowList[i - 1].boltid) {
      connectGlows(usedGlowList[i], usedGlowList[i - 1]);
    }

    //if (usedGlowList[i].alpha <= 0) {
    if ((usedGlowList[i].vars >>> 20) >= GLOW_LIFE) {
      availGlowList.push(usedGlowList.splice(i, 1)[0]);
    }
  }

  cathode.update();
  lastTime = time;
  window.requestAnimationFrame(updateGameArea);
}

function move(event) {
  if (drawLightning == false) {
    cathode.x = event.offsetX;
    cathode.y = event.offsetY;
  }

  anode.x = event.offsetX;
  anode.y = event.offsetY;
}

function looseBolt(x, y, startAngle, maxLength) {
  //console.log([x, y, startAngle, maxLength]);
  let ctx = gameArea.context;
  let angleVariance = Math.PI / 2;
  let length = Math.random() * maxLength;
  let angle = startAngle;
  let posX = x;
  let posY = y;

  ctx.moveTo(x, y);

  for (let i = 0; i < length; i += stepLength) {
    angle += angleVariance * (Math.random() - 0.5);
    posX += Math.cos(angle) * stepLength;
    posY += Math.sin(angle) * stepLength;

    ctx.lineTo(posX, posY);
  }
}

function Particle() {
  this.x = 0;
  this.y = 0;
  this.hspeed = 0;
  this.vspeed = 0;
  this.alpha = 1;
  this.update = function() {
    this.vspeed += 0.2;
    this.x += this.hspeed;
    this.y += this.vspeed;
    this.alpha -= 0.04;
    let ctx = gameArea.context;

    ctx.beginPath();

    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x, this.y);

    ctx.strokeStyle = `rgba(200, 200, 255, ${0.3*this.alpha})`;
    ctx.lineWidth = 8;

    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${this.alpha})`;
    ctx.lineWidth = 3;

    ctx.stroke();
  }
}

function setGlowPos(glow, x, y) {
  glow.vars = (x & parseInt(1111111111, 2)) + ((y & parseInt(1111111111, 2)) << 10);
}

function Glow() {
  this.vars = 0;
  this.boltid = 0;
}

function connectGlows(source, target) {
  let ctx = gameArea.context;
  let sourceX = (source.vars & parseInt(1111111111, 2));
  let sourceY = ((source.vars >>> 10) & parseInt(1111111111, 2));
  let sourceLife = ((source.vars >>> 20) & parseInt(1111111111, 2));
  let sourceAlpha = 1 - (sourceLife)/GLOW_LIFE;
  let targetX = (target.vars & parseInt(1111111111, 2));
  let targetY = ((target.vars >>> 10) & parseInt(1111111111, 2));
  //console.log(sourceX);
  //console.log(sourceY);

  ctx.beginPath();
  ctx.moveTo(sourceX, sourceY);
  ctx.lineTo(targetX, targetY);

  ctx.strokeStyle = `rgba(255, 128, 10, ${0.4*sourceAlpha})`;
  ctx.lineWidth = 10;

  ctx.stroke();

  ctx.strokeStyle = `rgba(128, 128, 50, ${1*sourceAlpha})`;
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.stroke();
}
