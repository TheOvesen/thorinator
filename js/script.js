const stepLength = 20;
const forkChance = 0.02; // 1 = 100%; default 0.02
const endParticleChance = 0.5;
const midParticleChance = 0.01;
const GLOW_LIFE = 500;
const GLOW_LIFE_COMPARE = GLOW_LIFE << 20;
let drawLightning = false;
let boltID = 0;
let lastTime = 0;

let gameArea = {
  canvas: document.querySelector("#canvas"),
  start: function() {
    this.context = this.canvas.getContext("2d")
    this.clear();
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
let availParticleList = [];

let usedGlowList = [];
let availGlowList = [];

function zapStart(x, y) {
  this.x = x;
  this.y = y;
  this.update = function() {
    let ctx = gameArea.context;

    if (drawLightning == true) {
      let dx = anode.x - this.x;
      let dy = anode.y - this.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      let dirVectX = dx / dist;
      let dirVectY = dy / dist;
      let angle = Math.atan2(dirVectY, dirVectX);
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
        let posX = this.x + i * dirVectX;
        let posY = this.y + i * dirVectY;

        let distVarianceFactor = Math.sin(Math.PI / (dist / i));
        let crackle = Math.random() * 40 - 20;
        let wobbleX = Math.cos(angle + Math.PI / 2) * ((maxVariance * random) + crackle) * distVarianceFactor;
        let wobbleY = Math.sin(angle + Math.PI / 2) * ((maxVariance * random) + crackle) * distVarianceFactor;

        ctx.lineTo(posX + wobbleX, posY + wobbleY);

        if (Math.random() <= midParticleChance) {
          if (availParticleList.length == 0) {
            availParticleList.push(new Particle());
          }

          let speed = Math.random() * 5;
          let direction = ((Math.random() * 2) - 1) * Math.PI;
          let particle = availParticleList.pop();

          particle.x = posX + wobbleX;
          particle.y = posY + wobbleY;
          particle.hspeed = Math.cos(direction) * speed;
          particle.vspeed = Math.sin(direction) * speed;
          particle.alpha = 1;
          particle.available = false;

          usedParticleList.push(particle);
        }

        if (Math.random() <= forkChance && i > 0 && (i + stepLength) < dist) {
          let forkAngle = Math.atan2((posY + wobbleY) - lastPoint.y, (posX + wobbleX) - lastPoint.x);

          forkArray.push({
            x: posX + wobbleX,
            y: posY + wobbleY,
            angle: forkAngle,
            maxLength: Math.floor((dist - i) / 2)
          });
        }

        lastPoint.x = posX + wobbleX;
        lastPoint.y = posY + wobbleY;
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

      let newGlow = availGlowList.pop();
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
  let roundTime = time | 0;
  gameArea.clear();

  let newUsedParticles = [];

  for (let i = 0; i < usedParticleList.length; i++) {
    usedParticleList[i].update();

    if (usedParticleList[i].alpha <= 0 || usedParticleList[i].y > 600 || usedParticleList[i].x < 0 || usedParticleList[i].x > 600) {
      availParticleList.push(usedParticleList[i]);
    } else {
      newUsedParticles.push(usedParticleList[i]);
    }
  }

  usedParticleList = newUsedParticles;

  for (let i = 0; i < usedGlowList.length; i++) {
    usedGlowList[i].vars += (roundTime - lastTime) << 20;

    if (i > 0 && usedGlowList[i].boltid == usedGlowList[i - 1].boltid) {
      connectGlows(usedGlowList[i], usedGlowList[i - 1]);
    }
  }

  if (usedGlowList.length > 0 && usedGlowList[0].vars >= GLOW_LIFE_COMPARE) {
    availGlowList[0] = usedGlowList.shift();
  }

  cathode.update();
  lastTime = roundTime;
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
  glow.vars = (x & 0b1111111111) + ((y & 0b1111111111) << 10);
}

function Glow() {
  this.vars = 0;
  this.boltid = 0;
}

function connectGlows(source, target) {
  let ctx = gameArea.context;
  let sourceX = (source.vars & 0b1111111111);
  let sourceY = ((source.vars >>> 10) & 0b1111111111);
  let sourceLife = ((source.vars >>> 20) & 0b1111111111);
  let sourceAlpha = 1 - (sourceLife) / GLOW_LIFE;
  let targetX = (target.vars & 0b1111111111);
  let targetY = ((target.vars >>> 10) & 0b1111111111);

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
