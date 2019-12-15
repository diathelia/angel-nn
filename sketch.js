let canvas;
let model;
let targetLabel = "1";
let state = "collection";
let parentWidth;
let parentHeight;
let mariah;
let env;
let wave;
let mariahImg;

let notes = {
  1: "Bb6",
  2: "F6",
  3: "F#6",
  4: "G#6",
  5: "G#6_t",
  6: "Bb6",
  7: "B6",
  8: "C7",
  9: "C#7"
};

// frequencies in Hz based on A4 = 440Hz (equal-tempered scale)
// from https://gist.github.com/stevekinney/11070265
let mapNotes = {
  1: 1244.51, // Eb6
  2: 1396.91, // F6
  3: 1479.98, // F#6
  4: 1661.22, // G#6
  5: 1666.0, // G#6_t (guessed from spek analysis)
  6: 1864.66, // Bb6
  7: 1975.53, // B6
  8: 2093.0, // C7
  9: 2217.46 // C#7
};

function preload() {
  // to make life easier, renamed files with '#' in them to '_'
  mariah = {
    1: loadSound("notes/Eb6.wav", onLoad, onError),
    2: loadSound("notes/F6.wav", onLoad, onError),
    3: loadSound("notes/F_6.wav", onLoad, onError),
    4: loadSound("notes/G_6.wav", onLoad, onError),
    5: loadSound("notes/G_6_trill.wav", onLoad, onError),
    6: loadSound("notes/Bb6.wav", onLoad, onError),
    7: loadSound("notes/B6.wav", onLoad, onError),
    8: loadSound("notes/C7.wav", onLoad, onError),
    9: loadSound("notes/C_7.wav", onLoad, onError)
  };

  // load background image
  mariahImg = loadImage("mariah.jpg");
}

// audio load callback
function onLoad(res) {
  // console.log("load:", res);
}

// audio error callback
function onError(res) {
  console.log("audio load error:", res);
}

function setup() {
  // suspend Audio Context to stop error messages
  // (this suspend/start approach helps Chrome, isn't helpful for Firefox)
  getAudioContext()
    .suspend()
    .then(() => {
      console.log("audioCtx suspended");
    });
  // start Audio Context on first valid user interaction
  userStartAudio().then(() => {
    console.log("audioCtx started");
  });

  // get parent width / height
  parentWidth = document.querySelector("#sketch-parent").offsetWidth;
  parentHeight = document.querySelector("#sketch-parent").offsetHeight;

  // set canvas to parentWidth and static height
  canvas = createCanvas(parentWidth, parentHeight);

  canvas.parent("sketch-parent");

  background(mariahImg);

  // use mouseMoved event to run custom mouse_Moved function
  // canvas.mouseMoved(mouse_Moved);

  // configure sounds
  env = new p5.Envelope();
  env.setADSR(0.05, 0.1, 0.5, 1);
  env.setRange(1.2, 0);

  wave = new p5.Oscillator();
  wave.setType("sine");
  wave.start();
  wave.freq(mapNotes[1]);
  wave.amp(env);

  // configure model options
  let options = {
    inputs: ["x", "y"],
    outputs: ["frequency"],
    task: "regression",
    debug: "true"
    // learningRate: 0.1
  };

  // create configured model
  model = ml5.neuralNetwork(options);
  // load saved data
  // model.loadData("mariah-notes.json", dataLoaded);
}

function windowResized() {
  // update parent width / height
  parentWidth = document.querySelector("#sketch-parent").offsetWidth;
  parentHeight = document.querySelector("#sketch-parent").offsetHeight;
  resizeCanvas(parentWidth, parentHeight);
  background(mariahImg);
}

// data loaded callback
function dataLoaded() {
  let data = model.data.data.raw;
  // draw all saved data points
  for (let i = 0; i < data.length; i++) {
    let inputs = data[i].xs;
    let target = data[i].ys;
    stroke(250);
    noFill();
    ellipse(inputs.x, inputs.y, 24);
    fill(250);
    noStroke();
    textAlign(CENTER, CENTER);
    text(target.label, inputs.x, inputs.y);
  }
}

function keyPressed() {
  console.log("key pressed:", key);
  // detect train cmd by keypress
  if (key == "t") {
    // update model state
    state = "training";

    console.log("starting training..");

    // normalize data into a between 0 and 1 range
    model.normalizeData();

    // configure training options
    let options = {
      epochs: 100
    };
    // run training
    model.train(options, finishedTraining); // whileTraining
    // detect save data cmd by keypress
  } else if (key == "s") {
    // save data to file (json by default)
    model.saveData("mariah-notes");
  } else {
    // update GUI mouse
    targetLabel = key.toUpperCase();
  }
}

// per epoch training callback
// function whileTraining(epoch, loss) {
// log epoch object data
// console.log(epoch);
// }

// finished training callback
function finishedTraining() {
  console.log("..finished training");

  // update model state
  state = "prediction";
}

function mousePressed() {
  // function mouse_Moved() {
  // input object for adding to model
  let inputs = {
    x: mouseX,
    y: mouseY
  };

  if (state == "collection") {
    // ouput object for adding to model
    // use mapNotes object to feed frequency values into model
    let targetFrequency = mapNotes[targetLabel];
    let target = {
      frequency: targetFrequency
    };

    // add mouse inputs and output label to the model
    model.addData(inputs, target);

    // configure mouse GUI
    stroke(250);
    noFill();
    ellipse(mouseX, mouseY, 24);
    fill(250);
    noStroke();
    textAlign(CENTER, CENTER);
    // use notes object to display the selected note
    text(notes[targetLabel], mouseX, mouseY);

    // use mariah object to play a wav file
    mariah[targetLabel].setVolume(0.5);
    mariah[targetLabel].play();
  } else if (state == "prediction") {
    model.predict(inputs, gotResults);
  }
}

function gotResults(error, results) {
  if (error) {
    console.log(error);
    return;
  }
  console.log(results);
  stroke(0);
  fill(0, 0, 255, 100);
  ellipse(mouseX, mouseY, 24);
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  text(floor(results[0].value), mouseX, mouseY);

  wave.freq(results[0].value);
  env.play();
}

// function draw() {}
