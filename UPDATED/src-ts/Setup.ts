//EVERY PIXEL IS .01MILE SO 800PX = 8MILES
//Creates HTML stuff
let setupEverythingButton;
let gridNextButton;
let playPauseButton;
let paused;

let timeLabel;

/*
let roadsButton;
let lightsButton;
let bothButton;
*/

let labelsButton;
let showLabels = false;

let resetButton;

/*
let removeRoadsButton;
let removeLightsButton;
let removeBothButton;
*/

let gridSlider;
let sliderLabel;

let roadPercentSlider;
let roadPercentLabel;

let lightPercentSlider;
let lightPercentLabel;

let GridController: masterGrid;

//continuous car generation stuff
let continuousCars = true;
let continuousCarsButton;
let continuousCarsTime = 600;
let continuousCarsDelay;

//GLOBAL VARS FOR CONTROL ---
let verbose = false;

//miles/pixel
let gridScale = 0.00094696969; //(800px ~ .75 miles) 400ft long roads at 10*10 grid

//light travel time acts as a proxy for 'yellow' lights but not really
let lightTravelTime = 5;

let reactionTime = 3;

//light cycle stuff
let minCycleTime = 25;
let cycleTimeVariability = 80;
let smartLightPercent = .5;

//modified aStar stuff
let congestionWeight = 14;
let networkedPercent = .5;

//average car length in miles (15.84 ft)
let carLength = .003;

//average car spacing at a stop in miles (5.28 ft)
let carSpacing = .001;

/**
 * p5.js setup function for HTML stuff
 */
function setup() 
{
    let size = 500;
    let canvas = createCanvas(size,size);
    let x = (windowWidth-size)/2;
    let y = (windowHeight-size)/2;
    canvas.position(x,y);

    background(51);

    //create object to control lights, cars, roads, etc.
    GridController = masterGridFactory(50);

    //setup everything button
    setupEverythingButton = document.getElementById("setupButton");
    setupEverythingButton.onclick = (() => {
        GridController = masterGridFactory(50);

        generateLights();
        // generateTestLights();
        generateRoads();
        removeLights();
        removeRoads();

        generateLanes();

        continuousCarsDelay = 10/(GridController.Lights.length/50);

        paused = undefined;
        clearInterval(runInterval);
        playPauseButton.innerHTML = 'Play ⏵';
        playPauseButton.disabled = false;
        timeLabel.innerHTML = `${Math.floor(GridController.masterTime)} seconds`;

        setUpCars(GridController.Lights.length*4);
        startCars();

        GridController.masterQueue.enqueue(gridEventFactory(GridController.masterTime, generateContinuousCarsCreateEventHandler(continuousCarsDelay), "first continuous car"));
        GridController.masterQueue.enqueue(gridEventFactory(GridController.masterTime+continuousCarsTime, stopContinuousCarsCreateEventHandler(), "stops continuous car generation"));

        //VERT AND HORIZONTAL LINES
        // setUpTestCars2(20);
        // startTestCars();

        //CARAVAN ON SAME PATH
        // setUpTestCars(1);
        // startTestCars();
    });
    
    //next event button
    gridNextButton = document.getElementById("nextButton");
    gridNextButton.onclick = (() => {
        GridController.nextEvent();
    });

    //play/pase button
    playPauseButton = document.getElementById("playPauseButton");
    playPauseButton.onclick = (() => {

        if(typeof paused == "undefined") {
            runGrid();
            paused = false;
            playPauseButton.innerHTML = `Pause ||`;
        }

        else if(paused == true) {
            paused = false;
            playPauseButton.innerHTML = `Pause ||`;
        }
        else {
            paused = true;
            playPauseButton.innerHTML = 'Play ⏵';
        }
    });

    timeLabel = document.getElementById("timeLabel");
    // timeLabel.style('display', 'inline');

    /*
    createDiv();
    roadsButton = createButton('Generate Roads');
    roadsButton.mousePressed(generateRoads);

    lightsButton = createButton('Generate Lights');
    lightsButton.mousePressed(generateLights)
    
    //create both (also lanes)
    bothButton = createButton('Generate Both');
    bothButton.mousePressed(() => {
        generateLights(); 
        generateRoads();
    });
    */

    // createDiv();
    labelsButton = document.getElementById("labelsButton");
    labelsButton.onclick = (() => {showLabels = !showLabels})

    resetButton = document.getElementById("resetButton");
    resetButton.onclick = (() => {
        GridController.reset();
        // continuousCarsButton.remove();
    });

    continuousCarsButton = document.getElementById("carsButton");
    continuousCarsButton.onclick = (() => {
        if(continuousCars == true) {
            continuousCars = false;
            continuousCarsButton.innerHTML = `Continuous Car Generation: ╳`;
        }
        else {
            continuousCars = true;
            GridController.masterQueue.enqueue(gridEventFactory(GridController.masterTime, generateContinuousCarsCreateEventHandler(continuousCarsDelay), "first continuous car"));
            continuousCarsButton.innerHTML = 'Continuous Car Generation: ✓';
        }
    });

    /*
    createDiv();
    removeRoadsButton = createButton('Remove Roads');
    removeRoadsButton.mousePressed(removeRoads);

    removeLightsButton = createButton('Remove Lights');
    removeLightsButton.mousePressed(removeLights);

    removeBothButton = createButton('Remove Both');
    removeBothButton.mousePressed(() => {removeLights(); removeRoads();});
    */

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
function draw()
{
    background(51);
 
    //updates sliders
    if(mouseIsPressed) {
        sliderLabel.elt.innerHTML = `${gridSlider.value()}`;
        roadPercentLabel.elt.innerHTML = `${roadPercentSlider.value()}%`;
        lightPercentLabel.elt.innerHTML = `${lightPercentSlider.value()}%`;
    }
   

    //draws Lights
    stroke(0);
    for(let i = 0; i<GridController.Lights.length; i++) {
        fill(255);
        let size = 20;

        if(GridController.Lights[i].noLogic) {
            size = 15;
        }
        
        if(GridController.Lights[i].inPath) {
            fill(0, 255, 0);
        }
        ellipse(GridController.Lights[i].coords[0], GridController.Lights[i].coords[1], size);
        textSize(10);
        if(showLabels) {
            text(`ID: ${GridController.Lights[i].id}, IDX: ${i}`, GridController.Lights[i].coords[0]-30, GridController.Lights[i].coords[1]-15);
        }
    }

    //draws Roads
    // stroke(200);
    // for(let i = 0; i<GridController.Roads.length; i++) {
    //     line(GridController.Roads[i].entrance.coords[0], GridController.Roads[i].entrance.coords[1], GridController.Roads[i].exit.coords[0], GridController.Roads[i].exit.coords[1]);
    // }

    let offset = 3;
    //draws Lanes
    for(let i = 0; i<GridController.Roads.length; i++) {

        let tempRoad = GridController.Roads[i];
        for(let j = 0; j<tempRoad.lanes.length; j++) {
            stroke(200);

            let tempLane = tempRoad.lanes[j];

            if(tempLane.active) {
                stroke(0, 255, 0);
            }
            if(tempLane.alwaysActive) {
                stroke(100, 100, 255);
            }

            //if left to right, shift down
            if(tempLane.direction == "leftright") {
                line(tempLane.entrance.coords[0], tempLane.entrance.coords[1]+offset, tempLane.exit.coords[0], tempLane.exit.coords[1]+offset);
            }

            //if right to left, shift up
            else if(tempLane.direction == "rightleft") {
                line(tempLane.entrance.coords[0], tempLane.entrance.coords[1]-offset, tempLane.exit.coords[0], tempLane.exit.coords[1]-offset);
            }

            //if up to down, shift left
            else if(tempLane.direction == "updown") {
                line(tempLane.entrance.coords[0]-offset, tempLane.entrance.coords[1], tempLane.exit.coords[0]-offset, tempLane.exit.coords[1]);
            }


            //if down to up, shift right
            else if(tempLane.direction == "downup") {
                line(tempLane.entrance.coords[0]+offset, tempLane.entrance.coords[1], tempLane.exit.coords[0]+offset, tempLane.exit.coords[1]);
            }
        }
    }

    stroke(200);

    //draws Cars
    for(let i = 0; i<GridController.Cars.length; i++) {
        let car = GridController.Cars[i];
        fill(255, 0, 0);
        
        if(car.completed) {
            fill(0,0,255);
        }

        let size = 10;


        //puts on correct side of road
        if(car.lane) {
            let carDirection = car.lane.direction;

            if(carDirection == "leftright") {
                square(car.coords[0]-size/2, car.coords[1]-size/2 + offset, size, 3);
            }
            else if (carDirection == "rightleft") {
                square(car.coords[0]-size/2, car.coords[1]-size/2 - offset, size, 3);
            }
            else if (carDirection == "updown") {
                square(car.coords[0]-size/2 - offset, car.coords[1]-size/2, size, 3);
            }
            else if (carDirection == "downup") {
                square(car.coords[0]-size/2 + offset, car.coords[1]-size/2, size, 3);
            }
        }
        else {
            square(car.coords[0]-size/2, car.coords[1]-size/2, size, 3);
        }
    }
}