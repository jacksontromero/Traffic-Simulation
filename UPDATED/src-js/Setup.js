//EVERY PIXEL IS .01MILE SO 800PX = 8MILES
//Creates HTML stuff
let setupEverythingButton;
let gridNextButton;
let playPauseButton;
let paused;
let timeLabel;
let labelsButton;
let resetButton;
let gridSlider;
let sliderLabel;
let roadPercentSlider;
let roadPercentLabel;
let lightPercentSlider;
let lightPercentLabel;
/**show debugging lables*/
let showLabels = false;
/**global variable for the entire grid*/
let GridController;
//continuous car generation stuff
let continuousCars = true;
let continuousCarsButton;
let continuousCarsTime = 600;
let continuousCarsDelay;
/**full console output */
let verbose = false;
/**miles/pixel*/
let gridScale = 0.00094696969; //(800px ~ .75 miles) 400ft long roads at 10*10 grid
//light travel time acts as a proxy for 'yellow' lights but not really
/**seconds it takes to go through a light*/
let lightTravelTime = 5;
/**delay between cars moving in a chain*/
let reactionTime = 3;
//light cycle stuff
let minCycleTime = 25;
let cycleTimeVariability = 80;
let smartLightPercent = .5;
//modified aStar stuff
let congestionWeight = 14;
let networkedPercent = .5;
//use to calculate how far cars move
/**average car length in miles (15.84 ft)*/
let carLength = .003;
/**average car spacing at a stop in miles (5.28 ft)*/
let carSpacing = .001;
//DRAWING PARAMETERS
/**how far lanes drawn from each other */
let offset = 3;
/**
 * p5.js setup function for HTML stuff
 */
function setup() {
    //creates canvas
    let size = 500;
    let canvas = createCanvas(size, size);
    let x = (windowWidth - size) / 2;
    let y = (windowHeight - size) / 2;
    canvas.position(x, y);
    background(51);
    //create object to control lights, cars, roads, etc.
    GridController = masterGridFactory(50, reactionTime);
    //set timeLabel
    timeLabel = document.getElementById("timeLabel");
    //setup everything button
    setupEverythingButton = document.getElementById("setupButton");
    setupEverythingButton.onclick = (() => {
        //create master grid
        GridController = masterGridFactory(50, reactionTime);
        //generate grid objects
        generateLights();
        // generateTestLights();
        generateRoads();
        removeLights();
        removeRoads();
        generateLanes();
        //calculate how often continuous cars are added to the grid
        continuousCarsDelay = 10 / (GridController.Lights.length / 50);
        //start buttons
        paused = undefined;
        clearInterval(runInterval);
        playPauseButton.innerHTML = 'Play ⏵';
        playPauseButton.disabled = false;
        timeLabel.innerHTML = `${Math.floor(GridController.masterTime)} seconds`;
        //generate 4 cars per light and start them all
        setUpCars(GridController.Lights.length * 4);
        startCars();
        //add events for starting continuous car generation and stopping continuous car generation
        GridController.masterQueue.enqueue(gridEventFactory(GridController.masterTime, generateContinuousCarsCreateEventHandler(continuousCarsDelay), "first continuous car"));
        GridController.masterQueue.enqueue(gridEventFactory(GridController.masterTime + continuousCarsTime, stopContinuousCarsCreateEventHandler(), "stops continuous car generation"));
    });
    //next event button
    gridNextButton = document.getElementById("nextButton");
    gridNextButton.onclick = (() => {
        GridController.nextEvent();
    });
    //play/pase button
    playPauseButton = document.getElementById("playPauseButton");
    playPauseButton.onclick = (() => {
        if (typeof paused == "undefined") {
            runGrid();
            paused = false;
            playPauseButton.innerHTML = `Pause ||`;
        }
        else if (paused == true) {
            paused = false;
            playPauseButton.innerHTML = `Pause ||`;
        }
        else {
            paused = true;
            playPauseButton.innerHTML = 'Play ⏵';
        }
    });
    //setup labels button
    labelsButton = document.getElementById("labelsButton");
    labelsButton.onclick = (() => { showLabels = !showLabels; });
    //setup reset button
    resetButton = document.getElementById("resetButton");
    resetButton.onclick = (() => {
        GridController.reset();
        // continuousCarsButton.remove();
    });
    //setup continuous cars button
    continuousCarsButton = document.getElementById("carsButton");
    continuousCarsButton.onclick = (() => {
        if (continuousCars == true) {
            continuousCars = false;
            continuousCarsButton.innerHTML = `Continuous Car Generation: ╳`;
        }
        else {
            continuousCars = true;
            //start continuous cars
            GridController.masterQueue.enqueue(gridEventFactory(GridController.masterTime, generateContinuousCarsCreateEventHandler(continuousCarsDelay), "first continuous car"));
            continuousCarsButton.innerHTML = 'Continuous Car Generation: ✓';
        }
    });
    //Create sliders
    createDiv(`Grid Size: `);
    gridSlider = createSlider(1, 20, 10, 1);
    sliderLabel = createDiv(`${gridSlider.value()}`);
    sliderLabel.style('display', 'inline');
    createDiv(`Road Gen %: `);
    roadPercentSlider = createSlider(1, 100, 90, 1);
    roadPercentLabel = createDiv(`${roadPercentSlider.value()}%`);
    roadPercentLabel.style('display', 'inline');
    createDiv(`Light Gen %: `);
    lightPercentSlider = createSlider(1, 100, 80, 1);
    lightPercentLabel = createDiv(`${lightPercentSlider.value()}%`);
    lightPercentLabel.style('display', 'inline');
}
/**
 * p5.js draw function, changes HTML files and draws Lights and Roads
 */
function draw() {
    background(51);
    //updates slider values
    if (mouseIsPressed) {
        sliderLabel.elt.innerHTML = `${gridSlider.value()}`;
        roadPercentLabel.elt.innerHTML = `${roadPercentSlider.value()}%`;
        lightPercentLabel.elt.innerHTML = `${lightPercentSlider.value()}%`;
    }
    //draws Lights
    stroke(0);
    for (let i = 0; i < GridController.Lights.length; i++) {
        fill(255);
        let size = 20;
        if (GridController.Lights[i].noLogic) {
            size = 15;
        }
        if (GridController.Lights[i].inPath) {
            fill(0, 255, 0);
        }
        ellipse(GridController.Lights[i].coords[0], GridController.Lights[i].coords[1], size);
        textSize(10);
        if (showLabels) {
            text(`ID: ${GridController.Lights[i].id}, IDX: ${i}`, GridController.Lights[i].coords[0] - 30, GridController.Lights[i].coords[1] - 15);
        }
    }
    //off
    //draws Lanes
    for (let i = 0; i < GridController.Roads.length; i++) {
        let tempRoad = GridController.Roads[i];
        for (let j = 0; j < tempRoad.lanes.length; j++) {
            stroke(200);
            let tempLane = tempRoad.lanes[j];
            if (tempLane.active) {
                stroke(0, 255, 0);
            }
            if (tempLane.alwaysActive) {
                stroke(100, 100, 255);
            }
            //if left to right, shift down
            if (tempLane.direction == "leftright") {
                line(tempLane.entrance.coords[0], tempLane.entrance.coords[1] + offset, tempLane.exit.coords[0], tempLane.exit.coords[1] + offset);
            }
            //if right to left, shift up
            else if (tempLane.direction == "rightleft") {
                line(tempLane.entrance.coords[0], tempLane.entrance.coords[1] - offset, tempLane.exit.coords[0], tempLane.exit.coords[1] - offset);
            }
            //if up to down, shift left
            else if (tempLane.direction == "updown") {
                line(tempLane.entrance.coords[0] - offset, tempLane.entrance.coords[1], tempLane.exit.coords[0] - offset, tempLane.exit.coords[1]);
            }
            //if down to up, shift right
            else if (tempLane.direction == "downup") {
                line(tempLane.entrance.coords[0] + offset, tempLane.entrance.coords[1], tempLane.exit.coords[0] + offset, tempLane.exit.coords[1]);
            }
        }
    }
    stroke(200);
    //draws Cars
    for (let i = 0; i < GridController.Cars.length; i++) {
        let car = GridController.Cars[i];
        fill(255, 0, 0);
        if (car.completed) {
            fill(0, 0, 255);
        }
        let size = 10;
        //puts on correct side of road
        if (car.lane) {
            let carDirection = car.lane.direction;
            if (carDirection == "leftright") {
                square(car.coords[0] - size / 2, car.coords[1] - size / 2 + offset, size, 3);
            }
            else if (carDirection == "rightleft") {
                square(car.coords[0] - size / 2, car.coords[1] - size / 2 - offset, size, 3);
            }
            else if (carDirection == "updown") {
                square(car.coords[0] - size / 2 - offset, car.coords[1] - size / 2, size, 3);
            }
            else if (carDirection == "downup") {
                square(car.coords[0] - size / 2 + offset, car.coords[1] - size / 2, size, 3);
            }
        }
        else {
            square(car.coords[0] - size / 2, car.coords[1] - size / 2, size, 3);
        }
    }
}
